import { Hono } from "hono";
import { Channel } from "./modules/channels/replica";
import { ChannelGroup } from "./modules/channels/group";
import { api } from "./modules/api";
import { Bindings } from "./bindings";
import { handleWebSocket } from "./modules/ws";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/ws", handleWebSocket);
app.route("/api", api);

export { Channel, ChannelGroup };
export default app;
