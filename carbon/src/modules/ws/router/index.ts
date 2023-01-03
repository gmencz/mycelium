import { Context } from "@/bindings";
import { App } from "@/modules/apps";
import { ClientMessage } from "../message";
import { ClientToServerOpCode, CloseCode } from "../protocol";
import { ClientPublish, clientPublish } from "./publish";
import { ClientSubscribe, clientSubscribe } from "./subscribe";
import { ClientUnsubscribe, clientUnsubscribe } from "./unsubscribe";

export const routeClientMessage = (
  message: ClientMessage,
  server: WebSocket,
  app: App,
  c: Context,
  channels: Map<string, WebSocket>,
  intervals: Map<string, number>
) => {
  switch (message.op) {
    case ClientToServerOpCode.Subscribe: {
      clientSubscribe(
        message.d as ClientSubscribe,
        server,
        app,
        c,
        channels,
        intervals
      );

      break;
    }

    case ClientToServerOpCode.Unsubscribe: {
      clientUnsubscribe(
        message.d as ClientUnsubscribe,
        server,
        channels,
        intervals
      );

      break;
    }

    case ClientToServerOpCode.Publish: {
      clientPublish(message.d as ClientPublish);
      break;
    }

    default: {
      server.close(CloseCode.INVALID_MESSAGE_OP);
    }
  }
};
