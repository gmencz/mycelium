import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import DashboardNavbar from "~/components/dashboard-navbar";
import { db } from "~/utils/db.server";
import { logout, requireUserSession } from "~/utils/session.server";

export async function loader({ request }: LoaderArgs) {
  const userId = await requireUserSession(request);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
    },
  });

  if (!user) {
    return logout(request);
  }

  const userDetails = {
    username: user.email.split("@")[0],
  };

  return json({ userDetails });
}

export default function Dashboard() {
  const { userDetails } = useLoaderData<typeof loader>();

  return (
    <div className="relative h-full bg-gray-100">
      <DashboardNavbar username={userDetails.username} />

      <div className="mt-6 px-8">
        <div className="max-w-6xl w-full mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
