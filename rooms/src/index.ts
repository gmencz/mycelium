import { Router } from "itty-router";
import { Bindings, RouterRequest } from "./types";
import { handleSession } from "./api/session";
import { createApp, deleteApp, getApp } from "./internal/apps";
import { requireAuthorization } from "./utils/auth";

export { Lobby } from "./dos/lobby";
export { Room } from "./dos/room";

const router = Router();

router.get("/ws", (req: RouterRequest, env: Bindings) => {
  const upgradeHeader = req.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  handleSession(server, req, env);

  return new Response(null, {
    status: 101,
    webSocket: client
  });
});

router.get("/internal/apps/:id", requireAuthorization, getApp);
router.post("/internal/apps", requireAuthorization, createApp);
router.delete("/internal/apps/:id", requireAuthorization, deleteApp);

export default {
  fetch: router.handle
};
