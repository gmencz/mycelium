import { Bindings } from "./types";
import { handleSession } from "./api/session";

export { Lobby } from "./dos/lobby";
export { Room } from "./dos/room";

const worker: ModuleWorker<Bindings> = {
  fetch: async (req, env) => {
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
  }
};

export default worker;
