"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LoginFormProps = {
  error?: string;
  nextPath?: string;
};

export function LoginForm({ error, nextPath }: LoginFormProps) {
  const router = useRouter();
  const [loginError, setLoginError] = useState(error);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setLoginError(undefined);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          nextPath
        })
      });

      if (!response.ok) {
        setLoginError("invalid");
        return;
      }

      const result = (await response.json()) as { ok?: boolean; url?: string };

      if (!result.ok) {
        setLoginError("invalid");
        return;
      }

      router.push(result.url ?? (nextPath === "/admin" ? "/admin" : "/dashboard"));
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <Input name="email" type="email" placeholder="Email address" required />
      <Input name="password" type="password" placeholder="Password" required />
      {loginError ? (
        <div className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-rose">
          Sign-in failed. Check the email and password, or start with a claim request if your church has not been verified yet.
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
