-- ============================================================
-- Projects & Details Architecture Migration (Fixed Non-Recursive RLS)
-- ============================================================

-- 1. Helper functions for RLS (Security Definer with search_path prevents recursion)
create or replace function public.get_auth_org_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_org_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Ensure core projects table exists
create table if not exists public.projects (
  id uuid primary key default extensions.uuid_generate_v4(),
  org_id uuid references public.organizations(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  name text not null,
  color text default '#63537E',
  archived boolean default false,
  status text default 'Active',
  current_stage text default '',
  progress integer default 0,
  start_date text default '',
  end_date text default '',
  lead_architect_id uuid references public.profiles(id) on delete set null,
  sub_architect_ids jsonb default '[]'::jsonb,
  project_work text default '',
  project_type text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Ensure core columns exist if table was created previously
alter table public.projects add column if not exists org_id uuid references public.organizations(id) on delete cascade default '00000000-0000-0000-0000-000000000001';
alter table public.projects add column if not exists status text default 'Active';
alter table public.projects add column if not exists current_stage text default '';
alter table public.projects add column if not exists progress integer default 0;
alter table public.projects add column if not exists start_date text default '';
alter table public.projects add column if not exists end_date text default '';
alter table public.projects add column if not exists lead_architect_id uuid references public.profiles(id) on delete set null;
alter table public.projects add column if not exists sub_architect_ids jsonb default '[]'::jsonb;
alter table public.projects add column if not exists project_work text default '';
alter table public.projects add column if not exists project_type text default '';
alter table public.projects add column if not exists updated_at timestamptz default now();

-- 3. Dedicated project_details table for extended tracking & dual tracks
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

-- Indexes for performance
create index if not exists idx_projects_org on public.projects(org_id);
create index if not exists idx_projects_lead_id on public.projects(lead_architect_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_project_details_id on public.project_details(project_id);

-- 4. Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_details enable row level security;
alter table public.work_logs enable row level security;

-- 5. Policies for profiles (Strict organization isolation, non-recursive)
drop policy if exists "org members read org profiles" on public.profiles;
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "admins read org profiles" on public.profiles;
drop policy if exists "authenticated users read profiles" on public.profiles;

create policy "org members read org profiles" on public.profiles
  for select to authenticated
  using (
    org_id = public.get_auth_org_id()
  );

-- 6. Policies for projects
drop policy if exists "anyone in org reads projects" on public.projects;
create policy "anyone in org reads projects" on public.projects
  for select to authenticated
  using (
    org_id = public.get_auth_org_id()
    or org_id is null
  );

drop policy if exists "admins insert projects" on public.projects;
create policy "admins insert projects" on public.projects
  for insert to authenticated with check (
    public.is_org_admin()
  );

drop policy if exists "admins and employees update projects" on public.projects;
create policy "admins and employees update projects" on public.projects
  for update to authenticated using (
    org_id = public.get_auth_org_id()
    or org_id is null
    or public.is_org_admin()
  );

drop policy if exists "admins delete projects" on public.projects;
create policy "admins delete projects" on public.projects
  for delete to authenticated using (
    public.is_org_admin()
  );

-- 7. Policies for project_details
drop policy if exists "org members read project details" on public.project_details;
create policy "org members read project details" on public.project_details
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_details.project_id
        and (p.org_id = public.get_auth_org_id() or p.org_id is null)
    )
  );

drop policy if exists "org members insert project details" on public.project_details;
create policy "org members insert project details" on public.project_details
  for insert to authenticated with check (
    exists (
      select 1 from public.projects p
      where p.id = project_details.project_id
        and (p.org_id = public.get_auth_org_id() or p.org_id is null)
    )
  );

drop policy if exists "org members update project details" on public.project_details;
create policy "org members update project details" on public.project_details
  for update to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_details.project_id
        and (p.org_id = public.get_auth_org_id() or p.org_id is null)
    )
  );

-- 8. Policies for work_logs (allow coworkers to see project logs)
drop policy if exists "org members read org work logs" on public.work_logs;
create policy "org members read org work logs" on public.work_logs
  for select to authenticated
  using (
    employee_id = auth.uid()
    or public.is_org_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = work_logs.employee_id
        and (p.org_id = public.get_auth_org_id() or p.org_id is null)
    )
  );
