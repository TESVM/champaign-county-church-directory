import { Input } from "@/components/ui/input";

export function FilterSidebar({
  searchParams
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <aside className="overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-b from-brand-900 via-brand-700 to-brand-500 p-[1px] shadow-soft">
      <div className="rounded-[27px] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(238,248,248,0.92))] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Refine results</p>
        <h2 className="mt-3 font-display text-2xl">Filter Churches</h2>
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-brand-50 to-sky/70 p-4 text-sm leading-6 text-stone-700">
          Narrow the directory by church type, leadership, worship timing, and digital presence.
        </div>
        <form action="/directory" className="mt-6 space-y-4">
          <Input name="q" defaultValue={searchParams.q} placeholder="Church name, city, or pastor" />
          <Input name="city" defaultValue={searchParams.city} placeholder="City slug (ex: champaign)" />
          <Input name="denomination" defaultValue={searchParams.denomination} placeholder="Denomination" />
          <Input name="pastor" defaultValue={searchParams.pastor} placeholder="Senior pastor" />
          <Input name="serviceDay" defaultValue={searchParams.serviceDay} placeholder="Service day" />
          <Input name="serviceTime" defaultValue={searchParams.serviceTime} placeholder="Service time" />
          <Input name="ministry" defaultValue={searchParams.ministry} placeholder="Ministry" />
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input type="checkbox" name="hasWebsite" value="true" defaultChecked={searchParams.hasWebsite === "true"} />
            Has website
          </label>
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input type="checkbox" name="hasApp" value="true" defaultChecked={searchParams.hasApp === "true"} />
            Has app
          </label>
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input type="checkbox" name="hasLivestream" value="true" defaultChecked={searchParams.hasLivestream === "true"} />
            Has livestream
          </label>
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input type="checkbox" name="verified" value="true" defaultChecked={searchParams.verified === "true"} />
            Verified only
          </label>
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input type="checkbox" name="claimed" value="true" defaultChecked={searchParams.claimed === "true"} />
            Claimed only
          </label>
          <button className="w-full rounded-full bg-gradient-to-r from-brand-700 to-rose px-5 py-3 font-semibold text-white">Apply Filters</button>
        </form>
      </div>
    </aside>
  );
}
