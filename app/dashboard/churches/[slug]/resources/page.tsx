import { removeResourceAction, saveResourceAction } from "@/app/actions";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { loadManagedChurch } from "@/lib/dashboard";
import { RESOURCE_CATEGORIES, listResources } from "@/lib/services/engagement";

const STATUS = { PENDING: "Waiting for review", APPROVED: "Published", REJECTED: "Not approved" } as const;

export default async function ResourcesDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, canManage } = await loadManagedChurch(slug, "/resources");
  const resources = await listResources({ churchId: church.id, status: "ALL" });
  return (
    <>
      <ChurchTabs slug={slug} current="/resources" canManage={canManage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Add a community program</h2>
          <p className="mt-1 text-sm text-stone-600">Food pantries, meals, clothing, support groups, and similar help open to the public. Free for every church; reviewed before publishing.</p>
          <div className="mt-4">
            <ActionForm action={saveResourceAction} resetOnSuccess fieldLabels={{ url: "Link" }}>
              <input type="hidden" name="churchId" value={church.id} />
              <SelectField name="category" label="Type" required defaultValue="FOOD_PANTRY" options={RESOURCE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
              <TextField name="title" label="Program name" required />
              <TextAreaField name="description" label="What it offers" required />
              <TextField name="schedule" label="When" placeholder="Second Saturday, 9–11 AM" />
              <TextAreaField name="eligibility" label="Who can use it" placeholder="Open to anyone in Champaign County; bring ID if you have it" />
              <TextField name="contact" label="Contact (if different from the church)" />
              <TextField name="url" label="Link for more information" type="url" />
              <SubmitButton>Submit for review</SubmitButton>
            </ActionForm>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">Your programs</h2>
          {resources.length ? (
            <ul className="mt-4 space-y-3">
              {resources.map((r) => (
                <li key={r.id} className="rounded-2xl border border-line p-4">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-stone-600">{STATUS[r.status]}{r.reviewerNote ? ` — ${r.reviewerNote}` : ""}</p>
                  <div className="mt-2">
                    <ActionForm action={removeResourceAction}>
                      <input type="hidden" name="resourceId" value={r.id} />
                      <SubmitButton variant="secondary" pendingLabel="Removing…">Remove</SubmitButton>
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone-600">None yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
