import { claimListingAction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ClaimForm({
  churchName,
  churchSlug
}: {
  churchName?: string;
  churchSlug?: string;
}) {
  return (
    <form action={claimListingAction} className="space-y-4">
      <input type="hidden" name="churchSlug" value={churchSlug ?? ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="churchName" placeholder="Church name" defaultValue={churchName} />
        <Input name="contactName" placeholder="Your name" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="contactEmail" type="email" placeholder="Your email" />
        <Input name="phone" type="tel" placeholder="Your direct phone" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="role" placeholder="Role at the church" />
        <select
          name="verificationMethod"
          defaultValue="DOMAIN_EMAIL"
          className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="DOMAIN_EMAIL">Verify with church email domain</option>
          <option value="PUBLIC_PHONE">Verify through public church phone</option>
          <option value="MANUAL_REVIEW">Manual review with evidence</option>
        </select>
      </div>
      <Textarea
        name="evidence"
        placeholder="Share the strongest proof you are authorized to manage this listing: official email domain, staff page URL, public phone contact, or another verifiable source."
      />
      <Textarea name="message" placeholder="Tell us how you are connected to this church and what you need updated." />
      <div className="rounded-2xl bg-brand-50 p-4 text-sm leading-6 text-stone-700">
        Claims are approved only after a verification step that reasonably proves pastor or delegated staff authorization.
      </div>
      <Button type="submit">Request Claim Review</Button>
    </form>
  );
}
