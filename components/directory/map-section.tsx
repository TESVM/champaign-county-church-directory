import Link from "next/link";
import { MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MapSection({ query }: { query: string }) {
  const encoded = encodeURIComponent(query);
  const embed = `https://www.google.com/maps?q=${encoded}&output=embed`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">Directions</h2>
          <p className="mt-2 text-stone-600">Get directions and preview the church location.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href={directions} target="_blank" rel="noreferrer">
            <MapPinned className="mr-2 h-4 w-4" />
            Open Maps
          </Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-line shadow-card">
        <iframe title="Map" src={embed} className="h-[380px] w-full" loading="lazy" />
      </div>
    </section>
  );
}
