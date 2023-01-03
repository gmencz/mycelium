import { Hono } from "hono";
import { Channel } from "./dos/channel";
import { ChannelGroup } from "./dos/channel-group";
import { Bindings } from "./types";
import * as apps from "./handlers/apps";
import * as ws from "./handlers/ws";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/ws", ws.get);
app.post("/apps", apps.post);

export { Channel, ChannelGroup };
export default app;
