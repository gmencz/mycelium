import { PlusIcon } from "@heroicons/react/outline";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import clsx from "clsx";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export function meta() {
  return {
    title: "Apps - Dashboard - Mycelium",
  };
}

const bgColorOptions = [
  "bg-pink-500",
  "bg-purple-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-red-500",
  "bg-orange-500",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map(([firstLetter]) => firstLetter)
    .filter((_, index, array) => index === 0 || index === array.length - 1)
    .join("")
    .toUpperCase();
}

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/log-in");
  }

  const apps = await db.app.findMany({
    where: {
      userId,
    },
  });

  return json({
    apps: apps.map((app) => {
      return {
        ...app,
        initials: getInitials(app.name),
        bgColor:
          bgColorOptions[Math.floor(Math.random() * bgColorOptions.length)],
      };
    }),
  });
}

export default function DashboardApps() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <Link
        to="/dashboard/apps/new"
        className="inline-flex items-center gap-2 text-sm text-white font-bold bg-black py-2 px-6 rounded ring-2 ring-black hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
      >
        <PlusIcon className="-ml-2 h-5 w-5" />
        <span>New App</span>
      </Link>

      <ul className="mt-4 grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.apps.map((app) => (
          <li key={app.id} className="col-span-1 flex shadow-sm rounded-md">
            <div
              className={clsx(
                app.bgColor,
                "flex-shrink-0 flex items-center justify-center w-16 text-white text-sm font-medium rounded-l-md"
              )}
            >
              {app.initials}
            </div>
            <div className="flex-1 flex items-center justify-between border-t border-r border-b border-gray-200 bg-white rounded-r-md truncate">
              <Link
                to={app.id}
                className="text-gray-900 font-medium hover:text-gray-600 flex-1 px-4 py-2 text-sm truncate"
              >
                {app.name}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
