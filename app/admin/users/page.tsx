import { revokeSessionsAction, setStaffRoleAction, setUserDisabledAction } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/field";
import { requireStaff } from "@/lib/auth-guards";
import { listUsers } from "@/lib/services/claims";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function UsersPage() {
  const actor = await requireStaff("/admin/users");
  if (actor.staffRole !== "ADMIN") redirect("/admin?denied=1");
  const users = await listUsers(actor);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Users and staff</h1>
      <Card className="p-5">
        <h2 className="font-display text-2xl">Add or change a staff role</h2>
        <p className="mt-1 text-sm text-stone-600">Admins manage everything. Reviewers approve claims, submissions, and listing changes. Support staff answer messages.</p>
        <div className="mt-3">
          <ActionForm action={setStaffRoleAction} resetOnSuccess>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="email" label="Email" type="email" required />
              <SelectField name="role" label="Role" defaultValue="REVIEWER" options={[{ value: "ADMIN", label: "Admin" }, { value: "REVIEWER", label: "Reviewer" }, { value: "SUPPORT", label: "Support" }, { value: "NONE", label: "No staff role" }]} />
            </div>
            <SubmitButton>Save role</SubmitButton>
          </ActionForm>
        </div>
      </Card>
      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{u.name ?? u.email} <span className="text-sm font-normal text-stone-600">{u.email}</span></p>
                <p className="text-sm text-stone-600">
                  {["ADMIN", "REVIEWER", "SUPPORT"].includes(u.role) ? u.role.toLowerCase() : "church user"}
                  {u.disabledAt ? " · DISABLED" : ""} · {u._count.sessions} active session(s) · {u.lastLoginAt ? `last sign-in ${formatDate(u.lastLoginAt.toISOString())}` : "never signed in"}
                </p>
                {u.memberships.length ? <p className="text-sm text-stone-700">{u.memberships.map((m) => `${m.church.name} (${m.role === "CHURCH_OWNER" ? "owner" : "editor"}, ${m.status.toLowerCase()})`).join("; ")}</p> : null}
              </div>
              {u.id !== actor.id ? (
                <div className="flex flex-wrap gap-2">
                  <ActionForm action={revokeSessionsAction}><input type="hidden" name="userId" value={u.id} /><SubmitButton variant="secondary">Sign out everywhere</SubmitButton></ActionForm>
                  <ActionForm action={setUserDisabledAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="disabled" value={u.disabledAt ? "false" : "true"} />
                    <SubmitButton variant={u.disabledAt ? "secondary" : "danger"}>{u.disabledAt ? "Re-enable" : "Disable account"}</SubmitButton>
                  </ActionForm>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
