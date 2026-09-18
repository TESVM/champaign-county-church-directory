"use client";

import { Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type AiImageGeneratorProps = {
  action: (formData: FormData) => void | Promise<void>;
  churchSlug: string;
  returnPath: string;
  /** Why generation cannot run here, or null when it can. */
  unavailableReason: string | null;
  /** True when the current featured image was uploaded by a person. */
  hasUploadedPhoto: boolean;
  /** True when the current featured image is already AI-generated. */
  currentIsAi: boolean;
  /** Outcome of the last attempt, from the ?ai= query parameter. */
  lastResult?: string;
  /** Admin-facing detail from the last failure, if any. */
  lastError?: string;
};

const RESULT_MESSAGES: Record<string, { tone: "error" | "info"; text: string }> = {
  "has-photo": {
    tone: "info",
    text: "This church already has an uploaded photo, so no AI image was created. Real photos are never replaced."
  },
  busy: {
    tone: "info",
    text: "An image is already being generated for this church. Refresh in a minute to see it."
  },
  "not-configured": {
    tone: "error",
    text: "AI image generation is not set up on this site yet."
  },
  missing: { tone: "error", text: "That church could not be found." },
  failed: { tone: "error", text: "The image could not be generated. Please try again." }
};

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button type="submit" disabled={disabled || pending} aria-disabled={disabled || pending}>
        <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
        {pending ? "Generating image…" : label}
      </Button>
      {/* Announced to screen readers; generation takes 30-90 seconds. */}
      <p role="status" aria-live="polite" className="text-sm text-stone-700">
        {pending
          ? "Creating an HD image. This usually takes 30 to 90 seconds; please keep this page open."
          : ""}
      </p>
    </>
  );
}

export function AiImageGenerator({
  action,
  churchSlug,
  returnPath,
  unavailableReason,
  hasUploadedPhoto,
  currentIsAi,
  lastResult,
  lastError
}: AiImageGeneratorProps) {
  const message = lastResult ? RESULT_MESSAGES[lastResult] : undefined;
  const disabled = Boolean(unavailableReason) || hasUploadedPhoto;

  return (
    <form
      action={action}
      className="space-y-3 rounded-[24px] bg-white/80 p-5 ring-1 ring-brand-100"
      aria-describedby={`ai-image-help-${churchSlug}`}
    >
      <input type="hidden" name="churchSlug" value={churchSlug} />
      <input type="hidden" name="returnPath" value={returnPath} />

      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
        AI profile image
      </h2>

      <p id={`ai-image-help-${churchSlug}`} className="text-sm leading-6 text-stone-700">
        Create an HD image of a church building for this listing. The AI invents the
        building; it is not a photo of this church, and it is labelled
        &ldquo;AI-generated image&rdquo; wherever it appears. Uploading a real photo
        always replaces it.
      </p>

      {hasUploadedPhoto ? (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
          This church has an uploaded photo, which is protected. Remove it above if you
          would rather use an AI image.
        </p>
      ) : null}

      {unavailableReason && !hasUploadedPhoto ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Not available yet: {unavailableReason}
        </p>
      ) : null}

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : undefined}
          className={
            message.tone === "error"
              ? "rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200"
              : "rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900"
          }
        >
          {message.text}
          {lastResult === "failed" && lastError ? (
            <span className="mt-1 block text-xs text-red-700">{lastError}</span>
          ) : null}
        </p>
      ) : null}

      <SubmitButton
        label={currentIsAi ? "Generate a new AI image" : "Generate AI image"}
        disabled={disabled}
      />
    </form>
  );
}

function CompactSubmit({ label, disabled, churchName }: { label: string; disabled: boolean; churchName: string }) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        type="submit"
        size="sm"
        disabled={disabled || pending}
        aria-disabled={disabled || pending}
        // The visible label repeats down the list, so name the church for
        // screen-reader users navigating by button.
        aria-label={`${pending ? "Generating image for" : label + " for"} ${churchName}`}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {pending ? "Generating…" : label}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? `Generating an image for ${churchName}. This takes 30 to 90 seconds.` : ""}
      </span>
    </>
  );
}

/** One-button form for the admin AI Images list. */
export function GenerateImageButton({
  action,
  churchSlug,
  churchName,
  returnPath,
  label,
  disabled
}: {
  action: (formData: FormData) => void | Promise<void>;
  churchSlug: string;
  churchName: string;
  returnPath: string;
  label: string;
  disabled: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="churchSlug" value={churchSlug} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <CompactSubmit label={label} disabled={disabled} churchName={churchName} />
    </form>
  );
}
