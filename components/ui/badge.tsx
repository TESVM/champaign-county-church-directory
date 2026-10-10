import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span {...props} className={cn("inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900", className)}>
      {children}
    </span>
  );
}
