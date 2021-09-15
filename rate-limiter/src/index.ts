import { Router } from "itty-router";

const router = Router();

router.all("*", () => new Response("Not found", { status: 404 }));

export default {
  fetch: router.handle
};
