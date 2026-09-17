import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Shield, Settings2, ChevronRight } from "lucide-react";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { departments } = useAppState();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Предприятие
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Пропускная система
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Отделы оформляют въезд, охрана пропускает автомобили. У каждого отдела
          свой постоянный адрес страницы.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/security"
          className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between">
            <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-primary">
              <Shield className="size-5" />
            </div>
            <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Охрана</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Въезд, выезд и отчёт по датам. Адрес: /security
          </p>
        </Link>

        <Link
          to="/admin"
          className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between">
            <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-primary">
              <Settings2 className="size-5" />
            </div>
            <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Администратор</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Отделы, адреса страниц, правка и удаление заявок
          </p>
        </Link>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          <h2 className="text-lg font-semibold">Отделы</h2>
        </div>
        {departments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Отделы ещё не созданы. Добавьте их в панели администратора.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {departments.map((d) => (
              <li key={d.id}>
                <Link
                  to="/dept/$slug"
                  params={{ slug: d.slug }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40"
                >
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      /dept/{d.slug}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
