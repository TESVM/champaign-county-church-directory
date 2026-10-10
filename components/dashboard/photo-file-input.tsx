"use client";

import { useState } from "react";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** File picker that rejects oversized or unsupported files before upload. */
export function PhotoFileInput() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">Upload a photo (JPEG, PNG, or WebP, up to 4 MB)</span>
      <input
        id="field-file"
        type="file"
        name="file"
        accept={TYPES.join(",")}
        aria-describedby="file-help"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return setMessage(null);
          if (!TYPES.includes(file.type)) {
            event.currentTarget.value = "";
            return setMessage("Choose a JPEG, PNG, or WebP image.");
          }
          if (file.size > MAX_BYTES) {
            event.currentTarget.value = "";
            return setMessage(`That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please choose one under 4 MB (most phones can share a smaller size).`);
          }
          setMessage(null);
        }}
        className="mt-2 block w-full text-sm file:mr-4 file:min-h-[44px] file:rounded-full file:border-0 file:bg-brand-900 file:px-4 file:text-white"
      />
      <span id="file-help" role={message ? "alert" : undefined} className={message ? "mt-2 block text-sm font-medium text-rose-800" : "sr-only"}>
        {message ?? "Photos are checked before upload."}
      </span>
    </label>
  );
}
