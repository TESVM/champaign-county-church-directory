import { redirect } from "next/navigation";
import { inviteMemberAction, revokeMemberAction } from "@/app/actions";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/field";
import { isAdmin } from "@/lib/actor";
import { loadManagedChurch } from "@/lib/dashboard";
import { listTeam } from "@/lib/services/claims";
import { formatDate } from "@/lib/utils";

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, actor, canManage } = await loadManagedChurch(slug, "/team");
  if (!canManage) redirect(`/dashboard/churches/${slug}`);
  const team = await listTeam(actor, church.id);
  const admin = isAdmin(actor);
  return (
    <>
      <ChurchTabs slug={slug} current="/team" canManage={canManage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <h2 className="font-display text-2xl">People who can edit this listing</h2>
          <p className="mt-1 text-sm text-stone-600">Owners manage the team and billing. Editors can update the listing, visitor information, events, and programs.</p>
          <ul className="mt-4 space-y-3">
            {team.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{m.user.name ?? m.user.email}</p>
                  <p className="text-sm text-stone-600">
                    {m.user.email} · {m.role === "CHURCH_OWNER" ? "Owner" : "Editor"} · {m.status === "ACTIVE" ? "Active" : m.status === "REVOKED" ? `Removed ${m.revokedAt ? formatDate(m.revokedAt.toISOString()) : ""}` : "Pending"}
                    {m.user.lastLoginAt ? ` · last signed in ${formatDate(m.user.lastLoginAt.toISOString())}` : " · has not signed in yet"}
                  </p>
                </div>
                {m.status === "ACTIVE" && m.user.email !== actor.email && (m.role === "CHURCH_EDITOR" || admin) ? (
                  <ActionForm action={revokeMemberAction}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <SubmitButton variant="secondary" pendingLabel="Removing…">Remove access</SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">Invite a colleague</h2>
          <p className="mt-1 text-sm text-stone-600">They will get an email and sign in with a one-time link. Only invite people authorised by your church.</p>
          <div className="mt-4">
            <ActionForm action={inviteMemberAction} resetOnSuccess>
              <input type="hidden" name="churchId" value={church.id} />
              <TextField name="email" label="Email" type="email" required />
              <TextField name="name" label="Name" />
              {admin ? (
                <SelectField name="role" label="Role" defaultValue="CHURCH_EDITOR" options={[{ value: "CHURCH_EDITOR", label: "Editor" }, { value: "CHURCH_OWNER", label: "Owner" }]} />
              ) : (
                <input type="hidden" name="role" value="CHURCH_EDITOR" />
              )}
              <SubmitButton pendingLabel="Inviting…">Send invitation</SubmitButton>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
