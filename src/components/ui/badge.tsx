import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        pending: "bg-amber-50 text-amber-800 border border-amber-200",
        territory: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        exit: "bg-sky-50 text-sky-800 border border-sky-200",
        done: "bg-stone-100 text-stone-600 border border-stone-200",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
