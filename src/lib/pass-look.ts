import { cn } from "@/lib/utils";
import { isFleetPass, type Pass } from "@/lib/types";

export function passCardClass(
  pass: Pick<Pass, "source" | "organization">,
  kind: "card" | "entry" = "card",
) {
  if (isFleetPass(pass)) {
    return cn(
      "rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4 font-semibold text-emerald-950",
    );
  }
  if (kind === "entry") {
    return "rounded-lg border border-amber-200 bg-amber-50/60 p-4";
  }
  return "rounded-lg border border-border bg-background p-4";
}
