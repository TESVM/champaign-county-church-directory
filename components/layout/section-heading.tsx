export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Heading = "h2"
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /**
   * Six pages had no h1 at all because this always rendered an h2. Pages that
   * own the top of the document pass as="h1".
   */
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">{eyebrow}</p>
      ) : null}
      <Heading className="mt-3 font-display text-3xl text-ink sm:text-4xl">{title}</Heading>
      <div className="mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-brand-700 via-brand-300 to-rose" />
      {description ? <p className="mt-4 text-lg leading-8 text-stone-600">{description}</p> : null}
    </div>
  );
}
