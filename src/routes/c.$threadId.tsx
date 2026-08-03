import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import { ChatWindow } from "@/components/adabah/chat-window";
import { loadThreadMessages } from "@/lib/adabah-db";

export const Route = createFileRoute("/c/$threadId")({
  ssr: false,
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = useParams({ from: "/c/$threadId" });
  const [messages, setMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    let active = true;
    setMessages(null);
    loadThreadMessages(threadId)
      .then((loaded) => active && setMessages(loaded))
      .catch((err: unknown) => {
        console.error(err);
        toast.error("Could not load this chat.");
        if (active) setMessages([]);
      });
    return () => {
      active = false;
    };
  }, [threadId]);

  if (!messages) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <ChatWindow
      initialMessages={messages}
      key={threadId}
      onThreadsChanged={() => window.dispatchEvent(new Event("adabah:threads"))}
      threadId={threadId}
    />
  );
}
