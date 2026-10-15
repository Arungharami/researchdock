begin;
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users on delete cascade,name text not null default '' check(length(name)<=100),bio text not null default '' check(length(bio)<=3000),interests text not null default '' check(length(interests)<=500),affiliation text not null default '' check(length(affiliation)<=200));
create table public.user_roles (user_id uuid primary key references auth.users on delete cascade,role text not null check(role in ('moderator','administrator')));
create function public.is_moderator() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from user_roles where user_id=auth.uid() and role in ('moderator','administrator'))$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(id,name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name','Researcher'),100));return new;end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create table public.projects(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,title text not null check(length(title) between 3 and 200),overview text not null check(length(overview) between 20 and 10000),methodology text not null default '',team text not null default '',milestones text not null default '',updates text not null default '',visibility text not null default 'private' check(visibility in ('public','private')),created_at timestamptz not null default now());
create table public.resources(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,project_id uuid references public.projects on delete set null,title text not null check(length(title) between 5 and 300),abstract text not null check(length(abstract) between 30 and 20000),authors text not null check(length(authors) between 2 and 2000),topic text not null check(topic in ('Artificial intelligence','Computer science','Engineering','Health & medicine','Natural sciences','Social sciences','Other')),resource_type text not null check(resource_type in ('Research paper','Preprint','Presentation','Poster','Dataset','Code or notebook','Video demonstration','Tutorial','Technical report','Student project')),keywords text not null default '' check(length(keywords)<=1000),publication_date date not null,doi text not null default '' check(doi='' or doi ~ '^10\.[0-9]{4,9}/[^[:space:]]+$'),source_url text not null default '' check(source_url='' or source_url ~ '^https://'),license text not null check(length(license) between 2 and 200),visibility text not null default 'private' check(visibility in ('private','public')),status text not null default 'draft' check(status in ('draft','submitted','approved','rejected')),permission_confirmed boolean not null default false,review_reason text not null default '',reviewer_id uuid references auth.users,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index resources_public_search on public.resources(status,visibility,topic,publication_date);
create index resources_project on public.resources(project_id);
create index resources_owner on public.resources(owner_id);
create table public.materials(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.resources on delete cascade,name text not null check(length(name) between 2 and 200),kind text not null check(length(kind) between 2 and 100),url text check(url ~ '^https://'),storage_path text unique,mime text,created_at timestamptz not null default now(),check(url is not null or storage_path is not null));
create table public.bookmarks(user_id uuid not null references auth.users on delete cascade,resource_id uuid not null references public.resources on delete cascade,created_at timestamptz not null default now(),primary key(user_id,resource_id));
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users on delete cascade,resource_id uuid not null references public.resources on delete cascade,reason text not null check(length(reason) between 10 and 3000),status text not null default 'open' check(status in ('open','resolved')),resolution text not null default '',resolved_by uuid references auth.users,created_at timestamptz not null default now());
create table public.review_events(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.resources on delete cascade,actor_id uuid not null references auth.users,decision text not null,reason text not null,created_at timestamptz not null default now());
-- Clients never receive direct mutation rights to resources, roles or review records.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.projects enable row level security;
alter table public.resources enable row level security;
alter table public.materials enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reports enable row level security;
alter table public.review_events enable row level security;
create policy profile_read on profiles for select using(true);
create policy profile_write on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy roles_read on user_roles for select to authenticated using(user_id=auth.uid());
create policy project_read on projects for select using(visibility='public' or owner_id=auth.uid() or is_moderator());
create policy project_create on projects for insert to authenticated with check(owner_id=auth.uid());
create policy project_write on projects for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy resource_read on resources for select using((status='approved' and visibility='public') or owner_id=auth.uid() or is_moderator());
create policy material_read on materials for select using(exists(select 1 from resources r where r.id=resource_id));
create policy material_create on materials for insert to authenticated with check(exists(select 1 from resources r where r.id=resource_id and r.owner_id=auth.uid() and r.status in ('draft','rejected')) and (storage_path is null or (storage_path like auth.uid()::text||'/'||resource_id::text||'/%' and exists(select 1 from storage.objects o where o.bucket_id='research-materials' and o.name=storage_path))));
create policy bookmark_read on bookmarks for select to authenticated using(user_id=auth.uid());
create policy bookmark_create on bookmarks for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from resources r where r.id=resource_id and r.status='approved' and r.visibility='public'));
create policy bookmark_remove on bookmarks for delete to authenticated using(user_id=auth.uid());
create policy report_read on reports for select to authenticated using(reporter_id=auth.uid() or is_moderator());
create policy report_create on reports for insert to authenticated with check(reporter_id=auth.uid() and status='open' and resolution='' and resolved_by is null and exists(select 1 from resources r where r.id=resource_id));
create policy review_read on review_events for select to authenticated using(is_moderator() or exists(select 1 from resources r where r.id=resource_id and r.owner_id=auth.uid()));
-- Definer functions derive identity from the verified JWT, never from a client role or owner field.
create function public.save_resource(resource_id uuid,payload jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid; existing resources; pid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if coalesce((payload->>'permission_confirmed')::boolean,false)=false then raise exception 'Sharing permission is required';end if;
 pid=nullif(payload->>'project_id','')::uuid;
 if pid is not null and not exists(select 1 from projects where id=pid and owner_id=auth.uid()) then raise exception 'Project access denied';end if;
 if resource_id is not null then
 select * into existing from resources where id=resource_id for update;
 if existing.id is null or existing.owner_id<>auth.uid() then raise exception 'Access denied';end if;
 if existing.status not in ('draft','rejected') then raise exception 'Withdraw the resource before editing';end if;
 rid=resource_id;
 update resources set title=payload->>'title',abstract=payload->>'abstract',authors=payload->>'authors',topic=payload->>'topic',resource_type=payload->>'resource_type',keywords=payload->>'keywords',publication_date=(payload->>'publication_date')::date,doi=payload->>'doi',source_url=payload->>'source_url',license=payload->>'license',project_id=pid,visibility=payload->>'visibility',permission_confirmed=true,status='draft',reviewer_id=null,updated_at=now() where id=rid;
 else
 insert into resources(owner_id,title,abstract,authors,topic,resource_type,keywords,publication_date,doi,source_url,license,project_id,visibility,permission_confirmed) values(auth.uid(),payload->>'title',payload->>'abstract',payload->>'authors',payload->>'topic',payload->>'resource_type',payload->>'keywords',(payload->>'publication_date')::date,payload->>'doi',payload->>'source_url',payload->>'license',pid,payload->>'visibility',true) returning id into rid;
 end if;return rid;
end;$$;
create function public.transition_resource(resource_id uuid,decision text,reason text default '') returns void language plpgsql security definer set search_path=public as $$
declare r resources; target text;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into r from resources where id=resource_id for update;
 if r.id is null then raise exception 'Resource not found';end if;
 if decision in ('submit','draft') then
 if r.owner_id<>auth.uid() then raise exception 'Owner access required';end if;
 if decision='submit' then
 if r.status not in ('draft','rejected') or not r.permission_confirmed then raise exception 'Resource cannot be submitted';end if;
 if r.source_url='' and not exists(select 1 from materials where materials.resource_id=r.id) then raise exception 'Attach a material or an original source URL before submitting';end if;
 target='submitted';
 else target='draft';end if;
 update resources set status=target,reviewer_id=null,updated_at=now() where id=r.id;
 elsif decision in ('approved','rejected') then
 if not is_moderator() or r.owner_id=auth.uid() then raise exception 'Independent moderator required';end if;
 if r.status<>'submitted' and not (r.status='approved' and decision='rejected') then raise exception 'Resource is not reviewable';end if;
 if length(trim(reason)) not between 10 and 3000 then raise exception 'Provide a review reason (10–3000 characters)';end if;
 update resources set status=decision,review_reason=reason,reviewer_id=auth.uid(),updated_at=now() where id=r.id;
 else raise exception 'Invalid transition';end if;
 insert into review_events(resource_id,actor_id,decision,reason) values(r.id,auth.uid(),decision,reason);
end;$$;
create function public.resolve_report(report_id uuid,resolution text) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_moderator() then raise exception 'Moderator required';end if;
 if length(trim(resolution)) not between 10 and 3000 then raise exception 'Provide a resolution';end if;
 update reports set status='resolved',resolution=resolve_report.resolution,resolved_by=auth.uid() where id=report_id and status='open';
 if not found then raise exception 'Open report not found';end if;
end;$$;
revoke all on public.resources,public.user_roles,public.review_events from anon,authenticated;
grant select on public.resources,public.user_roles,public.review_events to anon,authenticated;
grant select on public.profiles,public.projects,public.materials to anon,authenticated;
grant update(name,bio,interests,affiliation) on public.profiles to authenticated;
grant insert on public.projects to authenticated;
grant update(title,overview,methodology,team,milestones,updates,visibility) on public.projects to authenticated;
grant insert on public.materials to authenticated;
grant select,insert,delete on public.bookmarks to authenticated;
grant select,insert on public.reports to authenticated;
revoke execute on function public.save_resource(uuid,jsonb),public.transition_resource(uuid,text,text),public.resolve_report(uuid,text) from public,anon;
grant execute on function public.save_resource(uuid,jsonb),public.transition_resource(uuid,text,text),public.resolve_report(uuid,text) to authenticated;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('research-materials','research-materials',false,3145728,array['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/csv','text/plain']);
create policy file_read on storage.objects for select using(bucket_id='research-materials' and (exists(select 1 from materials m join resources r on r.id=m.resource_id where m.storage_path=name) or (split_part(name,'/',1)=auth.uid()::text and exists(select 1 from resources r where r.id::text=split_part(name,'/',2) and r.owner_id=auth.uid()))));
create policy orphan_file_remove on storage.objects for delete to authenticated using(bucket_id='research-materials' and split_part(name,'/',1)=auth.uid()::text and not exists(select 1 from materials m where m.storage_path=name));
-- Serialize material changes against resource submission to freeze complete packages.
create function public.guard_material_insert() returns trigger language plpgsql security definer set search_path=public as $$declare r resources;begin select * into r from resources where id=new.resource_id for update; if r.owner_id<>auth.uid() or r.status not in ('draft','rejected') then raise exception 'Editable owner draft required';end if;return new;end;$$;
create trigger guard_material_insert before insert on materials for each row execute function public.guard_material_insert();
revoke execute on function public.guard_material_insert() from public,anon,authenticated;
create function public.remove_material(material_id uuid) returns text language plpgsql security definer set search_path=public as $$declare m materials;r resources;begin
 select * into m from materials where id=material_id;
 if m.id is null then raise exception 'Material not found';end if;
 select * into r from resources where id=m.resource_id for update;
 if auth.uid() is null or r.owner_id<>auth.uid() or r.status not in ('draft','rejected') then raise exception 'Editable owner draft required';end if;
 delete from materials where id=m.id;return m.storage_path;
end;$$;
create function public.assign_role(target_user uuid,new_role text) returns void language plpgsql security definer set search_path=public as $$begin
 if not exists(select 1 from user_roles where user_id=auth.uid() and role='administrator') then raise exception 'Administrator required';end if;
 if target_user=auth.uid() then raise exception 'Self-role changes are not permitted';end if;
 if new_role='researcher' then delete from user_roles where user_id=target_user;
 elsif new_role in ('moderator','administrator') then insert into user_roles(user_id,role) values(target_user,new_role) on conflict(user_id) do update set role=excluded.role;
 else raise exception 'Invalid role';end if;
end;$$;
revoke execute on function public.remove_material(uuid),public.assign_role(uuid,text) from public,anon;
grant execute on function public.remove_material(uuid),public.assign_role(uuid,text) to authenticated;
alter table resources add column search_document tsvector generated always as (to_tsvector('english',title||' '||abstract||' '||authors||' '||keywords)) stored;
create index resources_search on resources using gin(search_document);
create function public.search_resources(search_query text default '',filter_topic text default '',filter_type text default '',filter_year integer default null,filter_category text default '',page_number integer default 1) returns setof public.resources language sql stable security invoker set search_path=public as $$
 select * from resources r where r.status='approved' and r.visibility='public'
 and (search_query='' or r.search_document @@ websearch_to_tsquery('english',left(search_query,200)))
 and (filter_topic='' or r.topic=filter_topic) and (filter_type='' or r.resource_type=filter_type)
 and (filter_year is null or extract(year from r.publication_date)=filter_year)
 and (filter_category='' or r.resource_type=filter_category)
 order by r.created_at desc,r.id limit 24 offset ((greatest(1,least(page_number,10000))-1)*24);
$$;
grant execute on function public.search_resources(text,text,text,integer,text,integer) to anon,authenticated;
commit;
