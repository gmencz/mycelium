import { Router } from "itty-router";
import { HelloMessage } from "./messages/hello";
import { HEARTBEAT_INTERVAL } from "./constants";
import { BucketJoinedMessage } from "./messages/bucket-joined";
import { BucketLeftMessage } from "./messages/bucket-left";
import { parseMessage } from "~/api/bucket/messages/parse";
import { ZodError } from "zod";
import { MyceliumCloseCode, MyceliumCloseMessage } from "~/api/bucket/protocol";
import { BucketCoordinatorOp } from "./protocol";
import { handleHeartbeatMessage } from "./messages/handlers/heartbeat";

interface Bucket {
  name: string;
  webSocket: WebSocket;
}

/**
 * Global instance which coordinates all the buckets of an application across all data centers.
 */
class BucketCoordinator implements DurableObject {
  private router: Router<Request>;
  private buckets: Bucket[] = [];

  constructor() {
    this.buckets = [];
    this.router = Router()
      .get("/", this.handleBucket)
      .all("*", () => new Response("Not found", { status: 404 }));
  }

  private handleBucketSession = (webSocket: WebSocket, bucketName: string) => {
    webSocket.accept();
    webSocket.send(
      new HelloMessage({
        buckets: this.buckets.map(bucket => ({ name: bucket.name })),
        heartbeatInterval: HEARTBEAT_INTERVAL
      }).toJSON()
    );

    const bucketJoinedMessage = new BucketJoinedMessage({
      name: bucketName
    }).toJSON();

    for (let i = 0; i < this.buckets.length; i++) {
      this.buckets[i].webSocket.send(bucketJoinedMessage);
    }

    const isNewBucket = !this.buckets.some(
      bucket => bucket.name === bucketName
    );

    if (isNewBucket) {
      this.buckets.push({
        name: bucketName,
        webSocket
      });
    }

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

      const { op } = payload;
      switch (op) {
        case BucketCoordinatorOp.Heartbeat:
          return handleHeartbeatMessage(webSocket);

        default:
          return webSocket.close(
            MyceliumCloseCode.UnknownOpcode,
            MyceliumCloseMessage.UnknownOpcode
          );
      }
    });

    const errorOrCloseHandler = () => {
      this.buckets = this.buckets.filter(bucket => bucket.name !== bucketName);

      const bucketLeftMessage = new BucketLeftMessage({
        name: bucketName
      }).toJSON();

      for (let i = 0; i < this.buckets.length; i++) {
        this.buckets[i].webSocket.send(bucketLeftMessage);
      }
    };

    webSocket.addEventListener("error", errorOrCloseHandler);
    webSocket.addEventListener("close", errorOrCloseHandler);
  };

  private handleBucket = (req: RouterRequest) => {
    const upgradeHeader = req.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const bucketName = req.query?.bucketName;
    if (!bucketName) {
      return new Response("Expected bucketName query param", { status: 400 });
    }

    const [client, server]: WebSocket[] = Object.values(new WebSocketPair());
    this.handleBucketSession(server, bucketName);
    return new Response(null, { status: 101, webSocket: client });
  };

  fetch = async (request: Request) => await this.router.handle(request);
}

export { BucketCoordinator };
