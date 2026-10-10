import { Button } from "@/components/ui/button";

/**
 * Sign-out control.
 *
 * `signOut()` existed in lib/auth.ts with no caller and no UI, so once signed in
 * there was no way out of the product. On a shared church-office or library
 * computer the session otherwise persisted for its full seven-day lifetime.
 */
export function SignOutButton({
  returnPath = "/",
  variant = "secondary"
}: {
  returnPath?: string;
  variant?: "default" | "secondary" | "ghost";
}) {
  return (
    <form action="/api/auth/logout" method="post">
      <input type="hidden" name="returnPath" value={returnPath} />
      <Button type="submit" variant={variant}>
        Sign out
      </Button>
    </form>
  );
}
