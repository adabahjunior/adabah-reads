import type { IncomingMessage, ServerResponse } from "node:http";

export async function toFetchRequest(request: IncomingMessage): Promise<Request> {
  const protocol = request.headers["x-forwarded-proto"] ?? "http";
  const host = request.headers.host ?? "localhost:8080";
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          request.on("data", (chunk: Buffer) => chunks.push(chunk));
          request.on("end", () => resolve(Buffer.concat(chunks)));
          request.on("error", reject);
        });
  const init: RequestInit = {
    method: request.method ?? "GET",
    headers: request.headers as HeadersInit,
  };
  if (body) {
    const bytes = new Uint8Array(body.byteLength);
    bytes.set(body);
    init.body = bytes.buffer;
  }
  return new Request(`${protocol}://${host}${request.url ?? "/"}`, init);
}

export async function sendFetchResponse(response: Response, target: ServerResponse): Promise<void> {
  target.statusCode = response.status;
  response.headers.forEach((value, name) => target.setHeader(name, value));
  target.end(Buffer.from(await response.arrayBuffer()));
}
