import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import type {
  AppState,
  Department,
  FleetVehicle,
  Pass,
  PassSource,
  PassStatus,
} from "@/lib/types";
import {
  PARTS_DEPT_SLUG,
  normalizePlate,
  slugify,
  uniqueSlug,
  uid,
} from "@/lib/types";

type DeptRow = { id: string; name: string; slug: string };
type FleetRow = {
  id: string;
  organization: string;
  model: string;
  plate: string;
  department_id: string;
  created_at: number;
};
type PassRow = {
  id: string;
  department_id: string;
  department_name: string;
  model: string;
  plate: string;
  status: PassStatus;
  source: PassSource | null;
  organization: string | null;
  created_at: number;
  updated_at: number;
  entry_at: number | null;
  exit_at: number | null;
};

function mapFleet(row: FleetRow): FleetVehicle {
  return {
    id: row.id,
    organization: row.organization,
    model: row.model,
    plate: row.plate,
    departmentId: row.department_id,
    createdAt: Number(row.created_at),
  };
}

function mapPass(row: PassRow): Pass {
  return {
    id: row.id,
    departmentId: row.department_id,
    departmentName: row.department_name,
    model: row.model,
    plate: row.plate,
    status: row.status,
    source: row.source === "fleet" ? "fleet" : "regular",
    organization: row.organization,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    entryAt: row.entry_at == null ? null : Number(row.entry_at),
    exitAt: row.exit_at == null ? null : Number(row.exit_at),
  };
}

async function loadState(): Promise<AppState> {
  const sql = await getSql();
  const departments = await sql<DeptRow>`
    select id, name, slug from departments order by name
  `;
  const fleetRows = await sql<FleetRow>`
    select id, organization, model, plate, department_id, created_at
    from fleet_vehicles
    order by organization, plate
  `;
  const rows = await sql<PassRow>`
    select id, department_id, department_name, model, plate, status,
           coalesce(source, 'regular') as source, organization,
           created_at, updated_at, entry_at, exit_at
    from passes
    order by updated_at desc
  `;
  return {
    departments,
    fleetVehicles: fleetRows.map(mapFleet),
    passes: rows.map(mapPass),
  };
}

async function partsDepartment() {
  const sql = await getSql();
  const rows = await sql<DeptRow>`
    select id, name, slug from departments
    where slug = ${PARTS_DEPT_SLUG} or id = 'd_parts'
    order by case when slug = ${PARTS_DEPT_SLUG} then 0 else 1 end
    limit 1
  `;
  return rows[0] ?? null;
}

export const fetchState = createServerFn({ method: "GET" }).handler(
  async () => loadState(),
);

export const addDepartmentFn = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string(), slug: z.string().optional() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const nameTrim = data.name.trim();
    if (!nameTrim) return { ok: false as const, error: "Укажите название отдела" };
    const existing = await sql<DeptRow>`select id, name, slug from departments`;
    if (existing.some((d) => d.name.toLowerCase() === nameTrim.toLowerCase())) {
      return { ok: false as const, error: "Такой отдел уже есть" };
    }
    const slug = uniqueSlug(data.slug?.trim() || nameTrim, existing);
    const dept: Department = { id: uid("d"), name: nameTrim, slug };
    await sql`
      insert into departments (id, name, slug)
      values (${dept.id}, ${dept.name}, ${dept.slug})
    `;
    return { ok: true as const, department: dept };
  });

export const updateDepartmentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      slug: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<DeptRow>`
      select id, name, slug from departments where id = ${data.id}
    `;
    const current = rows[0];
    if (!current) return { ok: false as const, error: "Отдел не найден" };
    const name = (data.name ?? current.name).trim();
    if (!name) return { ok: false as const, error: "Название не может быть пустым" };
    const all = await sql<DeptRow>`select id, name, slug from departments`;
    if (
      all.some(
        (d) => d.id !== data.id && d.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      return { ok: false as const, error: "Отдел с таким названием уже есть" };
    }
    const slug =
      data.slug !== undefined
        ? uniqueSlug(data.slug || name, all, data.id)
        : current.slug;
    await sql`
      update departments set name = ${name}, slug = ${slug} where id = ${data.id}
    `;
    await sql`
      update passes set department_name = ${name} where department_id = ${data.id}
    `;
    return { ok: true as const };
  });

