import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { passCardClass } from "@/lib/pass-look";
import {
  admitFleetVehicle,
  approveEntry,
  approveExit,
  endOfDay,
  formatDateTime,
  formatDuration,
  isFleetPass,
  startOfDay,
  toDateInput,
  useAppState,
} from "@/lib/store";

export const Route = createFileRoute("/security")({ component: SecurityPage });

function SecurityPage() {
  const { passes, fleetVehicles } = useAppState();
  const today = toDateInput(Date.now());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [orgOpen, setOrgOpen] = useState(false);
  const [orgQuery, setOrgQuery] = useState("");

  const pending = passes.filter((p) => p.status === "pending");
  const exitRequested = passes.filter((p) => p.status === "exit_requested");
  const onTerritory = passes.filter((p) => p.status === "on_territory");

  const busyPlates = useMemo(() => {
    const set = new Set<string>();
    for (const p of passes) {
      if (p.status === "pending" || p.status === "on_territory" || p.status === "exit_requested") {
        set.add(p.plate);
      }
    }
    return set;
  }, [passes]);

  const filteredFleet = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    const list = q
      ? fleetVehicles.filter(
          (v) =>
            v.organization.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q) ||
            v.plate.toLowerCase().includes(q),
        )
      : fleetVehicles;
    const groups = new Map<string, typeof list>();
    for (const v of list) {
      const bucket = groups.get(v.organization) ?? [];
      bucket.push(v);
      groups.set(v.organization, bucket);
    }
    return [...groups.entries()];
  }, [fleetVehicles, orgQuery]);

  const report = useMemo(() => {
    const fromTs = startOfDay(from);
    const toTs = endOfDay(to);
    return passes
      .filter((p) => p.entryAt || p.status === "exited" || p.status === "on_territory")
      .filter((p) => {
        const t = p.entryAt ?? p.createdAt;
        return t >= fromTs && t <= toTs;
      })
      .sort((a, b) => (b.entryAt ?? b.createdAt) - (a.entryAt ?? a.createdAt));
  }, [passes, from, to]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-start gap-3">
        <span className="mt-2 size-2.5 shrink-0 rounded-full bg-success" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Охрана — контроль въезда и выезда
          </h1>
          <p className="text-sm text-muted-foreground">
            Все отделы · данные обновляются автоматически
          </p>
        </div>
      </header>

      <section className="mb-4 overflow-hidden rounded-xl border-2 border-emerald-300 bg-emerald-50/70">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          onClick={() => setOrgOpen((v) => !v)}
        >
          <span className="flex items-center gap-2 font-semibold text-emerald-950">
            <Building2 className="size-5" />
            Организация
          </span>
          <span className="flex items-center gap-2 text-sm text-emerald-900">
            {fleetVehicles.length} авто
            <ChevronDown
              className={`size-4 transition-transform ${orgOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        {orgOpen ? (
          <div className="border-t border-emerald-200 px-5 py-4">
            <p className="mb-3 text-sm font-medium text-emerald-950">
              Постоянные машины поставщиков отдела запчастей. Найдите авто и
              разрешите въезд.
            </p>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-emerald-800" />
              <Input
                value={orgQuery}
                onChange={(e) => setOrgQuery(e.target.value)}
                placeholder="Поиск: организация, марка, госномер"
                className="border-emerald-300 bg-white pl-9 font-medium"
              />
            </div>
            {fleetVehicles.length === 0 ? (
              <p className="py-6 text-center text-sm text-emerald-900/70">
                Список пуст. Администратор добавит организации и автомобили.
              </p>
            ) : filteredFleet.length === 0 ? (
              <p className="py-6 text-center text-sm text-emerald-900/70">
                Ничего не найдено
              </p>
            ) : (
              <div className="space-y-4">
                {filteredFleet.map(([org, cars]) => (
                  <div key={org}>
                    <h3 className="mb-2 text-sm font-bold text-emerald-950">{org}</h3>
                    <ul className="space-y-2">
                      {cars.map((v) => {
                        const busy = busyPlates.has(v.plate);
                        return (
                          <li
                            key={v.id}
                            className="flex flex-col gap-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="font-semibold text-emerald-950">
                              {v.model} ·{" "}
                              <span className="font-mono">{v.plate}</span>
                            </div>
                            {busy ? (
                              <span className="text-sm font-semibold text-emerald-800">
                                Уже на территории
                              </span>
                            ) : (
                              <Button
                                variant="success"
                                className="font-semibold sm:w-auto"
                                onClick={async () => {
                                  const res = await admitFleetVehicle(v.id);
                                  if (!res.ok) {
                                    toast.error(res.error);
                                    return;
                                  }
                                  toast.success(`Въезд разрешён: ${v.plate}`);
                                }}
                              >
                                Разрешить въезд
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Заявки на въезд</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {pending.length}
            </span>
          </div>
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Нет ожидающих заявок
            </p>
          ) : (
            <ul className="space-y-3">
              {pending.map((p) => (
                <li key={p.id} className={passCardClass(p, "entry")}>
                  <div className={isFleetPass(p) ? "font-semibold" : "font-medium"}>
                    {p.model} · <span className="font-mono">{p.plate}</span>
                  </div>
                  <div className="mb-3 text-xs text-muted-foreground">
                    {p.organization ? `${p.organization} · ` : null}
                    {p.departmentName} · {formatDateTime(p.createdAt)}
                  </div>
                  <Button
                    variant="success"
                    className="w-full"
                    onClick={() => {
                      approveEntry(p.id);
                      toast.success(`Въезд разрешён: ${p.plate}`);
                    }}
                  >
                    Разрешить въезд
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Запросы на выезд</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {exitRequested.length}
            </span>
          </div>
          {exitRequested.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Нет запросов на выезд
            </p>
          ) : (
            <ul className="space-y-3">
              {exitRequested.map((p) => (
                <li key={p.id} className={passCardClass(p, "entry")}>
                  <div className={isFleetPass(p) ? "font-semibold" : "font-medium"}>
                    {p.model} · <span className="font-mono">{p.plate}</span>
                  </div>
                  <div className="mb-3 text-xs text-muted-foreground">
                    {p.organization ? `${p.organization} · ` : null}
                    {p.departmentName} · запрос {formatDateTime(p.updatedAt)}
                  </div>
                  <Button
                    variant="warning"
                    className="w-full"
                    onClick={() => {
                      approveExit(p.id);
                      toast.success(`Выезд оформлен: ${p.plate}`);
                    }}
                  >
                    Выпустить (выезд)
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Автомобили на территории</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {onTerritory.length}
          </span>
        </div>
        {onTerritory.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            На территории пусто
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {onTerritory.map((p) => (
              <li key={p.id} className={passCardClass(p)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={isFleetPass(p) ? "font-semibold" : "font-medium"}>
                      {p.model} · <span className="font-mono">{p.plate}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.organization ? `${p.organization} · ` : null}
                      {p.departmentName} · въезд {formatDateTime(p.entryAt)}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Отчёт: время заезда и выезда</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="from">Дата с</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="to">Дата по</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const t = toDateInput(Date.now());
              setFrom(t);
              setTo(t);
            }}
          >
            Сегодня
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Одна календарная дата — укажите её в обоих полях. Промежуток — разные
          даты «с» и «по».
        </p>

        {report.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Нет данных за выбранный период
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Автомобиль</th>
                  <th className="py-2 pr-3 font-medium">Отдел</th>
                  <th className="py-2 pr-3 font-medium">Въезд</th>
                  <th className="py-2 pr-3 font-medium">Выезд</th>
                  <th className="py-2 font-medium">На территории</th>
                </tr>
              </thead>
              <tbody>
                {report.map((p) => {
                  const duration =
                    p.entryAt && p.exitAt
                      ? p.exitAt - p.entryAt
                      : p.entryAt && p.status === "on_territory"
                        ? Date.now() - p.entryAt
                        : null;
                  const fleet = isFleetPass(p);
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border last:border-0 ${
                        fleet ? "bg-emerald-50 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <div className={fleet ? "font-semibold" : "font-medium"}>
                          {p.model}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {p.plate}
                        </div>
                        {p.organization ? (
                          <div className="text-xs text-emerald-800">{p.organization}</div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">{p.departmentName}</td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatDateTime(p.entryAt)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatDateTime(p.exitAt)}
                      </td>
                      <td className="py-3 tabular-nums">
                        {formatDuration(duration)}
                        {p.status === "on_territory" ? (
                          <span className="text-muted-foreground"> (сейчас)</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
