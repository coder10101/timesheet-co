-- ============================================================
-- Clean Up & Decouple `projects` Table
-- 1. Safely migrates existing extended columns to `project_details`
-- 2. Copies `deadline` into `end_date` so no dates are lost
-- 3. Drops the 11 duplicate/redundant columns from `projects`
-- ============================================================

-- 1. Ensure `project_details` table exists
create table if not exists public.project_details (
  project_id uuid primary key references public.projects(id) on delete cascade,
  has_design boolean default true,
  has_site boolean default true,
  design_stage text default '',
  design_progress integer default 0,
  site_stage text default '',
  site_progress integer default 0,
  lead_architect_role text default 'Both',
  sub_architect_roles jsonb default '{}'::jsonb,
  sub_architect_names jsonb default '{}'::jsonb,
  external_collaborators text default '',
  activity_history jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Enable RLS on project_details
alter table public.project_details enable row level security;

-- 2. Migrate existing extended data into project_details (Safety First!)
insert into public.project_details (
  project_id,
  design_stage,
  design_progress,
  site_stage,
  site_progress,
  lead_architect_role,
  sub_architect_roles,
  sub_architect_names,
  external_collaborators,
  activity_history,
  updated_at
)
select
  id as project_id,
  coalesce(design_stage, '') as design_stage,
  coalesce(design_progress, 0) as design_progress,
  coalesce(site_stage, '') as site_stage,
  coalesce(site_progress, 0) as site_progress,
  coalesce(lead_architect_role, 'Both') as lead_architect_role,
  coalesce(sub_architect_roles, '{}'::jsonb) as sub_architect_roles,
  coalesce(sub_architect_names, '{}'::jsonb) as sub_architect_names,
  coalesce(sub_architects, '') as external_collaborators,
  coalesce(activity_history, '[]'::jsonb) as activity_history,
  now() as updated_at
from public.projects
on conflict (project_id) do update set
  design_stage = excluded.design_stage,
  design_progress = excluded.design_progress,
  site_stage = excluded.site_stage,
  site_progress = excluded.site_progress,
  lead_architect_role = excluded.lead_architect_role,
  sub_architect_roles = excluded.sub_architect_roles,
  sub_architect_names = excluded.sub_architect_names,
  external_collaborators = excluded.external_collaborators,
  activity_history = excluded.activity_history;

-- 3. Ensure no deadline values are lost: sync deadline into end_date
update public.projects
set end_date = deadline
where (end_date is null or end_date = '') and (deadline is not null and deadline != '');

-- 4. Drop the 11 duplicate & bloated columns from projects
alter table public.projects drop column if exists deadline;
alter table public.projects drop column if exists sub_architects;
alter table public.projects drop column if exists lead_architect;
alter table public.projects drop column if exists sub_architect_names;
alter table public.projects drop column if exists design_stage;
alter table public.projects drop column if exists design_progress;
alter table public.projects drop column if exists site_stage;
alter table public.projects drop column if exists site_progress;
alter table public.projects drop column if exists lead_architect_role;
alter table public.projects drop column if exists sub_architect_roles;
alter table public.projects drop column if exists activity_history;
