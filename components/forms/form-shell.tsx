import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function FormShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-8">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-stone-600">{description}</p>
      <div className="mt-8">{children}</div>
    </Card>
  );
}
