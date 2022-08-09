import type { LoaderArgs } from "@remix-run/node";
import { redis } from "~/utils/redis.server";

export async function loader({ params }: LoaderArgs) {
  const { appId } = params;
  const now = new Date();

  const [currentClients, peakClients, publishedMessagesThisMonth] =
    await redis.mget(
      `current-clients:${appId}`,
      `peak-clients:${appId}`,
      `published-messages:${appId}:${now.getMonth()}-${now.getFullYear()}`
    );

  console.log({ currentClients, peakClients, publishedMessagesThisMonth });

  return null;
}

export default function AppAnalytics() {
  return null;
}
