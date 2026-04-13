import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function HeroSearch() {
  return (
    <form action="/search" className="mt-8 rounded-[28px] border border-white/40 bg-white/90 p-4 shadow-soft" aria-describedby="church-search-help">
      <p id="church-search-help" className="mb-3 text-sm leading-7 text-stone-700">
        Search by church name, pastor, denomination, or city. One word is enough to get started.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex-1">
        <label className="sr-only" htmlFor="home-search">
          Search churches
        </label>
        <Input id="home-search" name="q" placeholder="Search by church name, pastor, denomination, or city" className="border-0 bg-transparent shadow-none focus:ring-0" />
      </div>
      <Button type="submit" size="lg">
        <Search className="mr-2 h-4 w-4" />
        Search Churches
      </Button>
      </div>
    </form>
  );
}
