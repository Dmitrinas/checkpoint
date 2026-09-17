import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { passCardClass } from "@/lib/pass-look";
import {
  addDepartment,
  addFleetVehicle,
  deletePass,
  fromLocalInput,
  isFleetPass,
  removeDepartment,
  removeFleetVehicle,
  slugify,
  STATUS_LABEL,
  toLocalInput,
  updateDepartment,
  updateFleetVehicle,
  updatePass,
  useAppState,
  type FleetVehicle,
  type Pass,
  type PassStatus,
} from "@/lib/store";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { departments, passes, fleetVehicles } = useAppState();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [record, setRecord] = useState<Pass | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgModel, setOrgModel] = useState("");
  const [orgPlate, setOrgPlate] = useState("");
  const [fleetEdit, setFleetEdit] = useState<FleetVehicle | null>(null);

  const filtered = useMemo(() => {
    const list =
      filterDept === "all"
        ? passes
        : passes.filter((p) => p.departmentId === filterDept);
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [passes, filterDept]);

  const fleetGroups = useMemo(() => {
    const groups = new Map<string, FleetVehicle[]>();
    for (const v of fleetVehicles) {
      const bucket = groups.get(v.organization) ?? [];
      bucket.push(v);
      groups.set(v.organization, bucket);
    }
    return [...groups.entries()];
  }, [fleetVehicles]);

  function copyPath(path: string) {
    const url = `${window.location.origin}${path}`;
    void navigator.clipboard.writeText(url);
    toast.success("Адрес скопирован");
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const res = await addDepartment(name, slugTouched ? slug : undefined);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Отдел создан. Адрес: /dept/${res.department.slug}`);
    setName("");
    setSlug("");
    setSlugTouched(false);
  }

  function startEditDept(id: string) {
    const d = departments.find((x) => x.id === id);
    if (!d) return;
    setEditingId(id);
    setEditName(d.name);
    setEditSlug(d.slug);
  }

  async function saveDept() {
    if (!editingId) return;
    const res = await updateDepartment(editingId, { name: editName, slug: editSlug });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Отдел сохранён, адрес обновлён");
    setEditingId(null);
  }

  async function onAddFleet(e: FormEvent) {
    e.preventDefault();
    const res = await addFleetVehicle(orgName, orgModel, orgPlate);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Автомобиль поставщика добавлен");
    setOrgName("");
    setOrgModel("");
    setOrgPlate("");
  }

  async function saveFleet(e: FormEvent) {
    e.preventDefault();
    if (!fleetEdit) return;
    const res = await updateFleetVehicle(fleetEdit.id, {
      organization: fleetEdit.organization,
      model: fleetEdit.model,
      plate: fleetEdit.plate,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Запись поставщика сохранена");
    setFleetEdit(null);
  }

  async function saveRecord(e: FormEvent) {
    e.preventDefault();
    if (!record) return;
    const res = await updatePass(record.id, {
      model: record.model,
      plate: record.plate,
      departmentId: record.departmentId,
      status: record.status,
      entryAt: record.entryAt,
      exitAt: record.exitAt,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Запись сохранена");
    setRecord(null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        Панель администратора
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Отделы, адреса и записи
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Адрес, который вы присваиваете отделу, сохраняется и не меняется, пока
        вы сами его не отредактируете. Можно править и удалять заявки любого
        отдела и охраны.
      </p>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Новый отдел</h2>
        <form onSubmit={onAdd} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Название</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Диагностика"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-slug">Адрес страницы</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                /dept/
              </span>
              <Input
                id="dept-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
                placeholder="diagnostika"
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              Добавить
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Отделы и закреплённые адреса</h2>
        <ul className="mt-4 divide-y divide-border">
          {departments.map((d) => (
            <li key={d.id} className="py-4 first:pt-0 last:pb-0">
              {editingId === d.id ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Название</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Адрес</Label>
                    <Input
                      value={editSlug}
                      onChange={(e) =>
                        setEditSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                        )
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="button" onClick={saveDept}>
                      Сохранить адрес
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <Link
                        to="/dept/$slug"
                        params={{ slug: d.slug }}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        /dept/{d.slug}
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyPath(`/dept/${d.slug}`)}
                    >
                      <Copy className="size-3.5" />
                      Копировать адрес
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEditDept(d.id)}
                    >
                      <Pencil className="size-3.5" />
                      Изменить
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Удалить отдел? Страница по этому адресу перестанет открываться. Заявки останутся в журнале.",
                          )
                        ) {
                          removeDepartment(d.id);
                          toast.success("Отдел удалён");
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Удалить
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          Охрана: /security
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 h-7"
            onClick={() => copyPath("/security")}
          >
            <Copy className="size-3.5" />
            Копировать
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-emerald-950">
          Поставщики отдела запчастей
        </h2>
        <p className="mt-1 text-sm text-emerald-900/80">
          Постоянные автомобили организаций. Охрана видит их в свёрнутом блоке
          «Организация» и сразу разрешает въезд. Выезд — как у обычных заявок.
        </p>
        <form
          onSubmit={onAddFleet}
          className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
        >
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Организация</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="ООО Автологистика"
              className="border-emerald-300 bg-white font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-model">Марка</Label>
            <Input
              id="org-model"
              value={orgModel}
              onChange={(e) => setOrgModel(e.target.value)}
              placeholder="Газель Next"
              className="border-emerald-300 bg-white font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-plate">Госномер</Label>
            <Input
              id="org-plate"
              value={orgPlate}
              onChange={(e) => setOrgPlate(e.target.value.toUpperCase())}
              placeholder="А001АА777"
              className="border-emerald-300 bg-white font-mono font-semibold uppercase"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full font-semibold sm:w-auto">
              Добавить
            </Button>
          </div>
        </form>

        {fleetVehicles.length === 0 ? (
          <p className="mt-6 py-6 text-center text-sm text-emerald-900/70">
            Список пуст
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            {fleetGroups.map(([org, cars]) => (
              <div key={org}>
                <h3 className="mb-2 text-sm font-bold text-emerald-950">{org}</h3>
                <ul className="space-y-2">
                  {cars.map((v) =>
                    fleetEdit?.id === v.id && fleetEdit ? (
                      <li
                        key={v.id}
                        className="rounded-lg border-2 border-emerald-400 bg-white p-4"
                      >
                        <form onSubmit={saveFleet} className="grid gap-3 sm:grid-cols-3">
                          <Input
                            value={fleetEdit.organization}
                            onChange={(e) =>
                              setFleetEdit({
                                ...fleetEdit,
                                organization: e.target.value,
                              })
                            }
                            required
                          />
                          <Input
                            value={fleetEdit.model}
                            onChange={(e) =>
                              setFleetEdit({ ...fleetEdit, model: e.target.value })
                            }
                            required
                          />
                          <Input
                            value={fleetEdit.plate}
                            onChange={(e) =>
                              setFleetEdit({
                                ...fleetEdit,
                                plate: e.target.value.toUpperCase(),
                              })
                            }
                            className="font-mono uppercase"
                            required
                          />
                          <div className="flex gap-2 sm:col-span-3">
                            <Button type="submit" size="sm">
                              Сохранить
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setFleetEdit(null)}
                            >
                              Отмена
                            </Button>
                          </div>
                        </form>
                      </li>
                    ) : (
                      <li
                        key={v.id}
                        className="flex flex-col gap-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="font-semibold text-emerald-950">
                          {v.model} · <span className="font-mono">{v.plate}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFleetEdit({ ...v })}
                          >
                            <Pencil className="size-3.5" />
                            Изменить
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm("Удалить этот автомобиль из списка поставщиков?")) {
                                removeFleetVehicle(v.id);
                                toast.success("Удалено");
                              }
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            Удалить
                          </Button>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold">Все заявки (отделы и охрана)</h2>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="all">Все отделы</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Записей нет
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filtered.map((p) => (
              <li key={p.id} className={passCardClass(p)}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className={isFleetPass(p) ? "font-semibold" : "font-medium"}>
                      {p.model} · <span className="font-mono">{p.plate}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.organization ? `${p.organization} · ` : null}
                      {p.departmentName}
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRecord({ ...p })}
                    >
                      <Pencil className="size-3.5" />
                      Править
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Удалить эту заявку?")) {
                          deletePass(p.id);
                          toast.success("Запись удалена");
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {record ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
          onClick={() => setRecord(null)}
        >
          <form
            onSubmit={saveRecord}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
          >
            <h3 className="text-lg font-semibold">Редактирование заявки</h3>
            <div className="mt-4 grid gap-3">
              <div className="space-y-1.5">
                <Label>Модель</Label>
                <Input
                  value={record.model}
                  onChange={(e) =>
                    setRecord({ ...record, model: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Госномер</Label>
                <Input
                  value={record.plate}
                  onChange={(e) =>
                    setRecord({ ...record, plate: e.target.value.toUpperCase() })
                  }
                  className="font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Отдел</Label>
                <select
                  value={record.departmentId}
                  onChange={(e) =>
                    setRecord({ ...record, departmentId: e.target.value })
                  }
                  className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Статус</Label>
                <select
                  value={record.status}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      status: e.target.value as PassStatus,
                    })
                  }
                  className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {(Object.keys(STATUS_LABEL) as PassStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Время въезда</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(record.entryAt)}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      entryAt: fromLocalInput(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Время выезда</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(record.exitAt)}
                  onChange={(e) =>
                    setRecord({
                      ...record,
                      exitAt: fromLocalInput(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="submit">Сохранить</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRecord(null)}
              >
                Отмена
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
