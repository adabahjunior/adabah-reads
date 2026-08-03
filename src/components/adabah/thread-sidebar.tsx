import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { LogOut, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createThread, deleteThread, type Thread } from "@/lib/adabah-db";
import { cn } from "@/lib/utils";
import logo from "@/assets/adabah-logo.png";

export function ThreadSidebar({
  threads,
  email,
  onChanged,
}: {
  threads: Thread[];
  email: string | null;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);

  const newChat = async () => {
    setCreating(true);
    try {
      const thread = await createThread();
      onChanged();
      await navigate({ to: "/c/$threadId", params: { threadId: thread.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a new chat.");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (threadId: string) => {
    try {
      await deleteThread(threadId);
      onChanged();
      if (params.threadId === threadId) await navigate({ to: "/c" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that chat.");
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        open ? "w-[264px]" : "w-[62px]",
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <Button
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setOpen((v) => !v)}
          size="icon-sm"
          variant="ghost"
        >
          {open ? (
            <PanelLeftClose className="size-4" aria-hidden />
          ) : (
            <PanelLeftOpen className="size-4" aria-hidden />
          )}
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        {open ? (
          <Link className="flex items-center gap-2" to="/">
            <img alt="" className="size-6" height={512} loading="lazy" src={logo} width={512} />
            <span className="font-display text-base font-semibold tracking-tight">ADABAH</span>
          </Link>
        ) : null}
      </div>

      <div className="px-3">
        <Button
          className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
          disabled={creating}
          onClick={() => void newChat()}
          size="sm"
          variant="secondary"
        >
          <MessageSquarePlus className="size-4" aria-hidden />
          {open ? <span className="ml-2">New chat</span> : null}
        </Button>
      </div>

      {open ? (
        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/50">
            Chats
          </p>
          {threads.length === 0 ? (
            <p className="px-2 text-sm text-sidebar-foreground/60">No chats yet.</p>
          ) : (
            threads.map((thread) => {
              const active = params.threadId === thread.id;
              return (
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                    active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                  )}
                  key={thread.id}
                >
                  <Link
                    className="min-w-0 flex-1 truncate px-2.5 py-2 text-sm"
                    params={{ threadId: thread.id }}
                    to="/c/$threadId"
                  >
                    {thread.title}
                  </Link>
                  <button
                    aria-label={`Delete ${thread.title}`}
                    className="rounded-md p-1.5 text-sidebar-foreground/50 opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    onClick={() => void remove(thread.id)}
                    type="button"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              );
            })
          )}
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      <div className="border-t border-sidebar-border p-3">
        {open ? (
          <p className="truncate pb-2 text-xs text-sidebar-foreground/60">{email}</p>
        ) : null}
        <Button
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => {
            void supabase.auth.signOut().then(() => navigate({ to: "/auth" }));
          }}
          size="sm"
          variant="ghost"
        >
          <LogOut className="size-4" aria-hidden />
          {open ? <span className="ml-2">Sign out</span> : null}
        </Button>
      </div>
    </aside>
  );
}
