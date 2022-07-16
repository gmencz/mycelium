import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import PublicFacingNavbar from "~/components/public-facing-navbar";
import { getUserId } from "~/utils/session.server";

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}

export default function FeaturesLayout() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="relative h-full">
      <PublicFacingNavbar isLoggedIn={data.isLoggedIn} />
      <Outlet />
    </div>
  );
}
