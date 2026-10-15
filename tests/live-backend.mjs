// Run only against a disposable configured Supabase project. Never production.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','RD_TEST_OWNER_EMAIL','RD_TEST_OWNER_PASSWORD','RD_TEST_OTHER_EMAIL','RD_TEST_OTHER_PASSWORD','RD_TEST_MOD_EMAIL','RD_TEST_MOD_PASSWORD'];
const missing=keys.filter(k=>!process.env[k]);if(missing.length){console.error('Not run: missing environment keys: '+missing.join(', '));process.exit(2);}
const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
async function call(path,token=key,method='GET',body,raw=false){const res=await fetch(base+path,{method,headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':raw?'application/pdf':'application/json',Prefer:'return=representation'},body:raw?body:body===undefined?undefined:JSON.stringify(body)});const value=await res.text();return {ok:res.ok,status:res.status,data:value?JSON.parse(value):null};}
async function must(path,token,method='GET',body){const r=await call(path,token,method,body);assert.ok(r.ok,`${method} ${path}: ${JSON.stringify(r.data)}`);return r.data;}
async function login(prefix){return must('/auth/v1/token?grant_type=password',key,'POST',{email:process.env[`RD_TEST_${prefix}_EMAIL`],password:process.env[`RD_TEST_${prefix}_PASSWORD`]});}
const owner=await login('OWNER'),other=await login('OTHER'),mod=await login('MOD');
const token=owner.access_token;const ownerId=owner.user.id;const ot=other.access_token,mt=mod.access_token;
let projectId,resourceId,storagePath;
try{
 const projects=await must('/rest/v1/projects',token,'POST',{owner_id:ownerId,title:'Integration test project',overview:'Disposable demonstration content for automated authorization verification.',visibility:'private'});projectId=projects[0].id;
 const payload={project_id:projectId,title:'Demonstration content: access control test',abstract:'Demonstration only. This is a disposable test resource, not a research finding.',authors:'Demonstration test account',topic:'Computer science',resource_type:'Technical report',keywords:'demonstration',publication_date:'2026-10-15',source_url:'',doi:'',license:'Test content only',visibility:'public',permission_confirmed:true};
 resourceId=await must('/rest/v1/rpc/save_resource',token,'POST',{resource_id:null,payload});
 assert.equal((await must(`/rest/v1/resources?id=eq.${resourceId}`,key)).length,0,'Anonymous cannot see drafts');
 assert.equal((await must(`/rest/v1/resources?id=eq.${resourceId}`,ot)).length,0,'Other users cannot see drafts');
 assert.equal((await call('/rest/v1/rpc/save_resource',ot,'POST',{resource_id:resourceId,payload})).ok,false,'Other user cannot edit draft');
 assert.equal((await call(`/rest/v1/resources?id=eq.${resourceId}`,token,'PATCH',{status:'approved'})).ok,false,'Direct approval forbidden');
 assert.equal((await call('/rest/v1/user_roles',token,'POST',{user_id:ownerId,role:'administrator'})).ok,false,'Role escalation forbidden');
 assert.equal((await call('/rest/v1/rpc/assign_role',token,'POST',{target_user:ownerId,new_role:'administrator'})).ok,false,'Researcher cannot assign role');
 assert.equal((await call('/rest/v1/rpc/transition_resource',token,'POST',{resource_id:resourceId,decision:'submit'})).ok,false,'Empty package cannot submit');
 storagePath=`${ownerId}/${resourceId}/${randomUUID()}.pdf`;
 const pdf='%PDF-1.4\n% Disposable demonstration file\n%%EOF';
 assert.equal((await call('/storage/v1/object/research-materials/'+storagePath,token,'POST',pdf,true)).ok,false,'Direct unvalidated file uploads forbidden');
 // Service role upload emulates only the server storage boundary; signatures are separately unit tested.
 const upload=await fetch(base+'/storage/v1/object/research-materials/'+storagePath,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/pdf'},body:pdf});assert.ok(upload.ok,'Server can upload to private storage');
 await must('/rest/v1/materials',token,'POST',{resource_id:resourceId,name:'Demonstration PDF',kind:'Supporting resource',storage_path:storagePath,mime:'application/pdf'});
 assert.equal((await call('/storage/v1/object/sign/research-materials/'+storagePath,key,'POST',{expiresIn:60})).ok,false,'Private files cannot be signed anonymously');
 await must('/rest/v1/rpc/transition_resource',token,'POST',{resource_id:resourceId,decision:'submit'});
 assert.equal((await call('/rest/v1/materials',token,'POST',{resource_id:resourceId,name:'Late material',kind:'Paper',url:'https://example.org/'})).ok,false,'Submitted materials are frozen');
 assert.equal((await call('/rest/v1/rpc/transition_resource',token,'POST',{resource_id:resourceId,decision:'approved',reason:'Attempt to self approve.'})).ok,false,'Owner cannot approve');
 await must('/rest/v1/rpc/transition_resource',mt,'POST',{resource_id:resourceId,decision:'approved',reason:'Demonstration content reviewed for integration testing.'});
 assert.equal((await must(`/rest/v1/resources?id=eq.${resourceId}`,key)).length,1,'Approved public resource is visible');
 const results=await must('/rest/v1/rpc/search_resources',key,'POST',{search_query:'demonstration'});assert.ok(results.some(r=>r.id===resourceId),'Public search discovers approved package');
 await must('/storage/v1/object/sign/research-materials/'+storagePath,key,'POST',{expiresIn:60});
 await must('/rest/v1/bookmarks',ot,'POST',{user_id:other.user.id,resource_id:resourceId});
 await must('/rest/v1/reports',ot,'POST',{reporter_id:other.user.id,resource_id:resourceId,reason:'Demonstration report for authorization verification.'});
 await must('/rest/v1/rpc/transition_resource',token,'POST',{resource_id:resourceId,decision:'draft'});
 assert.equal((await must(`/rest/v1/resources?id=eq.${resourceId}`,key)).length,0,'Withdrawn package is private again');
 assert.equal((await call('/storage/v1/object/sign/research-materials/'+storagePath,key,'POST',{expiresIn:60})).ok,false,'New public file links denied after withdrawal');
 console.log('PASS: live projects, drafts, ownership, roles, private storage, package freezing, moderation, search, bookmarks, reports and withdrawal.');
}finally{
 // Trusted cleanup in a disposable test project; never exposes the service role to clients.
 async function clean(path,body){await fetch(base+path,{method:'DELETE',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});}
 if(resourceId)await clean('/rest/v1/resources?id=eq.'+resourceId);
 if(projectId)await clean('/rest/v1/projects?id=eq.'+projectId);
 if(storagePath)await clean('/storage/v1/object/research-materials',{prefixes:[storagePath]});
}
