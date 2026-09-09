-- ============================================================
-- Projects Extension — Architectural & Multi-Industry Project Tracking
-- ============================================================

-- Ensure projects table exists
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  name text not null,
  color text default '#63537E',
  archived boolean default false,
  status text default 'Active',
  created_at timestamptz default now()
);

-- Add extended project management columns (Relational & User-Associated)
alter table projects add column if not exists lead_architect_id uuid references profiles(id) on delete set null;
alter table projects add column if not exists sub_architect_ids jsonb default '[]'::jsonb;
alter table projects add column if not exists project_work text;
alter table projects add column if not exists current_stage text;
alter table projects add column if not exists project_type text;
alter table projects add column if not exists start_date text;
alter table projects add column if not exists end_date text;
alter table projects add column if not exists status text default 'Active';
alter table projects add column if not exists progress integer default 0;
alter table projects add column if not exists updated_at timestamptz default now();

-- Cleanup redundant text columns if previously added:
alter table projects drop column if exists last_updated;
alter table projects drop column if exists lead_architect;
alter table projects drop column if exists sub_architects;
alter table projects drop column if exists deadline;

-- Add settings column to organizations if not exists
alter table organizations add column if not exists settings jsonb default '{}'::jsonb;

-- Indexes for performance
create index if not exists idx_projects_org on projects(org_id);
create index if not exists idx_projects_lead_id on projects(lead_architect_id);
create index if not exists idx_projects_status on projects(status);

-- Enable RLS
alter table projects enable row level security;

-- Policies for projects
drop policy if exists "anyone in org reads projects" on projects;
create policy "anyone in org reads projects" on projects
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.org_id = projects.org_id)
    or org_id is null
  );

drop policy if exists "admins insert projects" on projects;
create policy "admins insert projects" on projects
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.org_id = projects.org_id)
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "admins and employees update projects" on projects;
create policy "admins and employees update projects" on projects
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.org_id = projects.org_id)
    or org_id is null
  );

drop policy if exists "admins delete projects" on projects;
create policy "admins delete projects" on projects
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
