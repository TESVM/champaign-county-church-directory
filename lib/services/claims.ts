import { z } from "zod";
import { type Actor, assertAdmin, assertCanManageChurch, assertReviewer, canEditChurch, isAdmin, isStaff } from "@/lib/actor";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { emailMatchesWebsite, normalizeEmail } from "@/lib/security";
import { audit } from "@/lib/services/audit";
import { notifyPerson, notifyStaff } from "@/lib/services/email";
import { rateLimit } from "@/lib/services/rate-limit";
import { siteUrl } from "@/lib/site";
import { LinkError, normalizePhone } from "@/lib/validation/links";

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

const claimSchema = z.object({
  churchSlug: z.string().trim().min(1, "Choose the church you want to manage."),
  contactName: z.string().trim().min(2, "Enter your name.").max(120),
  contactEmail: z.string().trim().email("Enter a valid email address.").max(254),
  role: z.string().trim().min(2, "Tell us your role at the church.").max(120),
  verificationMethod: z.enum(["DOMAIN_EMAIL", "PUBLIC_PHONE", "MANUAL_REVIEW"], {
    errorMap: () => ({ message: "Choose how we should verify you." })
  }),
  evidence: z.string().trim().min(10, "Describe how we can confirm you are authorised (at least 10 characters).").max(3000),
  phone: z.string().optional()
});

function fieldErrorsOf(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

export async function submitClaim(input: Record<string, unknown>, clientKey: string) {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Please fix the highlighted fields. Your request was not sent.", fieldErrorsOf(parsed.error));
  }
  const data = parsed.data;
  const email = normalizeEmail(data.contactEmail);

  let phone: string | null = null;
  try {
    phone = normalizePhone(data.phone);
  } catch (error) {
    throw new ValidationError("Please fix the highlighted fields.", { phone: (error as LinkError).message });
  }

  await rateLimit("claim-ip", clientKey, 5, 60 * 60);
  await rateLimit("claim-email", email, 3, 60 * 60 * 24);

  const prisma = await db();
  const church = await prisma.church.findUnique({ where: { slug: data.churchSlug } });
  if (!church || church.status !== "ACTIVE") {
    throw new ValidationError("We could not find that church in the directory.", { churchSlug: "Choose a church from the directory." });
  }

  const emailDomainMatches = emailMatchesWebsite(email, church.websiteUrl);

  // A second request from the same person updates the open one instead of
  // creating duplicates in the review queue.
  const open = await prisma.claimRequest.findFirst({
    where: { churchId: church.id, applicantEmail: email, status: { in: ["PENDING", "MORE_INFO"] } }
  });

  const claim = open
    ? await prisma.claimRequest.update({
        where: { id: open.id },
        data: {
          applicantName: data.contactName,
          applicantRole: data.role,
          applicantPhone: phone,
          verificationMethod: data.verificationMethod,
          evidenceSummary: `${open.evidenceSummary}\n\n--- Updated ${new Date().toISOString().slice(0, 10)} ---\n${data.evidence}`,
          emailDomainMatches,
          status: "PENDING"
        }
      })
    : await prisma.claimRequest.create({
        data: {
          churchId: church.id,
          applicantName: data.contactName,
          applicantEmail: email,
          applicantRole: data.role,
          applicantPhone: phone,
          verificationMethod: data.verificationMethod,
          evidenceSummary: data.evidence,
          emailDomainMatches
        }
      });

  await audit({ kind: "anonymous" }, {
    action: open ? "claim.updated_by_applicant" : "claim.submitted",
    entityType: "ClaimRequest",
    entityId: claim.id,
    churchId: church.id,
    summary: `${data.contactName} (${data.role}) requested to manage ${church.name}`
  });

  await notifyStaff(
    `Claim request: ${church.name}`,
    [
      `${data.contactName} <${email}> (${data.role}) asked to manage ${church.name}.`,
      `Verification: ${data.verificationMethod}${emailDomainMatches ? " — email domain matches the church website" : ""}`,
      "",
      data.evidence,
      "",
      `Review: ${siteUrl()}/admin/claims`
    ].join("\n")
  );
  await notifyPerson(
    email,
    `We received your request to manage ${church.name}`,
    [
      `Thank you. We received your request to manage the ${church.name} listing.`,
      "A directory reviewer will verify it, usually within a few business days, and email you the result.",
      "If we need more information we will email this address."
    ].join("\n")
  );

  return { id: claim.id, churchName: church.name, updatedExisting: Boolean(open) };
}

export async function listClaims(actor: Actor, status?: string) {
  assertReviewer(actor);
  const prisma = await db();
  return prisma.claimRequest.findMany({
    where: status && ["PENDING", "APPROVED", "MORE_INFO", "DENIED"].includes(status) ? { status: status as "PENDING" } : undefined,
    include: { church: { select: { id: true, slug: true, name: true, websiteUrl: true, phone: true, email: true } } },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    take: 200
  });
}

