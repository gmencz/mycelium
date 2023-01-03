import { Context } from "@/bindings";
import { z } from "zod";
import { App } from "../apps";
import { ClientToServerOpCode, CloseCode } from "./protocol";
import { routeClientMessage } from "./router";
import { clientPublishSchema } from "./router/publish";
import { clientSubscribeSchema } from "./router/subscribe";
import { clientUnsubscribeSchema } from "./router/unsubscribe";

const clientMessageSchema = z.object({
  op: z.nativeEnum(ClientToServerOpCode),
  d: z.union([
    clientPublishSchema,
    clientSubscribeSchema,
    clientUnsubscribeSchema,
  ]),
});

export type ClientMessage = z.TypeOf<typeof clientMessageSchema>;

export const handleClientMessage = (
  event: MessageEvent,
  server: WebSocket,
  app: App,
  c: Context,
  channels: Map<string, WebSocket>,
  intervals: Map<string, number>
) => {
  let message;
  try {
    message = clientMessageSchema.parse(JSON.parse(event.data as string));
  } catch (error) {
    return server.close(CloseCode.INVALID_MESSAGE);
  }

  routeClientMessage(message, server, app, c, channels, intervals);
};
