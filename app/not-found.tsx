import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-line bg-surface p-8 shadow-card">
        <h1 className="font-display text-3xl text-ink">We could not find that page</h1>
        <p className="mt-4 leading-7 text-stone-700">
          The church or city you are looking for may have been renamed or removed
          from the directory. Search the directory to find it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/directory">Search the directory</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/cities">Browse by city</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
