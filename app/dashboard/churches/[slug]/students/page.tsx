import Link from "next/link";
import { setStudentTagsAction } from "@/app/actions";
import { CheckboxGroup } from "@/components/campus/checkbox-group";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { STUDENT_TAGS } from "@/lib/campus";
import { loadManagedChurch } from "@/lib/dashboard";
import { formatDate } from "@/lib/utils";

export default async function StudentsDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, canManage } = await loadManagedChurch(slug, "/students");
  return (
    <>
      <ChurchTabs slug={slug} current="/students" canManage={canManage} />
      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Students</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          Tick what your church offers college students today. These appear on your profile and put you in{" "}
          <Link href="/campus/churches" className="underline">
            Student-Friendly Churches
          </Link>{" "}
          on Campus Faith, marked “Confirmed by the church”. This is free for every listing. Only tick what is true now.
        </p>
        {church.studentTagsUpdatedAt ? (
          <p className="mt-1 text-xs text-stone-500">
            Last saved {formatDate(church.studentTagsUpdatedAt)}
            {church.studentTagsSource === "public-source" ? " by the directory from your public website. Saving here replaces it with your own confirmation." : "."}
          </p>
        ) : null}
        <div className="mt-6">
          <ActionForm action={setStudentTagsAction}>
            <input type="hidden" name="churchId" value={church.id} />
            <CheckboxGroup name="studentTags" legend="We offer" options={STUDENT_TAGS} defaultValues={church.studentTags ?? []} />
            <SubmitButton>Save student details</SubmitButton>
          </ActionForm>
        </div>
        <p className="mt-6 text-sm text-stone-600">
          Hosting a student event? Add it under{" "}
          <Link href={`/dashboard/churches/${slug}/events`} className="underline">
            Events
          </Link>{" "}
          and tick a student calendar category.
        </p>
      </Card>
    </>
  );
}
