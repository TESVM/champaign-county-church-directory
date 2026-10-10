/** A labeled group of checkboxes that submit several values under one name. */
export function CheckboxGroup({
  name,
  legend,
  options,
  defaultValues = [],
  hint,
  required,
  columns = 2
}: {
  name: string;
  legend: string;
  options: ReadonlyArray<readonly [string, string]>;
  defaultValues?: string[];
  hint?: string;
  required?: boolean;
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset id={`field-${name}`} className="space-y-2" aria-describedby={hint ? `field-${name}-hint` : undefined}>
      <legend className="text-sm font-medium text-stone-800">
        {legend}
        {required ? <span aria-hidden="true"> *</span> : null}
      </legend>
      {hint ? (
        <p id={`field-${name}-hint`} className="text-sm text-stone-600">
          {hint}
        </p>
      ) : null}
      <div className={`grid gap-x-4 ${columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map(([value, label]) => (
          <label key={value} className="flex min-h-[44px] items-center gap-3 text-sm text-stone-700">
            <input type="checkbox" name={name} value={value} defaultChecked={defaultValues.includes(value)} className="h-5 w-5 shrink-0 rounded border-line text-brand-700 focus:ring-2 focus:ring-brand-500" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
