import type { IncomingMessage, ServerResponse } from "node:http";
import { orders } from "../../src/server/api-v1-handlers";
import { sendFetchResponse, toFetchRequest } from "../../src/server/node-api-adapter";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await sendFetchResponse(await orders(await toFetchRequest(request)), response);
}
