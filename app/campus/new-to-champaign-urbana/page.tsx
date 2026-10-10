import type { Metadata } from "next";
import Link from "next/link";
import { CampusNav } from "@/components/campus/campus-nav";
import { SectionHeading } from "@/components/layout/section-heading";

export const metadata: Metadata = {
  title: "New to Champaign-Urbana? Finding a Church as a Student",
  description: "A practical guide for students new to Champaign-Urbana: how to find a church or campus ministry, what a first visit is like, getting there without a car, and questions worth asking.",
  alternates: { canonical: "/campus/new-to-champaign-urbana" }
};

const steps = [
  {
    title: "Start with what matters to you",
    body: "Worship style, a Bible study during the week, a group of people your age, a service in your first language, or simply somewhere close. Knowing two or three priorities makes the search much shorter."
  },
  {
    title: "Search by what you need",
    body: (
      <>
        Use the <Link href="/map" className="underline">map</Link> to see what is near where you live, or the <Link href="/find-a-service" className="underline">service finder</Link> for a time that fits your class schedule. <Link href="/campus/churches" className="underline">Student-Friendly Churches</Link> shows churches with college or young-adult ministries, and <Link href="/campus/organizations" className="underline">Campus Ministries</Link> lists student groups that meet on or near campus.
      </>
    )
  },
  {
    title: "Read the “Plan your visit” notes",
    body: "Many church profiles say where to park or which door to use, how long services last, what people wear, and what is available for children. If a church has not added these yet, its phone number and website are on its profile."
  },
  {
    title: "Getting there without a car",
    body: (
      <>
        The Champaign-Urbana Mass Transit District (MTD) runs buses across both cities and campus. Check{" "}
        <a href="https://mtd.org" target="_blank" rel="noopener noreferrer" className="underline">
          mtd.org
        </a>{" "}
        for routes, Sunday schedules, and fare details for your school. Some churches and ministries offer rides; churches that have told us are marked “Campus transportation or ride support”.
      </>
    )
  },
  {
    title: "Try a few before deciding",
    body: "Visiting two or three places over a few weeks is normal. Going with a friend helps, and so does staying for coffee or lunch afterward if it is offered."
  }
];

const questions = [
  "Is there a group for college students or young adults, and when does it meet?",
  "Is there a weekday Bible study I can join partway through the semester?",
  "Do you help students get to church, or is it on a bus line?",
  "Is there someone I can talk to if I am new to faith or new to the area?",
  "How can I serve or volunteer while I am here?"
];

export default function NewToCuPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading as="h1" eyebrow="Campus Faith" title="New to Champaign-Urbana?" description="Moving here for school is a lot at once. Here is a simple way to find a church or campus ministry that fits." />
      <CampusNav current="/campus/new-to-champaign-urbana" />

      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4 rounded-[24px] border border-line bg-white p-6 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-900 font-semibold text-white" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h2 className="font-display text-2xl text-ink">{step.title}</h2>
              <p className="mt-2 leading-7 text-stone-700">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="rounded-[24px] border border-line bg-white p-6 shadow-card">
        <h2 className="font-display text-2xl text-ink">Good questions to ask</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-stone-700">
          {questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-[24px] bg-stone-50 p-6">
        <h2 className="font-display text-2xl text-ink">A healthy community</h2>
        <p className="mt-2 leading-7 text-stone-700">
          A good church or ministry is open about who leads it and what it believes, welcomes your questions, and respects your time, money, and schoolwork. You should never feel pressured to commit, give, or cut off friends and family. If
          something about a group listed here concerns you, please{" "}
          <Link href="/contact" className="underline">
            tell us
          </Link>
          .
        </p>
      </section>

      <p className="text-stone-700">
        International student or more comfortable in another language? Filter the{" "}
        <Link href="/directory" className="underline">
          directory
        </Link>{" "}
        by language, or look for churches marked “International students welcome”.
      </p>
    </div>
  );
}
