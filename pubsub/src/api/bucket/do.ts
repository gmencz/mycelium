import { Router } from "itty-router";
import { ZodError } from "zod";
import { uuid } from "@cfworker/uuid";
import { HelloMessage } from "./messages/hello";
import { parseMessage } from "./messages/parse";
import {
  MyceliumCloseCode,
  MyceliumCloseMessage,
  MyceliumOp
} from "./protocol";
import { HEARTBEAT_INTERVAL } from "./constants";
import { handlePublishMessage } from "./messages/handlers/publish";
import { handleHeartbeatMessage } from "./messages/handlers/heartbeat";
import { BucketCoordinatorOp } from "../bucket-coordinator/protocol";

interface Client {
  id: string;
  webSocket: WebSocket;
}

interface BucketInfo {
  name: string;
}

/**
 * Data center instance which Holds the clients connected to the pub-sub.
 */
class Bucket implements DurableObject {
  private state: DurableObjectState;
  private clients: Client[] = [];
  private buckets: BucketInfo[] = [];
  private router: Router<Request>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;

    // `blockConcurrencyWhile()` ensures no requests are delivered until
    // initialization completes.
    this.state.blockConcurrencyWhile(async () => {
      const coordinatorName = `${this.state.id.name}:coordinator`;
      const coordinatorId = env.bucketsCoordinators.idFromName(coordinatorName);
      const coordinatorObject = env.bucketsCoordinators.get(coordinatorId);
      const coordinatorResp = await fetch("https://coordinator", {
        headers: {
          Upgrade: "websocket"
        }
      });

      const webSocket = coordinatorResp.webSocket;
      if (!webSocket) {
        // Not sure how to handle this as this should never happen.
        return;
      }

      webSocket.accept();

      webSocket.addEventListener("message", message => {
        let payload;
        try {
          payload = parseMessage(JSON.parse(message.data));
        } catch {
          return;
        }

        const { op } = payload;
        switch (op) {
          case BucketCoordinatorOp.Hello:
            // TODO

            return;

          default:
            return;
        }
      });
    });

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
