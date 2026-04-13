import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/layout/section-heading";

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div>
        <SectionHeading
          eyebrow="Contact"
          title="Corrections, listing questions, or partnership inquiries"
          description="Use this form for church listing updates, claim questions, or directory feedback."
        />
        <div className="mt-8 space-y-4">
          {[
            ["Email", "admin@champaignchurchdirectory.com"],
            ["Coverage", "Champaign County, Illinois"],
            ["Response window", "Typically within one business day"]
          ].map(([label, value]) => (
            <Card key={label} className="rounded-[24px] bg-white/85 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">{label}</p>
              <p className="mt-2 text-stone-700">{value}</p>
            </Card>
          ))}
        </div>
      </div>
      <Card className="rounded-[32px] bg-white/90 p-6 sm:p-8">
        <form className="space-y-5" aria-describedby="contact-form-help">
          <p id="contact-form-help" className="text-sm text-stone-600">
            All fields are labeled for screen readers. Required fields are marked.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-stone-700">
              Name <span aria-hidden="true">*</span>
              <Input required name="name" autoComplete="name" className="mt-2" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Email <span aria-hidden="true">*</span>
              <Input required type="email" name="email" autoComplete="email" className="mt-2" />
            </label>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Church or organization
            <Input name="organization" className="mt-2" />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Message <span aria-hidden="true">*</span>
            <Textarea required name="message" className="mt-2" />
          </label>
          <Button type="submit">Send message</Button>
        </form>
      </Card>
    </div>
  );
}
