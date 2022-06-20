import type { FastifyInstance } from "fastify";
import type { Codec, NatsConnection } from "nats";
import type { MyceliumWebSocket } from "../types";

import { handleSubscribe } from "../websocket/handlers/handle-subscribe";
import { handleUnsubscribe } from "../websocket/handlers/handle-unsubscribe";
import { handleMessage } from "../websocket/handlers/handle-message";
import { handleClose } from "../websocket/handlers/handle-close";
import { authenticateWebSocket } from "../websocket/connection";

interface WebSocketRoute {
  Querystring: { key?: string; token?: string };
}

interface RouteContext {
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
  channelsWebSockets: Map<string, MyceliumWebSocket[]>;
  nc: NatsConnection;
  sc: Codec<unknown>;
}

export async function routes(
  server: FastifyInstance,
  { webSocketsChannels, channelsWebSockets, nc, sc }: RouteContext
) {
  server.get<WebSocketRoute>("/", { websocket: true }, async (conn, req) => {
    const webSocket = conn.socket as unknown as MyceliumWebSocket;
    const closeError = await authenticateWebSocket({
      webSocket,
      webSocketsChannels,
      key: req.query.key,
      token: req.query.token,
    });

    if (closeError) {
      const { code, message } = closeError;
      return webSocket.close(code, message);
    }

    webSocket.on("close", async () => {
      await handleClose({ channelsWebSockets, webSocket, webSocketsChannels });
    });

    webSocket.on("message", async (message) => {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case "ping": {
          return webSocket.send(
            JSON.stringify({
              type: "pong",
            })
          );
        }

        case "subscribe": {
          return handleSubscribe({
            webSocket,
            webSocketsChannels,
            channelsWebSockets,
            data,
          });
        }

        case "unsubscribe": {
          return handleUnsubscribe({
            webSocket,
            webSocketsChannels,
            channelsWebSockets,
            data,
          });
        }

        case "message": {
          return handleMessage({ webSocket, webSocketsChannels, data, nc, sc });
        }
      }
    });
  });
}
