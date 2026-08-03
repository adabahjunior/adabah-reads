import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/audio/speech";
const MODEL = "openai/gpt-4o-mini-tts";
const VOICES = new Set(["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]);

type TtsBody = { text?: unknown; voice?: unknown; instructions?: unknown };

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: TtsBody;
        try {
          body = (await request.json()) as TtsBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) return new Response("text is required", { status: 400 });
        if (text.length > 3500) return new Response("text chunk too long", { status: 400 });

        const voice =
          typeof body.voice === "string" && VOICES.has(body.voice) ? body.voice : "alloy";
        const instructions =
          typeof body.instructions === "string" && body.instructions.length < 500
            ? body.instructions
            : "Read aloud as a warm, clear, professional audiobook narrator. Steady pace, natural phrasing.";

        const upstream = await fetch(GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            input: text,
            voice,
            instructions,
            response_format: "mp3",
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          console.error(`TTS upstream failed [${upstream.status}]: ${detail}`);
          return new Response(detail || "Narration failed", { status: upstream.status });
        }

        const audio = await upstream.arrayBuffer();
        return new Response(audio, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
