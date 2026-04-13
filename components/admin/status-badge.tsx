import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const styles =
    status === "APPROVED"
      ? "bg-sage/15 text-sage"
      : status === "REJECTED"
        ? "bg-rose/15 text-rose"
        : "bg-brand-50 text-brand-900";

  return <Badge className={styles}>{status}</Badge>;
}
