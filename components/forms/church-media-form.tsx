"use client";

import Image from "next/image";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ChurchMediaFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  churchSlug: string;
  returnPath: string;
  featuredImageUrl?: string;
  logoUrl?: string;
  submitLabel?: string;
};

export function ChurchMediaForm({
  action,
  churchSlug,
  returnPath,
  featuredImageUrl,
  logoUrl,
  submitLabel = "Save image"
}: ChurchMediaFormProps) {
  const [previewImage, setPreviewImage] = useState(featuredImageUrl || logoUrl || "");

  function handleFeaturedImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <form action={action} className="space-y-4 rounded-[24px] bg-white/80 p-5 ring-1 ring-brand-100">
      <input type="hidden" name="churchSlug" value={churchSlug} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Church images</p>
      {previewImage ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-brand-50">
          <Image
            src={previewImage}
            alt="Church image preview"
            width={1200}
            height={640}
            unoptimized
            className="h-48 w-full object-cover"
          />
        </div>
      ) : null}
      <Input name="featuredImageUrl" defaultValue={featuredImageUrl} aria-label="Featured image URL" placeholder="https://example.com/front-of-church.jpg" />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink" htmlFor={`featured-image-file-${churchSlug}`}>
          Upload featured photo
        </label>
        <Input
          id={`featured-image-file-${churchSlug}`}
          name="featuredImageFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFeaturedImageUpload}
          className="h-auto px-3 py-3"
        />
        <p className="text-xs text-stone-500">PNG, JPG, WEBP, or GIF. Keep it under 4 MB.</p>
      </div>
      <Input name="logoUrl" defaultValue={logoUrl} aria-label="Logo image URL" placeholder="https://example.com/church-logo.png" />
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