export const removeDepartmentFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from departments where id = ${data.id}`;
    return { ok: true as const };
  });

export const addFleetFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      organization: z.string(),
      model: z.string(),
      plate: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const organization = data.organization.trim();
    const model = data.model.trim();
    const plate = normalizePlate(data.plate);
    if (!organization || !model || !plate) {
      return { ok: false as const, error: "Заполните организацию, марку и госномер" };
    }
    const dept = await partsDepartment();
    if (!dept) {
      return { ok: false as const, error: "Отдел запчастей не найден" };
    }
    const dup = await sql<{ id: string }>`
      select id from fleet_vehicles where plate = ${plate}
    `;
    if (dup[0]) {
      return { ok: false as const, error: "Автомобиль с таким госномером уже в списке" };
    }
    const vehicle: FleetVehicle = {
      id: uid("f"),
      organization,
      model,
      plate,
      departmentId: dept.id,
      createdAt: Date.now(),
    };
    await sql`
      insert into fleet_vehicles (id, organization, model, plate, department_id, created_at)
      values (
        ${vehicle.id}, ${vehicle.organization}, ${vehicle.model},
        ${vehicle.plate}, ${vehicle.departmentId}, ${vehicle.createdAt}
      )
    `;
    return { ok: true as const, vehicle };
  });

export const updateFleetFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      organization: z.string().optional(),
      model: z.string().optional(),
      plate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<FleetRow>`
      select id, organization, model, plate, department_id, created_at
      from fleet_vehicles where id = ${data.id}
    `;
    const current = rows[0];
    if (!current) return { ok: false as const, error: "Автомобиль не найден" };
    const organization = (data.organization ?? current.organization).trim();
    const model = (data.model ?? current.model).trim();
    const plate = normalizePlate(data.plate ?? current.plate);
    if (!organization || !model || !plate) {
      return { ok: false as const, error: "Заполните организацию, марку и госномер" };
    }
    const dup = await sql<{ id: string }>`
      select id from fleet_vehicles where plate = ${plate} and id <> ${data.id}
    `;
    if (dup[0]) {
      return { ok: false as const, error: "Автомобиль с таким госномером уже в списке" };
    }
    await sql`
      update fleet_vehicles
      set organization = ${organization}, model = ${model}, plate = ${plate}
      where id = ${data.id}
    `;
    return { ok: true as const };
  });

export const removeFleetFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from fleet_vehicles where id = ${data.id}`;
    return { ok: true as const };
  });

export const admitFleetFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const fleetRows = await sql<FleetRow>`
      select id, organization, model, plate, department_id, created_at
      from fleet_vehicles where id = ${data.id}
    `;
    const fleet = fleetRows[0];
    if (!fleet) return { ok: false as const, error: "Автомобиль не найден в списке" };

    const busy = await sql<{ id: string }>`
      select id from passes
      where plate = ${fleet.plate}
        and status in ('pending', 'on_territory', 'exit_requested')
      limit 1
    `;
    if (busy[0]) {
      return {
        ok: false as const,
        error: "Этот автомобиль уже на территории или в заявке",
      };
    }

    const deptRows = await sql<DeptRow>`
      select id, name, slug from departments where id = ${fleet.department_id}
    `;
    const dept = deptRows[0] ?? (await partsDepartment());
    if (!dept) return { ok: false as const, error: "Отдел запчастей не найден" };

    const now = Date.now();
    const pass: Pass = {
      id: uid("p"),
      departmentId: dept.id,
      departmentName: dept.name,
      model: fleet.model,
      plate: fleet.plate,
      status: "on_territory",
      source: "fleet",
      organization: fleet.organization,
      createdAt: now,
      updatedAt: now,
      entryAt: now,
      exitAt: null,
    };
    await sql`
      insert into passes (
        id, department_id, department_name, model, plate, status,
        source, organization, created_at, updated_at, entry_at, exit_at
      ) values (
        ${pass.id}, ${pass.departmentId}, ${pass.departmentName},
        ${pass.model}, ${pass.plate}, ${pass.status},
        ${pass.source}, ${pass.organization},
        ${pass.createdAt}, ${pass.updatedAt}, ${pass.entryAt}, ${pass.exitAt}
      )
    `;
    return { ok: true as const, pass };
  });

