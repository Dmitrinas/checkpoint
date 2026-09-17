export type PassStatus =
  | "pending"
  | "on_territory"
  | "exit_requested"
  | "exited";

export type PassSource = "regular" | "fleet";

export type Department = {
  id: string;
  name: string;
  slug: string;
};

export type FleetVehicle = {
  id: string;
  organization: string;
  model: string;
  plate: string;
  departmentId: string;
  createdAt: number;
};

export type Pass = {
  id: string;
  departmentId: string;
  departmentName: string;
  model: string;
  plate: string;
  status: PassStatus;
  source: PassSource;
  organization: string | null;
  createdAt: number;
  updatedAt: number;
  entryAt: number | null;
  exitAt: number | null;
};

export type AppState = {
  departments: Department[];
  passes: Pass[];
  fleetVehicles: FleetVehicle[];
};

const CYR: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .split("")
      .map((ch) => CYR[ch] ?? ch)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "otdel"
  );
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function uniqueSlug(
  base: string,
  departments: Department[],
  exceptId?: string,
) {
  let slug = slugify(base);
  let n = 2;
  const taken = (s: string) =>
    departments.some((d) => d.slug === s && d.id !== exceptId);
  while (taken(slug)) {
    slug = `${slugify(base)}-${n++}`;
  }
  return slug;
}

export const STATUS_LABEL: Record<PassStatus, string> = {
  pending: "Ожидает въезда",
  on_territory: "На территории",
  exit_requested: "Ожидает выезда",
  exited: "Выехал",
};

export const EMPTY_STATE: AppState = {
  departments: [],
  passes: [],
  fleetVehicles: [],
};

export const PARTS_DEPT_SLUG = "otdel-zapchastey";

export function isFleetPass(pass: Pick<Pass, "source" | "organization">) {
  return pass.source === "fleet" || Boolean(pass.organization);
}

export function normalizePlate(plate: string) {
  return plate.trim().toUpperCase().replace(/\s+/g, "");
}

export function formatDateTime(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(ms: number | null) {
  if (!ms || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} ч ${m} мин`;
}

export function toDateInput(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalInput(ts: number | null) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function startOfDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function endOfDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}
