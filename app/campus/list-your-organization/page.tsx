import type { Metadata } from "next";
import { CampusNav } from "@/components/campus/campus-nav";
import { ListOrgForm } from "@/components/campus/list-org-form";
import { FormShell } from "@/components/forms/form-shell";

export const metadata: Metadata = {
  title: "List Your Campus Ministry for Free",
  description: "Lead a Christian student organization or campus ministry in Champaign-Urbana? List it free so students can find you. Every listing is reviewed.",
  alternates: { canonical: "/campus/list-your-organization" }
};

export default function ListYourOrganizationPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <CampusNav current="/campus/list-your-organization" />
      <FormShell title="List your organization" description="Lead a Christian student organization or campus ministry? List it free so students can find you. We review every listing, and you can ask for changes any time.">
        <ListOrgForm />
      </FormShell>
    </div>
  );
}
