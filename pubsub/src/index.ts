import { Router } from "itty-router";

const router = Router();

router.get("/", (req: RouterRequest, env: Env) => {
  const upgradeHeader = req.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  const token = req.query?.token; // TODO: Validate token

  const appId = "123"; // TODO: Extract this from the token provided by the end user.
  const colo = req.cf.colo;
  const bucketName = `${appId}:${colo}`;
  const bucketId = env.buckets.idFromName(bucketName);
  const bucketObject = env.buckets.get(bucketId);
  return bucketObject.fetch(req.url, {
    headers: {
      Upgrade: "websocket"
    }
  });
});

router.all("*", () => new Response("Not found", { status: 404 }));

export { Bucket } from "./api/bucket/do";
export { BucketCoordinator } from "./api/bucket-coordinator/do";

export default {
  fetch: router.handle
};
