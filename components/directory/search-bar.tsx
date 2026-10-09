import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/directory" className="flex gap-3" role="search">
      <div className="flex-1">
        {/* Visually hidden rather than absent: a placeholder alone announces as
            "edit text, blank" and vanishes once typing starts. */}
        <label htmlFor="directory-search" className="sr-only">
          Search churches, pastors, denominations, or cities
        </label>
        <Input
          id="directory-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Search churches, pastors, denominations, or cities"
        />
      </div>
      <Button type="submit">
        <Search className="mr-2 h-4 w-4" aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
