import { Bindings } from "@/types";
import { makeSigningKey } from "@/utils/make-signing-key";
import { Context } from "hono";

export interface App {
  id: string;
  signingKey: string;
  createdAt: string;
}

export const post = async (
  c: Context<
    string,
    {
      Bindings: Bindings;
    },
    unknown
  >
) => {
  const app: App = {
    id: crypto.randomUUID(),
    signingKey: makeSigningKey(),
    createdAt: new Date().toISOString(),
  };

  await c.env.APPS.put(app.id, JSON.stringify(app));

  return c.json(app, 201, {
    Location: `/apps/${app.id}`,
  });
};
