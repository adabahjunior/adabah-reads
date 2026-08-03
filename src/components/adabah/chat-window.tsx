import { useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { FileText, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudiobookCard, rememberLocalAudio } from "@/components/adabah/audiobook-card";
import logo from "@/assets/adabah-logo.png";
import { extractPdfText } from "@/lib/pdf-extract";
import { chunkForNarration, estimateDurationSeconds, narrateToMp3 } from "@/lib/audiobook";
import {
  insertAudiobook,
  renameThread,
  saveMessage,
  uploadAudiobookFile,
  type AudiobookMeta,
} from "@/lib/adabah-db";

const VOICES = [
  { id: "alloy", label: "Alloy — balanced narrator" },
  { id: "sage", label: "Sage — calm & bookish" },
  { id: "nova", label: "Nova — bright & lively" },
  { id: "onyx", label: "Onyx — deep & cinematic" },
  { id: "fable", label: "Fable — storyteller" },
];

type Stage =
  | { kind: "idle" }
  | { kind: "reading"; page: number; total: number; file: string }
  | { kind: "narrating"; done: number; total: number; file: string }
  | { kind: "saving"; file: string };

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function audiobookOf(message: UIMessage): AudiobookMeta | null {
  for (const part of message.parts) {
    if (part.type === "data-audiobook") {
      return (part as { data: AudiobookMeta }).data;
    }
  }
  return null;
}

export function ChatWindow({
  threadId,
  initialMessages,
  onThreadsChanged,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onThreadsChanged: () => void;
}) {
  const [voice, setVoice] = useState("alloy");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleSetRef = useRef(initialMessages.length > 0);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { messages, setMessages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      void saveMessage(threadId, message).catch((err: unknown) => {
        console.error(err);
        toast.error("Reply could not be saved to your history.");
      });
      onThreadsChanged();
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "ADABAH could not answer just now.");
    },
  });

  const busy = status === "submitted" || status === "streaming" || stage.kind !== "idle";

  const maybeTitle = async (title: string) => {
    if (titleSetRef.current) return;
    titleSetRef.current = true;
    try {
      await renameThread(threadId, title);
      onThreadsChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const appendLocal = async (message: UIMessage) => {
    setMessages((prev) => [...prev, message]);
    await saveMessage(threadId, message);
  };

  const handlePdf = async (file: File) => {
    const label = file.name.replace(/\.pdf$/i, "");
    try {
      await appendLocal({
        id: `msg_${crypto.randomUUID()}`,
        role: "user",
        parts: [{ type: "text", text: `Turn **${file.name}** into an audiobook.` }],
      });
      await maybeTitle(label);
      onThreadsChanged();

      setStage({ kind: "reading", page: 0, total: 0, file: file.name });
      const extracted = await extractPdfText(file, (page, total) =>
        setStage({ kind: "reading", page, total, file: file.name }),
      );

      if (extracted.charCount < 20) {
        throw new Error(
          "No selectable text found in this PDF — it looks like a scan, so there is nothing to narrate yet.",
        );
      }

      const chunks = chunkForNarration(extracted.text);
      setStage({ kind: "narrating", done: 0, total: chunks.length, file: file.name });
      const blob = await narrateToMp3(chunks, {
        voice,
        onProgress: ({ done, total }) =>
          setStage({ kind: "narrating", done, total, file: file.name }),
      });

      setStage({ kind: "saving", file: file.name });
      const audiobookId = crypto.randomUUID();
      rememberLocalAudio(audiobookId, blob);
      const audioPath = await uploadAudiobookFile(audiobookId, blob);
      const book = await insertAudiobook({
        id: audiobookId,
        threadId,
        title: label,
        sourceFilename: file.name,
        voice,
        pageCount: extracted.pageCount,
        charCount: extracted.charCount,
        chunkCount: chunks.length,
        durationSeconds: estimateDurationSeconds(extracted.charCount),
        bytes: blob.size,
        audioPath,
      });

      await appendLocal({
        id: `msg_${crypto.randomUUID()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `Your audiobook is ready. I narrated all ${extracted.pageCount} page${
              extracted.pageCount === 1 ? "" : "s"
            } of **${file.name}** in ${chunks.length} segments. Play it below or download the MP3.`,
          },
          { type: "data-audiobook", data: book } as unknown as UIMessage["parts"][number],
        ],
      });
      onThreadsChanged();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      await appendLocal({
        id: `msg_${crypto.randomUUID()}`,
        role: "assistant",
        parts: [{ type: "text", text: `I couldn't finish that audiobook. ${message}` }],
      }).catch(() => undefined);
    } finally {
      setStage({ kind: "idle" });
      textareaRef.current?.focus();
    }
  };

  const onFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please attach a PDF file.");
      return;
    }
    void handlePdf(file);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="border-none"
              description="Attach a PDF of any length and I'll narrate the whole thing into one MP3 — or just ask me anything."
              icon={
                <img alt="" className="size-12" height={512} loading="lazy" src={logo} width={512} />
              }
              title="What should I read to you?"
            />
          ) : (
            messages.map((message) => {
              const body = textOf(message);
              const book = audiobookOf(message);
              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent
                    className={
                      message.role === "user"
                        ? "bg-chat-user text-chat-user-foreground"
                        : "bg-transparent p-0 text-foreground"
                    }
                  >
                    {body ? <MessageResponse>{body}</MessageResponse> : null}
                    {book ? <AudiobookCard book={book} /> : null}
                  </MessageContent>
                </Message>
              );
            })
          )}

          {status === "submitted" && stage.kind === "idle" ? (
            <Shimmer className="px-1 text-sm">Thinking…</Shimmer>
          ) : null}

          {stage.kind !== "idle" ? (
            <div className="mt-2 flex w-full max-w-xl items-center gap-3 rounded-2xl border bg-card p-4">
              <Loader2 className="size-4 shrink-0 animate-spin text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{stage.file}</p>
                <p className="text-xs text-muted-foreground">
                  {stage.kind === "reading"
                    ? stage.total
                      ? `Reading pages… ${stage.page}/${stage.total}`
                      : "Opening PDF…"
                    : stage.kind === "narrating"
                      ? `Narrating… segment ${stage.done}/${stage.total}`
                      : "Saving your MP3…"}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width:
                        stage.kind === "reading" && stage.total
                          ? `${Math.round((stage.page / stage.total) * 30)}%`
                          : stage.kind === "narrating"
                            ? `${30 + Math.round((stage.done / Math.max(1, stage.total)) * 65)}%`
                            : "97%",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-destructive">{error.message}</p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <PromptInput
          onSubmit={(message) => {
            const text = message.text?.trim();
            if (!text || busy) return;
            const userMessage: UIMessage = {
              id: `msg_${crypto.randomUUID()}`,
              role: "user",
              parts: [{ type: "text", text }],
            };
            void saveMessage(threadId, userMessage).catch((err: unknown) => console.error(err));
            void maybeTitle(text.slice(0, 60));
            void sendMessage(userMessage);
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
        >
          <PromptInputTextarea
            autoFocus
            placeholder="Ask ADABAH anything, or attach a PDF to narrate…"
            ref={textareaRef}
          />
          <PromptInputFooter>
            <PromptInputTools>
              <input
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={onFilePicked}
                ref={fileInputRef}
                type="file"
              />
              <Button
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Paperclip className="mr-2 size-4" aria-hidden />
                PDF
              </Button>
              <Select onValueChange={setVoice} value={voice}>
                <SelectTrigger className="h-8 w-[190px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PromptInputTools>
            <PromptInputSubmit disabled={busy} status={status} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <FileText className="size-3" aria-hidden />
          Text-based PDFs of any page count. Long books take a few minutes.
        </p>
      </div>
    </div>
  );
}
