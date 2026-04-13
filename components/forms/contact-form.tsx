import { submitContactAction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  return (
    <form action={submitContactAction} className="space-y-4">
      <Input name="name" placeholder="Your name" />
      <Input name="email" type="email" placeholder="Your email" />
      <Textarea name="message" placeholder="How can we help?" />
      <Button type="submit">Send Message</Button>
    </form>
  );
}
