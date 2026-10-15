export const resourceTypes = ['Research paper', 'Preprint', 'Presentation', 'Poster', 'Dataset', 'Code or notebook', 'Video demonstration', 'Tutorial', 'Technical report', 'Student project'] as const;
export const topics = ['Artificial intelligence', 'Computer science', 'Engineering', 'Health & medicine', 'Natural sciences', 'Social sciences', 'Other'] as const;
export type Resource = {
    id: string;
    owner_id: string;
    project_id: string | null;
    title: string;
    abstract: string;
    authors: string;
    topic: string;
    keywords: string;
    resource_type: string;
    publication_date: string;
    source_url: string;
    doi: string;
    license: string;
    visibility: string;
    status: string;
    review_reason: string;
    created_at: string;
};
export type Project = {
    id: string;
    owner_id: string;
    title: string;
    overview: string;
    methodology: string;
    team: string;
    milestones: string;
    updates: string;
    visibility: string;
};
export type Profile = {
    id: string;
    name: string;
    bio: string;
    interests: string;
    affiliation: string;
};
export type Material = {
    id: string;
    resource_id: string;
    name: string;
    kind: string;
    url: string | null;
    storage_path: string | null;
    mime: string | null;
};
