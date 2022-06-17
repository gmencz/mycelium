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
  .min(1, "A channel name can't be empty")
  .max(255, "A channel name can't be longer than 255 characters")
  .trim()
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "A channel name can only contain lower and uppercase letters, numbers and the following punctuation: _-"
  );

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
