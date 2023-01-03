import { Bindings } from "@/types";
import { Group } from "dog";

export class ChannelGroup extends Group<Bindings> {
  // Each Replica handles 10 connections max, this is because each replica
  // belongs to the same user so then multiple devices from the same
  // user connect to the same replica. I doubt there will be any user
  // with over 10 devices so let's keep it at 10 for now.
  limit = 10;

  link(env: Bindings) {
    return {
      child: env.CHANNEL,
      self: env.CHANNEL_GROUP,
    };
  }
}
