import { z } from "zod";
import jwt from "@tsndr/cloudflare-worker-jwt";

const userSchema = z.object({
  id: z.string(),
  details: z.record(z.unknown()),
});

export type User = z.TypeOf<typeof userSchema>;

export async function getUserFromJWT(possibleJwt: string, signingKey: string) {
  const isValid = await jwt.verify(possibleJwt, signingKey);

  if (!isValid) {
    throw new Error("Invalid JWT signature");
  }

  return userSchema.parse(jwt.decode(possibleJwt).payload.user);
}
