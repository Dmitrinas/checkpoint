import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { passCardClass } from "@/lib/pass-look";
import {
  createPass,
  formatDateTime,
  isFleetPass,
  requestExit,
  useAppState,
} from "@/lib/store";

export const Route = createFileRoute("/dept/$slug")({ component: DeptPage });

function DeptPage() {
  const { slug } = Route.useParams();
  const { departments, passes } = useAppState();
  const dept = departments.find((d) => d.slug === slug);
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");

  if (!dept) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold">Отдел не найден</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Адрес /dept/{slug} не привязан ни к одному отделу. Проверьте ссылку в
          панели администратора.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">На главную</Link>
        </Button>
      </main>
    );
  }

  const mine = passes
    .filter((p) => p.departmentId === dept.id)
    .filter(
      (p) => p.status !== "exited" || Date.now() - p.updatedAt < 24 * 3600 * 1000,
    )
    .sort((a, b) => {
      const order = {
        pending: 0,
        on_territory: 1,
        exit_requested: 2,
        exited: 3,
      };
      return order[a.status] - order[b.status] || b.updatedAt - a.updatedAt;
    });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dept) return;
    const res = await createPass(dept.id, model, plate);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setModel("");
    setPlate("");
    toast.success("Заявка на въезд отправлена охране");
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        Рабочее место отдела
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{dept.name}</h1>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        /dept/{dept.slug}
      </p>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Новая заявка на въезд</h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="model">Модель автомобиля</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Toyota Camry"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plate">Госномер</Label>
            <Input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="А123БВ777"
              className="font-mono uppercase"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full">
              <Car className="size-4" />
              Въезд
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold">Заявки отдела</h2>
        {mine.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Пока нет заявок
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mine.map((p) => (
              <li key={p.id} className={passCardClass(p)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={isFleetPass(p) ? "font-semibold" : "font-medium"}>
                      {p.model} · <span className="font-mono">{p.plate}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.organization ? `${p.organization} · ` : null}
                      создано {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                {p.status === "on_territory" && (
                  <Button
                    variant="success"
                    className="mt-3 w-full"
                    onClick={() => {
                      requestExit(p.id);
                      toast.success("Запрос на выезд отправлен охране");
                    }}
                  >
                    Выезд разрешён
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
