alter table public.research_entities add column if not exists phone_source_url text not null default '';
alter table public.research_entities add column if not exists email_source_url text not null default '';
