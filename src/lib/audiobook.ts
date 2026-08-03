/**
 * Turns extracted PDF text into a single downloadable MP3.
 *
 * Works for any document size: the text is split into TTS-sized chunks and
 * synthesised in small ordered batches, then the MP3 frames are concatenated.
 */

const MAX_CHUNK_CHARS = 1800;
const CONCURRENCY = 3;
const MAX_RETRIES = 4;

export type NarrationProgress = {
  done: number;
  total: number;
};

export function chunkForNarration(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const clean = text.replace(/\s+\n/g, "\n").trim();
  if (!clean) return [];

  const sentences = clean.match(/[^.!?\n]+[.!?]*\s*/g) ?? [clean];
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      flush();
      const words = sentence.match(/\S+/g) ?? [];
      let piece = "";
      for (const word of words) {
        if ((piece + " " + word).trim().length > maxChars) {
          if (piece.trim()) chunks.push(piece.trim());
          piece = word;
        } else {
          piece = (piece + " " + word).trim();
        }
      }
      if (piece.trim()) chunks.push(piece.trim());
      continue;
    }
    if (current.length + sentence.length > maxChars) flush();
    current += sentence;
  }
  flush();

  return chunks;
}

async function synthesizeChunk(text: string, voice: string, signal?: AbortSignal) {
  let lastError = "";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      ...(signal ? { signal } : {}),
    });

    if (response.ok) return new Uint8Array(await response.arrayBuffer());

    lastError = await response.text().catch(() => "");
    if (response.status === 402) {
      throw new Error("AI credits exhausted — top up your workspace to keep narrating.");
    }
    if (response.status !== 429 && response.status < 500) {
      throw new Error(lastError || `Narration failed (${response.status})`);
    }
    await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
  }
  throw new Error(lastError || "Narration failed after several retries");
}

export async function narrateToMp3(
  chunks: string[],
  options: {
    voice?: string;
    signal?: AbortSignal;
    onProgress?: (progress: NarrationProgress) => void;
  } = {},
): Promise<Blob> {
  const { voice = "alloy", signal, onProgress } = options;
  const parts = new Array<Uint8Array>(chunks.length);
  let done = 0;
  let cursor = 0;

  const worker = async () => {
    for (;;) {
      const index = cursor++;
      if (index >= chunks.length) return;
      parts[index] = await synthesizeChunk(chunks[index]!, voice, signal);
      done += 1;
      onProgress?.({ done, total: chunks.length });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, () => worker()),
  );

  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}

export function estimateDurationSeconds(charCount: number) {
  // ~14.5 characters per second at normal narration pace.
  return Math.round(charCount / 14.5);
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(rest).padStart(2, "0")}s`;
  return `${rest}s`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
