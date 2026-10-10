"use client";

import { type ReactNode, createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms/state";
import { cn } from "@/lib/utils";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const PendingContext = createContext(false);

/**
 * Form wrapper for server actions that reports exactly what happened.
 *
 * A success message appears only when the action returned success, which the
 * server returns only after the write committed. Errors list each field that
 * needs attention. Typed input is kept on error (the form is reset only after
 * a success when `resetOnSuccess` is set).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  fieldLabels = {},
  honeypot = false,
  id
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  fieldLabels?: Record<string, string>;
  honeypot?: boolean;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as FormState);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "idle") return;
    statusRef.current?.focus();
    if (state.status === "success" && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const fieldErrors = Object.entries(state.fieldErrors ?? {});

  return (
    <form
      id={id}
      ref={formRef}
      action={formAction}
      onSubmit={(event) => {
        // Submit through a transition so React does not clear what the person typed.
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const data = new FormData(event.currentTarget, submitter);
        startTransition(() => formAction(data));
      }}
      aria-busy={pending}
      className={cn("relative space-y-5", className)}
    >
      {honeypot ? (
        <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
          <label>
            Leave this field empty
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      ) : null}

      <div ref={statusRef} tabIndex={-1} className="outline-none" aria-live="polite">
        {state.status === "success" && state.message ? (
          <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            {state.message}
          </p>
        ) : null}
        {state.status === "error" ? (
          <div role="alert" className="rounded-2xl border border-rose/40 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-semibold">{state.message ?? "Something went wrong. Nothing was saved."}</p>
            {fieldErrors.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {fieldErrors.map(([field, error]) => (
                  <li key={field}>
                    <a href={`#field-${field}`} className="underline underline-offset-2">
                      {fieldLabels[field] ?? humanize(field)}
                    </a>
                    : {error}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
    </form>
  );
}

function humanize(field: string) {
  return field.replace(/Url$/, " link").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  name,
  value,
  className
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  name?: string;
  value?: string;
  className?: string;
}) {
  const pending = useContext(PendingContext);
  const styles = {
    primary: "bg-brand-900 text-white hover:bg-brand-700",
    secondary: "border border-line bg-white text-ink hover:border-brand-700",
    danger: "bg-red-700 text-white hover:bg-red-800",
    ghost: "text-brand-900 underline-offset-4 hover:underline"
  }[variant];
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70",
        styles,
        className
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
