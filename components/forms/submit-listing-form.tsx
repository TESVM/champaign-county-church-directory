import { submitListingAction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function SubmitListingForm() {
  return (
    <form action={submitListingAction} className="grid gap-4 md:grid-cols-2">
      <Input name="churchName" placeholder="Church name" />
      <Input name="city" placeholder="City" />
      <Input name="contactName" placeholder="Contact name" />
      <Input name="contactEmail" type="email" placeholder="Contact email" />
      <Input name="websiteUrl" placeholder="Website URL" />
      <Input name="appUrl" placeholder="Church app URL" />
      <Input name="seniorPastor" placeholder="Senior pastor name" />
      <Input name="serviceTimes" placeholder="Service times" />
      <div className="md:col-span-2">
        <Textarea name="description" placeholder="Church description, ministries, and anything visitors should know" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit">Submit for Review</Button>
      </div>
    </form>
  );
}