export const createPassFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      departmentId: z.string(),
      model: z.string(),
      plate: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<DeptRow>`
      select id, name, slug from departments where id = ${data.departmentId}
    `;
    const dept = rows[0];
    if (!dept) return { ok: false as const, error: "Отдел не найден" };
    const now = Date.now();
    const pass: Pass = {
      id: uid("p"),
      departmentId: dept.id,
      departmentName: dept.name,
      model: data.model.trim(),
      plate: normalizePlate(data.plate),
      status: "pending",
      source: "regular",
      organization: null,
      createdAt: now,
      updatedAt: now,
      entryAt: null,
      exitAt: null,
    };
    await sql`
      insert into passes (
        id, department_id, department_name, model, plate, status,
        source, organization, created_at, updated_at, entry_at, exit_at
      ) values (
        ${pass.id}, ${pass.departmentId}, ${pass.departmentName},
        ${pass.model}, ${pass.plate}, ${pass.status},
        ${pass.source}, ${pass.organization},
        ${pass.createdAt}, ${pass.updatedAt}, ${pass.entryAt}, ${pass.exitAt}
      )
    `;
    return { ok: true as const, pass };
  });

export const requestExitFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const now = Date.now();
    await sql`
      update passes
      set status = 'exit_requested', updated_at = ${now}
      where id = ${data.id} and status = 'on_territory'
    `;
    return { ok: true as const };
  });

export const approveEntryFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const now = Date.now();
    await sql`
      update passes
      set status = 'on_territory', entry_at = ${now}, updated_at = ${now}
      where id = ${data.id} and status = 'pending'
    `;
    return { ok: true as const };
  });

export const approveExitFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const now = Date.now();
    await sql`
      update passes
      set status = 'exited', exit_at = ${now}, updated_at = ${now}
      where id = ${data.id} and status = 'exit_requested'
    `;
    return { ok: true as const };
  });

export const deletePassFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from passes where id = ${data.id}`;
    return { ok: true as const };
  });

const statusSchema = z.enum([
  "pending",
  "on_territory",
  "exit_requested",
  "exited",
]);

export const updatePassFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      model: z.string().optional(),
      plate: z.string().optional(),
      departmentId: z.string().optional(),
      status: statusSchema.optional(),
      entryAt: z.number().nullable().optional(),
      exitAt: z.number().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<PassRow>`
      select id, department_id, department_name, model, plate, status,
             coalesce(source, 'regular') as source, organization,
             created_at, updated_at, entry_at, exit_at
      from passes where id = ${data.id}
    `;
    const current = rows[0];
    if (!current) return { ok: false as const, error: "Запись не найдена" };

    let departmentId = data.departmentId ?? current.department_id;
    let departmentName = current.department_name;
    const deptRows = await sql<DeptRow>`
      select id, name, slug from departments where id = ${departmentId}
    `;
    if (deptRows[0]) departmentName = deptRows[0].name;

    let status = data.status ?? current.status;
    let entryAt =
      data.entryAt !== undefined
        ? data.entryAt
        : current.entry_at == null
          ? null
          : Number(current.entry_at);
    let exitAt =
      data.exitAt !== undefined
        ? data.exitAt
        : current.exit_at == null
          ? null
          : Number(current.exit_at);
    const model = (data.model ?? current.model).trim();
    const plate = normalizePlate(data.plate ?? current.plate);
    const now = Date.now();

    if (status === "on_territory" && !entryAt) entryAt = now;
    if (status === "exited" && !exitAt) exitAt = now;
    if (status === "pending") {
      entryAt = null;
      exitAt = null;
    }

    await sql`
      update passes set
        model = ${model},
        plate = ${plate},
        department_id = ${departmentId},
        department_name = ${departmentName},
        status = ${status},
        entry_at = ${entryAt},
        exit_at = ${exitAt},
        updated_at = ${now}
      where id = ${data.id}
    `;
    return { ok: true as const };
  });

export { slugify };
