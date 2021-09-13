import { Request as IttyRequest } from "itty-router";

export type RouterRequest = Request & IttyRequest;

declare global {
  // const MY_ENV_VAR: string
  // const MY_SECRET: string
  // const myKVNamespace: KVNamespace

  interface Env {}

  interface WebSocket {
    accept(): void;
  }

  class WebSocketPair {
    public 0: WebSocket;
    public 1: WebSocket;
  }

  interface ResponseInit {
    webSocket?: WebSocket;
  }

  interface Response {
    webSocket?: WebSocket;
  }

  class DurableObject {
    constructor(state: DurableObjectState, env: Env);
    fetch: (request: Request) => Promise<Response>;
  }
}
