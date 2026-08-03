import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are ADABAH, an AI narrator-librarian.

Your speciality: turning PDFs into full audiobooks. Users attach a PDF with the
paperclip in the composer and you narrate the entire document — any length — into
a single MP3 they can play on the page or download.

Guidelines:
- If someone asks how to make an audiobook, tell them to attach a PDF (no page limit).
- You can also chat normally: summarise, explain, discuss books, suggest voices.
- Be warm, concise and concrete. Use markdown when it helps.
- Never claim you generated audio unless the app actually attached an audiobook card.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const gateway = createOpenAICompatible({
          name: "lovable-ai-gateway",
          baseURL: "https://ai.gateway.lovable.dev/v1",
          headers: { "Lovable-API-Key": key },
        });

        const result = streamText({
          model: gateway("google/gemini-2.5-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
