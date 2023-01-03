import { userSchema } from "@/messaging/shared";
import jwt from "@tsndr/cloudflare-worker-jwt";

export async function getUserFromJWT(possibleJwt: string, signingKey: string) {
  const isValid = await jwt.verify(possibleJwt, signingKey);

  if (!isValid) {
    throw new Error("Invalid JWT signature");
  }

  return userSchema.parse(jwt.decode(possibleJwt).payload.user);
}
