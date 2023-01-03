import { Context } from "@/bindings";
import { getApp } from "../apps";
import { CloseCode } from "./protocol";
import { startSession } from "./session";

export const handleWebSocket = async (c: Context) => {
  const upgradeHeader = c.req.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 406);
  }

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);
  server.accept();

  const appId = c.req.query("appId");

  if (!appId) {
    server.close(CloseCode.MISSING_APP_ID);
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  const app = await getApp(c.env.APPS, appId);
  if (!app) {
    server.close(CloseCode.APP_NOT_FOUND);
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  startSession(server, app, c);

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};
