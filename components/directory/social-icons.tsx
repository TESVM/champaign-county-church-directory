import Link from "next/link";
import { Facebook, Instagram, Youtube, Music2, MessageCircleMore } from "lucide-react";
import { ChurchRecord } from "@/lib/types";

const iconMap = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  x: MessageCircleMore,
  tiktok: Music2
} as const;

export function SocialIcons({ links }: { links: ChurchRecord["socialLinks"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = iconMap[link.platform];
        return (
          <Link
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-stone-600 hover:border-brand-700 hover:text-brand-900"
            aria-label={link.platform}
          >
            <Icon className="h-4 w-4" />
          </Link>
        );
      })}
    </div>
  );
}
