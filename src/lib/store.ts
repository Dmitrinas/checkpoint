import { useEffect, useState } from "react";
import {
  addDepartmentFn,
  addFleetFn,
  admitFleetFn,
  approveEntryFn,
  approveExitFn,
  createPassFn,
  deletePassFn,
  fetchState,
  removeDepartmentFn,
  removeFleetFn,
  requestExitFn,
  updateDepartmentFn,
  updateFleetFn,
  updatePassFn,
} from "@/lib/checkpoint";
import {
  EMPTY_STATE,
  type AppState,
  type Pass,
  type PassStatus,
} from "@/lib/types";

export type {
  AppState,
  Department,
  FleetVehicle,
  Pass,
  PassStatus,
} from "@/lib/types";
export {
  EMPTY_STATE as EMPTY,
  STATUS_LABEL,
  endOfDay,
  formatDateTime,
  formatDuration,
  fromLocalInput,
  isFleetPass,
  slugify,
  startOfDay,
  toDateInput,
  toLocalInput,
} from "@/lib/types";

const refreshers = new Set<() => void>();

function ping() {
  refreshers.forEach((fn) => fn());
}

export function useAppState(): AppState {
  const [state, setState] = useState<AppState>(EMPTY_STATE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await fetchState();
        if (!cancelled) setState(next);
      } catch {
        // keep last snapshot
      }
    }
    void load();
    const id = setInterval(load, 2000);
    refreshers.add(load);
    return () => {
      cancelled = true;
      clearInterval(id);
      refreshers.delete(load);
    };
  }, []);

  return state;
}

export async function addDepartment(name: string, slugInput?: string) {
  const res = await addDepartmentFn({ data: { name, slug: slugInput } });
  ping();
  return res;
}

export async function updateDepartment(
  id: string,
  patch: Partial<{ name: string; slug: string }>,
) {
  const res = await updateDepartmentFn({ data: { id, ...patch } });
  ping();
  return res;
}

export async function removeDepartment(id: string) {
  await removeDepartmentFn({ data: { id } });
  ping();
}

export async function addFleetVehicle(
  organization: string,
  model: string,
  plate: string,
) {
  const res = await addFleetFn({ data: { organization, model, plate } });
  ping();
  return res;
}

export async function updateFleetVehicle(
  id: string,
  patch: Partial<{ organization: string; model: string; plate: string }>,
) {
  const res = await updateFleetFn({ data: { id, ...patch } });
  ping();
  return res;
}

export async function removeFleetVehicle(id: string) {
  await removeFleetFn({ data: { id } });
  ping();
}

export async function admitFleetVehicle(id: string) {
  const res = await admitFleetFn({ data: { id } });
  ping();
  return res;
}

export async function createPass(
  departmentId: string,
  model: string,
  plate: string,
) {
  const res = await createPassFn({ data: { departmentId, model, plate } });
  ping();
  return res;
}

export async function requestExit(id: string) {
  await requestExitFn({ data: { id } });
  ping();
}

export async function approveEntry(id: string) {
  await approveEntryFn({ data: { id } });
  ping();
}

export async function approveExit(id: string) {
  await approveExitFn({ data: { id } });
  ping();
}

export async function deletePass(id: string) {
  await deletePassFn({ data: { id } });
  ping();
}

export async function updatePass(
  id: string,
  patch: Partial<
    Pick<Pass, "model" | "plate" | "departmentId" | "status" | "entryAt" | "exitAt">
  >,
) {
  const res = await updatePassFn({
    data: {
      id,
      model: patch.model,
      plate: patch.plate,
      departmentId: patch.departmentId,
      status: patch.status as PassStatus | undefined,
      entryAt: patch.entryAt,
      exitAt: patch.exitAt,
    },
  });
  ping();
  return res;
}
