-- ============================================================
-- Attendance & Leave Management — schema + RLS
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- organizations (kept for future multi-tenant use) ----------
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

insert into organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Default Org')
on conflict (id) do nothing;

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) default '00000000-0000-0000-0000-000000000001',
  name text not null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  title text,
  join_date date default current_date,
  leave_balance jsonb not null default '{"Annual": 15, "Sick": 10}',
  created_at timestamptz default now()
);

-- auto-create a profile row whenever a new auth user is created
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, title)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'Employee'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- attendance ----------
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  break_minutes int default 0,
  break_start timestamptz,
  breaks jsonb default '[]',
  created_at timestamptz default now(),
  unique (employee_id, date)
);

-- ---------- work logs ----------
create table if not exists work_logs (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  entry_text text not null,
  created_at timestamptz default now()
);

-- ---------- leave requests ----------
create table if not exists leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('Annual', 'Sick', 'Casual', 'Unpaid')),
  start_date date not null,
  end_date date not null,
  days int not null,
  reason text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  created_at timestamptz default now()
);


-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table attendance enable row level security;
alter table work_logs enable row level security;
alter table leave_requests enable row level security;
alter table ot_requests enable row level security;

-- helper: is the current user an admin in the given org?
create or replace function is_org_admin(target_org uuid)
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and org_id = target_org and role = 'admin'
  );
$$ language sql security definer stable;

-- ---------- profiles ----------
create policy "read own profile" on profiles
  for select using (id = auth.uid());

create policy "admins read org profiles" on profiles
  for select using (is_org_admin(org_id));

create policy "users update own profile basics" on profiles
  for update using (id = auth.uid());

create policy "admins update org profiles" on profiles
  for update using (is_org_admin(org_id));

-- ---------- attendance ----------
create policy "employee reads own attendance" on attendance
  for select using (employee_id = auth.uid());

create policy "employee inserts own attendance" on attendance
  for insert with check (employee_id = auth.uid());

create policy "employee updates own attendance" on attendance
  for update using (employee_id = auth.uid());

create policy "admin reads org attendance" on attendance
  for select using (
    exists (select 1 from profiles p where p.id = attendance.employee_id and is_org_admin(p.org_id))
  );

-- ---------- work logs ----------
create policy "employee manages own work logs" on work_logs
  for all using (employee_id = auth.uid()) with check (employee_id = auth.uid());

create policy "admin reads org work logs" on work_logs
  for select using (
    exists (select 1 from profiles p where p.id = work_logs.employee_id and is_org_admin(p.org_id))
  );

-- ---------- leave requests ----------
create policy "employee reads own leave requests" on leave_requests
  for select using (employee_id = auth.uid());

create policy "employee creates own leave requests" on leave_requests
  for insert with check (employee_id = auth.uid());

create policy "admin reads org leave requests" on leave_requests
  for select using (
    exists (select 1 from profiles p where p.id = leave_requests.employee_id and is_org_admin(p.org_id))
  );

create policy "admin decides org leave requests" on leave_requests
  for update using (
    exists (select 1 from profiles p where p.id = leave_requests.employee_id and is_org_admin(p.org_id))
  );
