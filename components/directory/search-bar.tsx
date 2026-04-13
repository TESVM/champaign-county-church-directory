import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/search" className="flex gap-3">
      <Input name="q" defaultValue={defaultValue} placeholder="Search churches, pastors, denominations, or cities" />
      <Button type="submit">
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
