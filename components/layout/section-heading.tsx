export function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{title}</h2>
      <div className="mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-brand-700 via-brand-300 to-rose" />
      {description ? <p className="mt-4 text-lg leading-8 text-stone-600">{description}</p> : null}
    </div>
  );
}
