import { redirect } from "next/navigation";

/** Older links pointed at /search; the directory handles every filter. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v) params.set(key, v);
  }
  const query = params.toString();
  redirect(query ? `/directory?${query}` : "/directory");
}
