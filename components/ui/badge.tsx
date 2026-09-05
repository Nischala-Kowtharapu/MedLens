import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-sky-600 text-white hover:bg-sky-700",
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
    destructive: "bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800",
    outline: "text-slate-950 dark:text-slate-50 border border-slate-200 dark:border-slate-800",
    success: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800",
    warning: "bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800",
    info: "bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-800",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
