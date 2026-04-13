export function Pagination() {
  return (
    <div className="flex items-center justify-center gap-2 pt-6 text-sm text-stone-600">
      <span className="rounded-full border border-line px-4 py-2">Previous</span>
      <span className="rounded-full bg-brand-700 px-4 py-2 text-white">1</span>
      <span className="rounded-full border border-line px-4 py-2">2</span>
      <span className="rounded-full border border-line px-4 py-2">Next</span>
    </div>
  );
}
