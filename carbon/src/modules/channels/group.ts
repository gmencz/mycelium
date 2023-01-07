import { Bindings } from "@/bindings";
import { Group } from "dog";

export class ChannelGroup extends Group<Bindings> {
  limit = 250;

  link(env: Bindings) {
    return {
      child: env.CHANNEL,
      self: env.CHANNEL_GROUP,
    };
  }
}
