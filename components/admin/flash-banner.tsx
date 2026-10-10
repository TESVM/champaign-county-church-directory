const MESSAGES: Record<string, string> = {
  "claim-approved": "Claim approved. The applicant now owns the listing and was emailed sign-in instructions.",
  "claim-more_info": "Request for more information sent to the applicant.",
  "claim-denied": "Claim declined and the applicant notified.",
  "submission-approved": "Submission approved and published.",
  "submission-rejected": "Submission declined and the submitter notified.",
  "message-resolved": "Message marked answered.",
  "message-dismissed": "Message dismissed.",
  "correction-resolved": "Correction marked fixed.",
  "correction-dismissed": "Correction dismissed.",
  "change-approved": "Change applied to the listing.",
  "change-rejected": "Proposal rejected; it will not be suggested again.",
  "resource-approved": "Program published.",
  "resource-rejected": "Program rejected with your note."
};

/** Confirms a queue decision after the decided item has left the list. */
export function FlashBanner({ code }: { code?: string }) {
  const message = code ? MESSAGES[code] : undefined;
  if (!message) return null;
  return (
    <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
      {message}
    </p>
  );
}
