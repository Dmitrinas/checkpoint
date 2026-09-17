create table if not exists departments (
  id text primary key,
  name text not null,
  slug text not null unique
);

create table if not exists passes (
  id text primary key,
  department_id text not null,
  department_name text not null,
  model text not null,
  plate text not null,
  status text not null,
  created_at bigint not null,
  updated_at bigint not null,
  entry_at bigint,
  exit_at bigint
);

create index if not exists passes_status_idx on passes (status);
create index if not exists passes_department_idx on passes (department_id);

insert into departments (id, name, slug) values
  ('d_servis', 'Сервис', 'servis'),
  ('d_sales', 'Отдел продаж', 'otdel-prodazh'),
  ('d_tradein', 'Трейд-ин', 'treyd-in'),
  ('d_body', 'Кузовной цех', 'kuzovnoy-ceh'),
  ('d_parts', 'Отдел запчастей', 'otdel-zapchastey')
on conflict (id) do nothing;
