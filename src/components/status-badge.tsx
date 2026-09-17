import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type PassStatus } from "@/lib/store";

const map: Record<PassStatus, "pending" | "territory" | "exit" | "done"> = {
  pending: "pending",
  on_territory: "territory",
  exit_requested: "exit",
  exited: "done",
};

export function StatusBadge({ status }: { status: PassStatus }) {
  return <Badge variant={map[status]}>{STATUS_LABEL[status]}</Badge>;
}
