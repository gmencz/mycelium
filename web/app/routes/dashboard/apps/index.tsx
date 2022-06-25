import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (!userId) {
    // Redirect to the home page if they are not signed in.
    return redirect("/");
  }

  const apps = await db.app.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return { apps };
};

interface LoaderData {
  apps: {
    id: string;
    name: string;
  }[];
}

export default function Apps() {
  const data = useLoaderData<LoaderData>();

  return (
    <div className="p-12">
      <h1>Apps</h1>

      {data.apps.map((app) => (
        <li key={app.id}>
          <Link to={app.id}>{app.name}</Link>
        </li>
      ))}
    </div>
  );
}
