import { Request as IttyRequest } from "itty-router";

declare global {
  // const MY_ENV_VAR: string
  // const MY_SECRET: string
  // const myKVNamespace: KVNamespace

  type RouterRequest = Request & IttyRequest;

  interface Env {
    buckets: DurableObjectNamespace;
    bucketsCoordinators: DurableObjectNamespace;
  }

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

  interface DurableObjectState {
    blockConcurrencyWhile: (fn: () => Promise<void>) => void;
  }

  interface Response {
    webSocket?: WebSocket;
  }

  class DurableObject {
    constructor(state: DurableObjectState, env: Env);
    fetch: (request: Request) => Promise<Response>;
  }
}
