import { saveVisitorGuideAction } from "@/app/actions";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { loadManagedChurch } from "@/lib/dashboard";
import { LANGUAGE_OPTIONS } from "@/lib/services/engagement";

const tri = (v: boolean | null | undefined) => (v === true ? "yes" : v === false ? "no" : "");
const triOptions = [
  { value: "", label: "Not specified" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" }
];

export default async function VisitInfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, canManage } = await loadManagedChurch(slug, "/visit");
  const g = church.visitorGuide;
  return (
    <>
      <ChurchTabs slug={slug} current="/visit" canManage={canManage} />
      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Plan your first visit</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          Answer what a first-time visitor would want to know. This is part of every free listing. Leave anything blank that does not apply. Only state what is true today.
        </p>
        <div className="mt-6">
          <ActionForm action={saveVisitorGuideAction}>
            <input type="hidden" name="churchId" value={church.id} />
            <TextAreaField name="whatToExpect" label="What to expect" defaultValue={g?.whatToExpect} hint="Worship style, how long you greet people, whether there is coffee, anything that helps someone feel at ease." />
            <div className="grid gap-4 md:grid-cols-2">
              <TextAreaField name="parking" label="Parking" defaultValue={g?.parking} />
              <TextAreaField name="entrance" label="Which entrance to use" defaultValue={g?.entrance} />
              <SelectField name="wheelchairAccessible" label="Step-free / wheelchair accessible entrance and seating?" defaultValue={tri(g?.wheelchairAccessible)} options={triOptions} />
              <SelectField name="hearingAssistance" label="Hearing assistance available?" defaultValue={tri(g?.hearingAssistance)} options={triOptions} />
              <TextAreaField name="accessibility" label="Other accessibility details" defaultValue={g?.accessibility} wrapperClassName="md:col-span-2" />
              <SelectField name="hasChildrenProgram" label="Children’s program during services?" defaultValue={tri(g?.hasChildrenProgram)} options={triOptions} />
              <TextAreaField name="childrenCheckIn" label="Children’s check-in" defaultValue={g?.childrenCheckIn} hint="Where to go, ages served, security process." />
              <TextField name="serviceLength" label="Typical service length" defaultValue={g?.serviceLength} placeholder="About 75 minutes" />
              <TextField name="dress" label="What people usually wear" defaultValue={g?.dress} placeholder="Come as you are; some dress up" />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-stone-700">Languages used in services</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <label key={lang} className="flex min-h-[44px] items-center gap-3 rounded-xl px-2 text-sm hover:bg-brand-50">
                    <input type="checkbox" name="languages" value={lang} defaultChecked={g?.languages.includes(lang)} className="h-5 w-5 accent-brand-700" />
                    {lang}
                  </label>
                ))}
              </div>
            </fieldset>
            <SubmitButton>Save visitor information</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </>
  );
}
