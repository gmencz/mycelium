import type { WebSocket } from "ws";

export interface MyceliumWebSocket extends WebSocket {
  id: string;
  appId: string;
}
