import type { Metadata } from "next";
import { SectionHeading } from "@/components/layout/section-heading";
import { SavedChurches } from "@/components/directory/saved-churches";

export const metadata: Metadata = {
  title: "Saved Churches",
  robots: { index: false },
  alternates: { canonical: "/saved" }
};

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Saved"
        title="Churches you saved"
        description="Saved in this browser only, with no account. Clearing your browser data removes them."
      />
      <div className="mt-8">
        <SavedChurches />
      </div>
    </div>
  );
}
