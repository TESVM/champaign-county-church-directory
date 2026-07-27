import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Labelled form controls.
 *
 * Most inputs in this app were labelled with a `placeholder` alone, which a
 * screen reader announces as "edit text, blank", and which disappears the
 * moment someone starts typing. Every form control should come through here so
 * the label, required state, hint, and error are wired together once rather
 * than remembered at each call site.
 */

type FieldShellProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
    required?: boolean;
  }) => React.ReactNode;
};

export function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  className,
  children
}: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
        {required ? (
          <>
            {" "}
            <span className="text-rose" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm leading-6 text-stone-600">
          {hint}
        </p>
      ) : null}

      {children({
        id,
        "aria-describedby": describedBy,
        // aria-invalid must be absent rather than "false" when there is no
        // error, or some screen readers announce the field as invalid anyway.
        ...(error ? { "aria-invalid": true as const } : {}),
        required
      })}

      {error ? (
        // role="alert" so the message is announced when it appears, not only
        // when the field is next focused.
        <p id={errorId} role="alert" className="text-sm font-medium text-rose">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function TextField({
  name,
  label,
  hint,
  error,
  required,
  wrapperClassName,
  ...inputProps
}: TextFieldProps) {
  const id = `field-${name}`;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      {(a11y) => <Input name={name} {...inputProps} {...a11y} />}
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id"
> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export function TextAreaField({
  name,
  label,
  hint,
  error,
  required,
  wrapperClassName,
  ...textareaProps
}: TextAreaFieldProps) {
  const id = `field-${name}`;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      {(a11y) => <Textarea name={name} {...textareaProps} {...a11y} />}
    </FieldShell>
  );
}

type SelectFieldProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "id"
> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
  options: Array<{ value: string; label: string }>;
};

export function SelectField({
  name,
  label,
  hint,
  error,
  required,
  wrapperClassName,
  options,
  ...selectProps
}: SelectFieldProps) {
  const id = `field-${name}`;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      {(a11y) => (
        <select
          name={name}
          {...selectProps}
          {...a11y}
          className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/** Checkbox with a 44px hit area, satisfying WCAG 2.2 AA target size (2.5.8). */
export function CheckboxField({
  name,
  label,
  value,
  defaultChecked
}: {
  name: string;
  label: string;
  value: string;
  defaultChecked?: boolean;
}) {
  const id = `field-${name}`;

  return (
    <div className="flex min-h-[44px] items-center gap-3">
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-5 w-5 shrink-0 rounded border-line text-brand-700 focus:ring-2 focus:ring-brand-500"
      />
      <label htmlFor={id} className="text-sm text-stone-700">
        {label}
      </label>
    </div>
  );
}
