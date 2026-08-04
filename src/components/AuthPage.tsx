import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Package } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { BundleLoader } from "@/components/BundleLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function AuthNavbar() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/auth" className="flex items-center gap-2.5">
          <div className="gold-gradient-static flex h-8 w-8 items-center justify-center rounded-lg">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            Bundle<span className="gold-text">Mart</span>
          </span>
        </Link>
        <span className="hidden text-xs tracking-wider text-muted-foreground uppercase sm:inline">
          Reseller Gateway
        </span>
      </div>
    </nav>
  );
}

function AuthFooter() {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <p className="text-xs text-muted-foreground">
          BundleMart Ghana — MTN · Telecel · AirtelTigo data for resellers
        </p>
      </div>
    </footer>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.7H12z"
      />
      <path fill="#34A853" d="M3.2 7.1 6.1 9.3C6.9 7.3 9.2 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.8 12 2.8 8.2 2.8 4.9 4.9 3.2 7.1z" />
      <path fill="#4A90E2" d="M12 21.2c2.4 0 4.5-.8 6-2.2l-2.8-2.2c-.8.5-1.8.9-3.2.9-3.6 0-4.9-2.4-5.1-3.6L3.1 16.8C4.8 19.2 8.1 21.2 12 21.2z" />
      <path fill="#FBBC05" d="M21.1 11.9c0-.6-.1-1.1-.2-1.7H12v3.6h5.1c-.2.9-.8 2-1.9 2.7l2.8 2.2c1.7-1.5 2.1-3.9 2.1-6.8z" />
    </svg>
  );
}

export function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const { signIn, signUp, isAuthenticated, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (hasRole("admin")) void navigate({ to: "/admin" });
    else void navigate({ to: "/dashboard" });
  }, [loading, isAuthenticated, hasRole, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!fullName.trim()) throw new Error("Enter your full name.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        await signUp(email.trim(), password, { full_name: fullName.trim() });
        toast.success("Account created — welcome to BundleMart!");
        void navigate({ to: "/dashboard" });
      } else {
        const roles = await signIn(email.trim(), password);
        toast.success("Welcome back!");
        if (roles.includes("admin")) void navigate({ to: "/admin" });
        else void navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    setOauthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Google sign-in is not enabled yet. Use email instead.",
      );
      setOauthBusy(false);
    }
  };

  if (loading) {
    return <BundleLoader fullScreen label="Authenticating" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />

      <div className="relative flex min-h-[80vh] items-center justify-center px-4 pt-24 pb-16">
        <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-15" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-radial-glow opacity-30" />

        <GlassCard variant="strong" className="relative w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <div className="mb-4 flex items-center justify-center gap-2.5">
              <div className="gold-gradient-static flex h-10 w-10 items-center justify-center rounded-xl">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-[0.08em] text-foreground uppercase">
                Bundle<span className="gold-text">Mart</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === "signup"
                ? "Create your account to access your dashboard"
                : "Sign in to your reseller dashboard"}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-muted/50 p-1">
            {(["signin", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-semibold transition-all",
                  mode === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" ? (
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-xs font-medium tracking-wider text-muted-foreground uppercase"
                >
                  Full Name
                </label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kwame Asante"
                  className="h-11"
                  required
                />
              </div>
            ) : null}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium tracking-wider text-muted-foreground uppercase"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium tracking-wider text-muted-foreground uppercase"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" ? (
              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1.5 block text-xs font-medium tracking-wider text-muted-foreground uppercase"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11"
                  required
                  minLength={6}
                />
              </div>
            ) : null}

            <Button
              variant="hero"
              size="lg"
              className="mt-2 h-11 w-full"
              type="submit"
              disabled={busy || oauthBusy}
            >
              {busy ? (
                <span className="bm-loader-inline" aria-hidden />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">Or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full"
            disabled={busy || oauthBusy}
            onClick={() => void continueWithGoogle()}
          >
            <GoogleIcon className="h-4 w-4" />
            {oauthBusy ? "Connecting Google…" : "Continue with Google"}
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign In
                </button>
              </>
            )}
          </p>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/80">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </GlassCard>
      </div>

      <AuthFooter />
    </div>
  );
}
