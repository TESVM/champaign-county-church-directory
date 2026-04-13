import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500",
        className
      )}
      {...props}
    />
  );
}
