import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createThread, listThreads } from "@/lib/adabah-db";

export const Route = createFileRoute("/c/")({
  ssr: false,
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const threads = await listThreads();
        const thread = threads[0] ?? (await createThread());
        await navigate({ to: "/c/$threadId", params: { threadId: thread.id }, replace: true });
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Could not open a chat.");
      }
    })();
  }, [navigate]);

  return (
    <div className="grid h-full place-items-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
    </div>
  );
}