const decisionSchema = z.object({
  claimId: z.string().min(1),
  decision: z.enum(["APPROVED", "MORE_INFO", "DENIED"]),
  reviewerNote: z.string().trim().max(2000).optional()
});

export async function reviewClaim(actor: Actor, input: Record<string, unknown>) {
  assertReviewer(actor);
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Choose a decision.");
  const { claimId, decision, reviewerNote } = parsed.data;
  if ((decision === "MORE_INFO" || decision === "DENIED") && !reviewerNote) {
    throw new ValidationError("Add a note explaining what is needed or why the request was declined. It is emailed to the applicant.", {
      reviewerNote: "Required for this decision."
    });
  }

  const prisma = await db();
  const claim = await prisma.claimRequest.findUnique({ where: { id: claimId }, include: { church: true } });
  if (!claim) throw new NotFoundError("That claim request no longer exists.");
  if (claim.status === "APPROVED" || claim.status === "DENIED") {
    throw new ValidationError("This request has already been decided.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.claimRequest.update({
      where: { id: claimId },
      data: { status: decision, reviewerNote: reviewerNote || null, reviewedAt: new Date(), reviewedBy: actor.email }
    });

    if (decision === "APPROVED") {
      const user = await tx.user.upsert({
        where: { email: claim.applicantEmail },
        create: { email: claim.applicantEmail, name: claim.applicantName, role: "EDITOR" },
        update: { disabledAt: null, name: claim.applicantName }
      });
      await tx.claimRequest.update({ where: { id: claimId }, data: { userId: user.id } });
      await tx.churchMembership.upsert({
        where: { churchId_userId: { churchId: claim.churchId, userId: user.id } },
        create: {
          churchId: claim.churchId,
          userId: user.id,
          role: "CHURCH_OWNER",
          status: "ACTIVE",
          grantedAt: new Date(),
          grantedBy: actor.email
        },
        update: { role: "CHURCH_OWNER", status: "ACTIVE", grantedAt: new Date(), grantedBy: actor.email, revokedAt: null, revokedBy: null }
      });
      await tx.church.update({ where: { id: claim.churchId }, data: { claimed: true } });
    }

    await audit(
      actor,
      {
        action: `claim.${decision.toLowerCase()}`,
        entityType: "ClaimRequest",
        entityId: claimId,
        churchId: claim.churchId,
        summary: `${decision === "APPROVED" ? "Approved" : decision === "DENIED" ? "Declined" : "Requested more information on"} ${claim.applicantName}'s claim for ${claim.church.name}`,
        details: reviewerNote ? { note: reviewerNote } : undefined
      },
      tx
    );
  }, { timeout: 20_000, maxWait: 10_000 });

  const church = claim.church.name;
  if (decision === "APPROVED") {
    await notifyPerson(
      claim.applicantEmail,
      `You can now manage ${church}`,
      [
        `Your request to manage ${church} in the Champaign County Church Directory was approved.`,
        "",
        `Sign in with this email address at ${siteUrl()}/login — we will email you a one-time sign-in link.`,
        "From your dashboard you can update the listing, add visitor information, invite editors, and see activity counts."
      ].join("\n")
    );
  } else if (decision === "MORE_INFO") {
    await notifyPerson(
      claim.applicantEmail,
      `More information needed for ${church}`,
      [
        `A reviewer needs a little more information before approving your request to manage ${church}:`,
        "",
        reviewerNote!,
        "",
        `Reply by submitting the claim form again at ${siteUrl()}/claim?church=${claim.church.slug} with the same email address. Your request stays open.`
      ].join("\n")
    );
  } else {
    await notifyPerson(
      claim.applicantEmail,
      `About your request to manage ${church}`,
      [`We were not able to approve your request to manage ${church}.`, "", reviewerNote!, "", `Questions? ${siteUrl()}/contact`].join("\n")
    );
  }
}

// ---------------------------------------------------------------------------
// Church team (owners and editors)
// ---------------------------------------------------------------------------

export async function listTeam(actor: Actor, churchId: string) {
  const prisma = await db();
  if (!canEditChurch(actor, churchId) && !isStaff(actor)) throw new ForbiddenError();
  return prisma.churchMembership.findMany({
    where: { churchId },
    include: { user: { select: { email: true, name: true, lastLoginAt: true } } },
    orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }]
  });
}

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  name: z.string().trim().max(120).optional(),
  role: z.enum(["CHURCH_OWNER", "CHURCH_EDITOR"]).default("CHURCH_EDITOR")
});

