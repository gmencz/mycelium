import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, Outlet } from "@remix-run/react";
import { getUserId } from "~/utils/session.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserId(request);
  if (!userId) {
    // Redirect to the home page if they are not signed in.
    return redirect("/");
  }

  return null;
};

export default function App() {
  return (
    <div className="p-12 flex gap-4">
      <Link to="apps">Apps</Link>
      <Link to="apps/new">New app</Link>

      <Outlet />
    </div>
  );
}
