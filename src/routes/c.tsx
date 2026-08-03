import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ThreadSidebar } from "@/components/adabah/thread-sidebar";
import { useSession } from "@/hooks/use-session";
import { listThreads, type Thread } from "@/lib/adabah-db";

export const Route = createFileRoute("/c")({
  ssr: false,
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const refresh = useCallback(() => {
    if (!user) return;
    listThreads()
      .then(setThreads)
      .catch((err: unknown) => {
        console.error(err);
        toast.error("Could not load your chat history.");
      });
  }, [user]);

  useEffect(() => {
    refresh();
    window.addEventListener("adabah:threads", refresh);
    return () => window.removeEventListener("adabah:threads", refresh);
  }, [refresh]);


  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ThreadSidebar email={user.email ?? null} onChanged={refresh} threads={threads} />
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