export async function inviteTeamMember(actor: Actor, churchId: string, input: Record<string, unknown>) {
  assertCanManageChurch(actor, churchId);
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  const { name, role } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  if (role === "CHURCH_OWNER" && !isAdmin(actor)) {
    throw new ForbiddenError("Only a directory administrator can add another owner. Invite them as an editor, or contact us.");
  }

  await rateLimit("invite", actor.id, 20, 60 * 60 * 24);
  const prisma = await db();
  const church = await prisma.church.findUniqueOrThrow({ where: { id: churchId } });

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: name || null, role: "EDITOR" },
    update: name ? { name } : {}
  });
  if (user.disabledAt) throw new ValidationError("That account has been disabled by an administrator.");

  await prisma.churchMembership.upsert({
    where: { churchId_userId: { churchId, userId: user.id } },
    create: { churchId, userId: user.id, role, status: "ACTIVE", grantedAt: new Date(), grantedBy: actor.email },
    update: { role, status: "ACTIVE", grantedAt: new Date(), grantedBy: actor.email, revokedAt: null, revokedBy: null }
  });
  await prisma.church.update({ where: { id: churchId }, data: { claimed: true } });

  await audit(actor, {
    action: "team.member_added",
    entityType: "ChurchMembership",
    churchId,
    entityId: user.id,
    summary: `Added ${email} as ${role === "CHURCH_OWNER" ? "owner" : "editor"} of ${church.name}`
  });

  const sent = await notifyPerson(
    email,
    `You've been added as ${role === "CHURCH_OWNER" ? "an owner" : "an editor"} of ${church.name}`,
    [
      `${actor.name} added you to manage the ${church.name} listing in the Champaign County Church Directory.`,
      "",
      `Sign in with this email address at ${siteUrl()}/login. We'll email you a one-time link; no password is needed.`
    ].join("\n")
  );
  return { email, emailed: sent };
}

export async function revokeTeamMember(actor: Actor, membershipId: string) {
  const prisma = await db();
  const membership = await prisma.churchMembership.findUnique({
    where: { id: membershipId },
    include: { church: true, user: true }
  });
  if (!membership) throw new NotFoundError("That team member was not found.");
  assertCanManageChurch(actor, membership.churchId);

  if (membership.role === "CHURCH_OWNER" && !isAdmin(actor)) {
    throw new ForbiddenError("Only a directory administrator can remove an owner.");
  }
  if (membership.status === "REVOKED") return;

  await prisma.churchMembership.update({
    where: { id: membershipId },
    data: { status: "REVOKED", revokedAt: new Date(), revokedBy: actor.email }
  });

  const remaining = await prisma.churchMembership.count({ where: { churchId: membership.churchId, status: "ACTIVE" } });
  if (remaining === 0) {
    await prisma.church.update({ where: { id: membership.churchId }, data: { claimed: false } });
  }

  await audit(actor, {
    action: "team.member_revoked",
    entityType: "ChurchMembership",
    entityId: membershipId,
    churchId: membership.churchId,
    summary: `Removed ${membership.user.email} from ${membership.church.name}`
  });
}

// ---------------------------------------------------------------------------
// Staff accounts
// ---------------------------------------------------------------------------

export async function listUsers(actor: Actor) {
  assertAdmin(actor);
  const prisma = await db();
  return prisma.user.findMany({
    include: {
      memberships: { include: { church: { select: { slug: true, name: true } } } },
      _count: { select: { sessions: true } }
    },
    orderBy: [{ role: "asc" }, { email: "asc" }]
  });
}

const staffSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["ADMIN", "REVIEWER", "SUPPORT", "NONE"])
});

export async function setStaffRole(actor: Actor, input: Record<string, unknown>) {
  assertAdmin(actor);
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  const email = normalizeEmail(parsed.data.email);
  if (email === actor.email && parsed.data.role !== "ADMIN") {
    throw new ValidationError("You cannot remove your own administrator role.");
  }
  const prisma = await db();
  const role = parsed.data.role === "NONE" ? "EDITOR" : parsed.data.role;
  await prisma.user.upsert({ where: { email }, create: { email, role }, update: { role } });
  await audit(actor, { action: "user.role_changed", entityType: "User", entityId: email, summary: `Set ${email} staff role to ${parsed.data.role}` });
}

export async function setUserDisabled(actor: Actor, userId: string, disabled: boolean) {
  assertAdmin(actor);
  if (userId === actor.id) throw new ValidationError("You cannot disable your own account.");
  const prisma = await db();
  const user = await prisma.user.update({ where: { id: userId }, data: { disabledAt: disabled ? new Date() : null } });
  if (disabled) await prisma.session.deleteMany({ where: { userId } });
  await audit(actor, {
    action: disabled ? "user.disabled" : "user.enabled",
    entityType: "User",
    entityId: userId,
    summary: `${disabled ? "Disabled" : "Re-enabled"} ${user.email}`
  });
}
