import { Router } from "itty-router";
import { ZodError } from "zod";
import { uuid } from "@cfworker/uuid";
import { HelloMessage } from "./api/messages/hello";
import { parseMessage } from "./api/messages/parse";
import {
  MyceliumCloseCode,
  MyceliumCloseMessage,
  MyceliumOp
} from "./api/protocol";
import { HEARTBEAT_INTERVAL } from "./api/constants";
import { handlePublishMessage } from "./api/messages/handlers/publish";
import { handleHeartbeatMessage } from "./api/messages/handlers/heartbeat";

interface Client {
  id: string;
  webSocket: WebSocket;
}

/**
 * Data center instance which Holds the clients connected to the pub-sub.
 */
class Bucket implements DurableObject {
  private id: DurableObjectId;
  private clients: Client[];
  private router: Router<Request>;

  constructor(state: DurableObjectState) {
    this.id = state.id;
    this.clients = [];
    this.router = Router()
      .get("/", this.handleClient)
      .all("*", () => new Response("Not found", { status: 404 }));
  }

  private handleClientSession = (webSocket: WebSocket) => {
    webSocket.accept();
    const client: Client = {
      id: uuid(),
      webSocket
    };

    this.clients.push(client);

    webSocket.send(
      new HelloMessage({
        clientId: client.id,
        heartbeatInterval: HEARTBEAT_INTERVAL
      }).toJSON()
    );

    webSocket.addEventListener("message", message => {
      let payload;
      try {
        payload = parseMessage(JSON.parse(message.data));
      } catch (error) {
        if (error instanceof ZodError) {
          return webSocket.close(
            MyceliumCloseCode.InvalidPayload,
            MyceliumCloseMessage.InvalidPayload
          );
        }

        return webSocket.close(
          MyceliumCloseCode.UnknownError,
          MyceliumCloseMessage.UnknownError
        );
      }

      const { op, d } = payload;
      switch (op) {
        case MyceliumOp.Heartbeat:
          try {
            return handleHeartbeatMessage(client);
          } catch (error) {
            return webSocket.close(
              MyceliumCloseCode.UnknownError,
              MyceliumCloseMessage.UnknownError
            );
          }

        case MyceliumOp.Publish:
          try {
            return handlePublishMessage(d, client, this.clients);
          } catch (error) {
            return webSocket.close(
              MyceliumCloseCode.UnknownError,
              MyceliumCloseMessage.UnknownError
            );
          }

        default:
          return webSocket.close(
            MyceliumCloseCode.UnknownOpcode,
            MyceliumCloseMessage.UnknownOpcode
          );
      }
    });

    const errorOrCloseHandler = () => {
      this.clients = this.clients.filter(
        client => client.webSocket !== webSocket
      );
    };

    webSocket.addEventListener("error", errorOrCloseHandler);
    webSocket.addEventListener("close", errorOrCloseHandler);
  };

  private handleClient = () => {
    const [client, server]: WebSocket[] = Object.values(new WebSocketPair());
    this.handleClientSession(server);
    return new Response(null, { status: 101, webSocket: client });
  };

  fetch = async (request: Request) => await this.router.handle(request);
}

export { Bucket, Client };
