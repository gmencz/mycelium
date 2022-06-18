import type { FastifyRequest } from "fastify";
import type { JwtPayload } from "jsonwebtoken";
import type { MyceliumWebSocket } from "../types";

import { decode, verify } from "jsonwebtoken";
import { nanoid } from "nanoid";
import { z } from "zod";

import { db } from "../util/db";
import { capabilitiesSchema } from "./channels";
import { CloseCode } from "./protocol";

interface Params {
  webSocket: MyceliumWebSocket;
  key?: string;
  token?: string;
  webSocketsChannels: Map<MyceliumWebSocket, Set<string>>;
}

const jwtPayloadSchema = z.object({
  "x-mycelium-capabilities": capabilitiesSchema.optional(),
});

export async function authenticateWebSocket({
  webSocket,
  key,
  token,
  webSocketsChannels,
}: Params) {
  if (!key && !token) {
    return {
      code: CloseCode.AuthenticationError,
      message:"Provide either a key or a token"
    };
  }

  if (key && token) {
    return {
      code: CloseCode.AuthenticationError,
      message:"Provide either a key or a token and NOT both"
    };
  }

  // Basic auth
  if (key) {
    const apiKey = await db.apiKey.findUnique({
      where: {
        id: key,
      },
      select: {
        id: true,
        appId: true,
        capabilities: true,
      },
    });

    if (!apiKey) {
      return {
        code: CloseCode.AuthenticationError,
        message:"Invalid key"
      };
    }

    webSocket.auth = {
      apiKeyId: apiKey.id,
      appId: apiKey.appId,
      capabilities: apiKey.capabilities as z.infer<typeof capabilitiesSchema>,
    };
  }
  // Token auth
  else if (token) {
    let jwt;
    try {
      jwt = decode(token, { complete: true });
    } catch (error) {
      return {
        code: CloseCode.AuthenticationError,
        message:"Invalid token"
      };
    }

    if (!jwt) {
      return {
        code: CloseCode.AuthenticationError,
        message:"Invalid token"
      };
    }

    const { kid: apiKeyId } = jwt.header;
    if (!apiKeyId) {
      return {
        code: CloseCode.AuthenticationError,
        message:"Invalid token"
      };
    }

    const apiKey = await db.apiKey.findUnique({
      where: {
        id: apiKeyId,
      },
      select: {
        id: true,
        appId: true,
        secret: true,
        capabilities: true,
      },
    });

    if (!apiKey) {
      return {
        code: CloseCode.AuthenticationError,
        message:"Invalid token"
      };
    }

    let jwtPayload;
    try {
      jwtPayload = jwtPayloadSchema.parse(
        await new Promise<JwtPayload>((res, rej) => {
          verify(token, apiKey.secret, (error, payload) => {
            if (error) {
              return rej(error);
            }

            if (!payload || typeof payload === "string") {
              return rej();
            }

            res(payload);
          });
        })
      );
    } catch (error) {
      return {
        code: CloseCode.AuthenticationError,
        message:"Invalid token"
      };
    }

    const { "x-mycelium-capabilities": rawJwtCapabilities } = jwtPayload;

    if (rawJwtCapabilities) {
      let jwtCapabilities: z.infer<typeof capabilitiesSchema>;
      try {
        jwtCapabilities = capabilitiesSchema.parse(rawJwtCapabilities);
      } catch (error) {
        return {
          code: CloseCode.AuthenticationError,
          message:"Invalid token capabilities"
        };
      }

      const jwtCapabilitiesKeys = Object.keys(jwtCapabilities);
      if (jwtCapabilitiesKeys.length > 250) {
        return {
          code: CloseCode.AuthenticationError,
          message:"Invalid token capabilities, 250 max capabilities"
        };
      }

      webSocket.auth = {
        apiKeyId: apiKey.id,
        appId: apiKey.appId,
        capabilities: jwtCapabilities,
      };
    } else {
      webSocket.auth = {
        apiKeyId: apiKey.id,
        appId: apiKey.appId,
        capabilities: apiKey.capabilities as z.infer<typeof capabilitiesSchema>,
      };
    }
  }

  webSocket.id = nanoid();
  webSocketsChannels.set(webSocket, new Set());
}
