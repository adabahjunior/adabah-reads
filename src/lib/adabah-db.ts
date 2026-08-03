import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";

export type Thread = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AudiobookMeta = {
  id: string;
  title: string;
  source_filename: string | null;
  voice: string;
  page_count: number;
  char_count: number;
  chunk_count: number;
  duration_seconds: number | null;
  bytes: number | null;
  audio_path: string | null;
};

type MessageRow = {
  id: string;
  client_id: string | null;
  role: "user" | "assistant" | "system";
  parts: unknown;
  created_at: string;
};

export async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You need to sign in first.");
  return data.user.id;
}

export async function listThreads(): Promise<Thread[]> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Thread[];
}

export async function createThread(title = "New chat"): Promise<Thread> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("threads")
    .insert({ user_id: userId, title })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as Thread;
}

export async function renameThread(threadId: string, title: string) {
  const { error } = await supabase
    .from("threads")
    .update({ title: title.slice(0, 120) })
    .eq("id", threadId);
  if (error) throw error;
}

export async function touchThread(threadId: string) {
  const { error } = await supabase
    .from("threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
  if (error) throw error;
}

export async function deleteThread(threadId: string) {
  const { error } = await supabase.from("threads").delete().eq("id", threadId);
  if (error) throw error;
}

export async function loadThreadMessages(threadId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, client_id, role, parts, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.client_id ?? row.id,
    role: row.role,
    parts: (Array.isArray(row.parts) ? row.parts : []) as UIMessage["parts"],
  }));
}

export async function saveMessage(threadId: string, message: UIMessage) {
  const userId = await requireUserId();
  const { error } = await supabase.from("messages").upsert(
    {
      thread_id: threadId,
      user_id: userId,
      client_id: message.id,
      role: message.role,
      parts: message.parts,
    },
    { onConflict: "thread_id,client_id" },
  );
  if (error) throw error;
  await touchThread(threadId);
}

export async function insertAudiobook(input: {
  id: string;
  threadId: string;
  title: string;
  sourceFilename: string;
  voice: string;
  pageCount: number;
  charCount: number;
  chunkCount: number;
  durationSeconds: number;
  bytes: number;
  audioPath: string;
}): Promise<AudiobookMeta> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("audiobooks")
    .insert({
      id: input.id,
      user_id: userId,
      thread_id: input.threadId,
      title: input.title,
      source_filename: input.sourceFilename,
      voice: input.voice,
      page_count: input.pageCount,
      char_count: input.charCount,
      chunk_count: input.chunkCount,
      duration_seconds: input.durationSeconds,
      bytes: input.bytes,
      audio_path: input.audioPath,
      status: "ready",
    })
    .select(
      "id, title, source_filename, voice, page_count, char_count, chunk_count, duration_seconds, bytes, audio_path",
    )
    .single();
  if (error) throw error;
  return data as AudiobookMeta;
}

export async function uploadAudiobookFile(audiobookId: string, blob: Blob) {
  const userId = await requireUserId();
  const path = `${userId}/${audiobookId}.mp3`;
  const { error } = await supabase.storage
    .from("audiobooks")
    .upload(path, blob, { contentType: "audio/mpeg", upsert: true });
  if (error) throw error;
  return path;
}

export async function getAudiobookUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("audiobooks")
    .createSignedUrl(path, 60 * 60 * 12);
  if (error) throw error;
  return data.signedUrl;
}
