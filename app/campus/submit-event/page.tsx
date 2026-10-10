import type { Metadata } from "next";
import { CampusNav } from "@/components/campus/campus-nav";
import { SubmitEventForm } from "@/components/campus/submit-event-form";
import { FormShell } from "@/components/forms/form-shell";
import { listOrganizations } from "@/lib/services/campus";

export const metadata: Metadata = {
  title: "Submit a Student Event",
  description: "Share a worship night, Bible study, free meal, or other Christian student event in Champaign-Urbana.",
  alternates: { canonical: "/campus/submit-event" }
};

export default async function SubmitCampusEventPage() {
  const orgs = await listOrganizations();
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <CampusNav current="/campus/events" />
      <FormShell title="Submit a student event" description="Worship nights, Bible studies, free meals, service projects, retreats, and more. A reviewer checks each event before it appears.">
        <SubmitEventForm organizations={orgs.map((o) => ({ slug: o.slug, name: o.name }))} />
      </FormShell>
    </div>
  );
}
