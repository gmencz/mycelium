import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export async function loader({ request, params }: LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/log-in");
  }

  const app = await db.app.findFirst({
    where: {
      AND: [{ id: params.appId }, { userId }],
    },
    select: {
      name: true,
    },
  });

  if (!app) {
    throw new Response("App Not Found", {
      status: 404,
    });
  }

  return json({ app });
}

export default function AppLayout() {
  return (
    <div>
      <p>App Layout</p>
    </div>
  );
}
