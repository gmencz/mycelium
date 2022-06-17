import { z } from "zod";
import { capabilitiesSchema } from "./routes/websocket";

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
