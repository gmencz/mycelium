import type { FastifyInstance } from "fastify";
import type { AddressInfo } from "net";
import type { WebSocket } from "ws";
import { db } from "./db";

export async function getWebSocketURL(fastify: FastifyInstance) {
  const address = fastify.server.address() as AddressInfo;
  const apiKey = await db.apiKey.findFirst();
  return `ws://localhost:${address.port}/ws?key=${apiKey?.id}`;
}
