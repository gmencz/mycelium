import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { requireUserSession } from "~/utils/session.server";

export async function loader({ params, request }: LoaderArgs) {
  const userId = await requireUserSession(request);
  const app = await db.app.findFirst({
    where: {
      AND: [{ id: params.appId }, { userId }],
    },
    select: {
      name: true,
      createdAt: true,
    },
  });

  if (!app) {
    throw new Response("App Not Found", {
      status: 404,
    });
  }

  return json({ app });
}

export default function AppOverview() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg w-full">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-black">
          Application information
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
              {data.app.name}
            </dd>
          </div>
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
              {new Date(data.app.createdAt).toDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
