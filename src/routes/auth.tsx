import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import logo from "@/assets/adabah-logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in to ADABAH" },
      {
        name: "description",
        content: "Sign in to ADABAH to narrate your PDFs into downloadable audiobooks.",
      },
      { property: "og:title", content: "Sign in to ADABAH" },
      { property: "og:description", content: "Access your ADABAH audiobook library." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/c" });
  }, [session, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img alt="ADABAH" className="size-10" height={512} src={logo} width={512} />
          <h1 className="mt-4 text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your library"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your chats and audiobooks stay saved to your account.
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>
          <Button className="w-full" disabled={busy} type="submit">
            {mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <button
          className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          type="button"
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
