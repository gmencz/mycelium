import type { WebSocket } from "ws";

export interface MyceliumWebSocket extends WebSocket {
  id: string;
  app: {
    id: string;
    signingKey: string;
  };
}
