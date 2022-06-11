import "uWebSockets.js";

declare module "uWebSockets.js" {
  interface WebSocket {
    id: string;
  }
}
