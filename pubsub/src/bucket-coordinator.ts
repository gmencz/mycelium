import { Router } from "itty-router";

interface Bucket {
  name: string;
  webSocket: WebSocket;
}

/**
 * Global instance which coordinates all the buckets of an application across all data centers.
 */
class BucketCoordinator implements DurableObject {
  private router: Router<Request>;
  private buckets: Bucket[];

  constructor() {
    this.buckets = [];
    this.router = Router()
      .get("/", this.handleBucket)
      .all("*", () => new Response("Not found", { status: 404 }));
  }

  private handleBucketSession = (webSocket: WebSocket, bucketName: string) => {
    webSocket.accept();
    const bucket: Bucket = {
      name: bucketName,
      webSocket
    };

    if (!this.buckets.some(bucket => bucket.name === bucketName)) {
      this.buckets.push(bucket);
    }

    // TODO: Send current state to bucket etc.
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
