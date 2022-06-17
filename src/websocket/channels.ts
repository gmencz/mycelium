import { z } from "zod";

export const capabilitiesSchema = z.object({}).catchall(z.string().array());

export function makeChannelName(channel: string, appId: string) {
  return `${appId}:${channel}`;
}

export const jwtPayloadSchema = z.object({
  "x-mycelium-capabilities": capabilitiesSchema.optional(),
});

export const channelNameSchema = z
  .string()
  .min(1)
  .max(255)
  .trim()
  .regex(/^[a-zA-Z0-9_-]+$/);

export function validateChannelCapability(
  capabilityNeeded: string,
  channel: string,
  capabilities: z.infer<typeof capabilitiesSchema>
) {
  if (
    "*" in capabilities &&
    capabilities["*"].some(
      (capability) => capability === capabilityNeeded || capability === "*"
    )
  ) {
    return true;
  } else if (
    channel in capabilities &&
    capabilities[channel].some(
      (capability) => capability === capabilityNeeded || capability === "*"
    )
  ) {
    return true;
  }

  return Object.keys(capabilities).some((capabilityKey) => {
    if (capabilityKey.endsWith("*")) {
      const prefix = capabilityKey.split("*")[0];
      if (
        channel.startsWith(prefix) &&
        capabilities[capabilityKey].some(
          (capability) => capability === capabilityNeeded || capability === "*"
        )
      ) {
        return true;
      }
    }

    return false;
  });
}
