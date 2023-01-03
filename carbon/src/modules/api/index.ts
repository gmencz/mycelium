import { Bindings } from "@/bindings";
import { Hono } from "hono";
import { createApp } from "../apps";

const api = new Hono<{ Bindings: Bindings }>();

api.post("/apps", async (c) => {
  const newApp = await createApp(c.env.APPS);
  return c.json({ app: newApp });
});

export { api };
