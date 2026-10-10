"use client";

import { reportCollabPostAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { SelectField } from "@/components/ui/field";
import { REPORT_REASONS } from "@/lib/collab";

export function ReportForm({ postId }: { postId: string }) {
  return (
    <details className="rounded-[20px] border border-line bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-stone-700">Report this post</summary>
      <div className="mt-3">
        <ActionForm action={reportCollabPostAction} honeypot>
          <input type="hidden" name="id" value={postId} />
          <SelectField name="reason" label="What is wrong?" required defaultValue="" options={[{ value: "", label: "Choose a reason…" }, ...REPORT_REASONS.map(([value, label]) => ({ value, label }))]} />
          <SubmitButton variant="secondary" pendingLabel="Sending…">
            Send report
          </SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}
