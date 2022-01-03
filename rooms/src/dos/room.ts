import { Replica, Socket } from "dog";
import { z } from "zod";
import { CloseCode, CloseMessage, SendOpCode } from "../api/codes";
import { broadcastToClusterSchema, decodePayload } from "../api/schemas";
import { createCloseTimeout } from "../api/session";
import { HEARTBEAT_MS } from "../constants";
import type { Bindings } from "../types";

export class Room extends Replica<Bindings> {
  private sessionTimeoutHandle: number | null = null;

  link(env: Bindings) {
    return {
      parent: env.LOBBY,
      self: env.ROOM
    };
  }

  async receive(req: Request) {
    const { pathname } = new URL(req.url);

    if (pathname === "/ws") {
      return this.connect(req);
    }

    return new Response(`Not found`, {
      status: 404
    });
  }

  async onmessage(ws: Socket, message: string) {
    let payload;
    try {
      payload = decodePayload(message);
    } catch (error) {
      ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
      return;
    }

    if (!Object.values(SendOpCode).includes(payload.op)) {
      // Unknown op code so close the connection.
      ws.close(CloseCode.UnknownOpCode, CloseMessage.UnknownOpCode);
      return;
    }

    clearTimeout(this.sessionTimeoutHandle);
    this.sessionTimeoutHandle = createCloseTimeout(
      HEARTBEAT_MS,
      ws,
      CloseCode.SessionTimedOut,
      CloseMessage.SessionTimedOut
    );

    switch (payload.op) {
      case SendOpCode.BroadcastToRoom:
        let data: z.infer<typeof broadcastToClusterSchema>;
        try {
          data = broadcastToClusterSchema.parse(payload.d);
        } catch (error) {
          ws.close(CloseCode.DecodeError, CloseMessage.DecodeError);
          return;
        }

        await ws.broadcast(
          JSON.stringify({ data: data.data, sid: data.sid }),
          true
        );

        return;

      default:
        ws.close(CloseCode.UnknownOpCode, CloseMessage.UnknownOpCode);
        return;
    }
  }

  onopen(ws: Socket) {
    this.sessionTimeoutHandle = createCloseTimeout(
      HEARTBEAT_MS,
      ws,
      CloseCode.SessionTimedOut,
      CloseMessage.SessionTimedOut
    );
  }
}
