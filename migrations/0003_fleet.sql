create table if not exists fleet_vehicles (
  id text primary key,
  organization text not null,
  model text not null,
  plate text not null unique,
  department_id text not null,
  created_at bigint not null
);

create index if not exists fleet_org_idx on fleet_vehicles (organization);

alter table passes add column if not exists organization text;
alter table passes add column if not exists source text not null default 'regular';
