import type { ApiKey } from "@prisma/client";
import type { WebSocket } from "ws";

import { z } from "zod";
import { capabilitiesSchema } from "./websocket/channels";

export interface MyceliumWebSocket extends WebSocket {
  id: string;
  auth: {
    appId: string;
    apiKeyId: ApiKey["id"];
    capabilities: z.infer<typeof capabilitiesSchema>;
  };
}
