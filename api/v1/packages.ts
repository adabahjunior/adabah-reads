import type { IncomingMessage, ServerResponse } from "node:http";
import { packages } from "../../src/server/api-v1-handlers";
import { sendFetchResponse, toFetchRequest } from "../../src/server/node-api-adapter";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await sendFetchResponse(await packages(await toFetchRequest(request)), response);
}
