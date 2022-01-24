import { Bindings, RouterRequest } from "../types";

export const parseAuthorizationHeader = (header?: string | null) => {
  if (!header) {
    return;
  }

  const [_, token] = header.split(" ");
  return token;
};

export const requireAuthorization = async (
  req: RouterRequest,
  env: Bindings
) => {
  const token = parseAuthorizationHeader(req.headers.get("Authorization"));
  if (token !== env.INTERNAL_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
};
