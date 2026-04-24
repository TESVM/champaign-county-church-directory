"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
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

      const email = formData.get("email");
      const password = formData.get("password");
      const destination = nextPath === "/admin" ? "/admin" : "/dashboard";

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: destination
      });

      if (!result || result.error) {
        setLoginError("invalid");
        return;
      }

      router.push(result.url ?? destination);
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
