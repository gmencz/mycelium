import { uuid } from "@cfworker/uuid";
import { App, Bindings, RouterRequest } from "../types";
import { id } from "../utils/crypto";
import { json } from "../utils/responses";

export const createApp = async (_req: RouterRequest, env: Bindings) => {
  const appId = uuid();
  const signingKey = id();
  await env.APPS_KV.put(appId, JSON.stringify({ signingKey }));

  return json(
    {
      id: appId,
      signingKey
    },
    { status: 201 }
  );
};

export const getApp = async (req: RouterRequest, env: Bindings) => {
  const id = req.params?.id;
  if (!id) {
    return new Response("Bad Request", { status: 400 });
  }

  const app = await env.APPS_KV.get<App>(id, {
    type: "json"
  });

  if (!app) {
    return new Response("Not Found", { status: 404 });
  }

  return json({
    id,
    ...app
  });
};

export const deleteApp = async (req: RouterRequest, env: Bindings) => {
  const id = req.params?.id;
  if (!id) {
    return new Response("Bad Request", { status: 400 });
  }

  await env.APPS_KV.delete(id);
  return new Response("OK");
};
