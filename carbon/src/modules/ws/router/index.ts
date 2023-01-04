import { Context } from "@/bindings";
import { App } from "@/modules/apps";
import { ClientMessage } from "../message";
import { ClientToServerOpCode, CloseCode } from "../protocol";
import { clientPing } from "./ping";
import { ClientPublish, clientPublish } from "./publish";
import { ClientSubscribe, clientSubscribe } from "./subscribe";
import { ClientUnsubscribe, clientUnsubscribe } from "./unsubscribe";

export const routeClientMessage = (
  message: ClientMessage,
  server: WebSocket,
  app: App,
  c: Context,
  channels: Map<string, WebSocket>
) => {
  switch (message.op) {
    case ClientToServerOpCode.Subscribe: {
      clientSubscribe(message.d as ClientSubscribe, server, app, c, channels);

      break;
    }

    case ClientToServerOpCode.Unsubscribe: {
      clientUnsubscribe(message.d as ClientUnsubscribe, server, channels);

      break;
    }

    case ClientToServerOpCode.Publish: {
      clientPublish(message.d as ClientPublish, server, channels);
      break;
    }

    case ClientToServerOpCode.Ping: {
      clientPing(server, channels);
      break;
    }

    default: {
      server.close(CloseCode.INVALID_MESSAGE_OP);
    }
  }
};
