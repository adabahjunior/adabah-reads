import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Music4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAudiobookUrl, type AudiobookMeta } from "@/lib/adabah-db";
import { formatBytes, formatDuration } from "@/lib/audiobook";

/** Blob URLs for audiobooks generated in this browser session (instant playback). */
const localBlobUrls = new Map<string, string>();

export function rememberLocalAudio(audiobookId: string, blob: Blob) {
  localBlobUrls.set(audiobookId, URL.createObjectURL(blob));
}

export function AudiobookCard({ book }: { book: AudiobookMeta }) {
  const localUrl = localBlobUrls.get(book.id) ?? null;
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const src = localUrl ?? remoteUrl;

  useEffect(() => {
    if (localUrl || remoteUrl || !book.audio_path) return;
    let active = true;
    getAudiobookUrl(book.audio_path)
      .then((url) => active && setRemoteUrl(url))
      .catch((err: unknown) =>
        active ? setError(err instanceof Error ? err.message : "Could not load audio") : undefined,
      );
    return () => {
      active = false;
    };
  }, [book.audio_path, localUrl, remoteUrl]);

  const fileName = useMemo(
    () => `${book.title.replace(/[^\w\s.-]/g, "").trim().slice(0, 60) || "audiobook"}.mp3`,
    [book.title],
  );

  return (
    <div className="mt-3 w-full max-w-xl overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3 border-b p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
          <Music4 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">{book.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {book.page_count} pages · {book.chunk_count} narrated segments ·{" "}
            {formatDuration(book.duration_seconds ?? 0)}
            {book.bytes ? ` · ${formatBytes(book.bytes)}` : ""} · voice {book.voice}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {src ? (
          <audio className="w-full" controls preload="metadata" src={src} />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Preparing playback…
          </p>
        )}

        <Button asChild disabled={!src} size="sm" variant="secondary">
          <a download={fileName} href={src ?? "#"}>
            <Download className="mr-2 size-4" aria-hidden /> Download MP3
          </a>
        </Button>
      </div>
    </div>
  );
}
