import { EyeSlashIcon } from "@heroicons/react/20/solid";
import { EyeIcon, PencilIcon } from "@heroicons/react/20/solid";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import clsx from "clsx";
import { useState } from "react";
import { db } from "~/utils/db.server";
import { requireUserSession } from "~/utils/session.server";

export async function loader({ params, request }: LoaderArgs) {
  const userId = await requireUserSession(request);
  const apiKeys = await db.apiKey.findMany({
    where: {
      AND: [{ appID: params.appId }, { apps: { userId } }],
    },
    select: {
      id: true,
      name: true,
      secret: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return json({ apiKeys });
}

interface ApiKeyRowProps {
  apiKey: {
    id: string;
    name: string;
    secret: string;
    createdAt: string;
  };
}

function ApiKeyRow({ apiKey }: ApiKeyRowProps) {
  const [isSecretBlurred, setIsSecretBlurred] = useState(true);

  return (
    <tr>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-black sm:pl-6">
        {apiKey.name}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {new Date(apiKey.createdAt).toDateString()}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {apiKey.id}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "text-gray-500",
              isSecretBlurred && "blur select-none"
            )}
          >
            {apiKey.secret}
          </span>

          <button
            onClick={() => {
              setIsSecretBlurred((is) => !is);
            }}
          >
            <span className="sr-only">{isSecretBlurred ? "Show" : "Hide"}</span>
            {isSecretBlurred ? (
              <EyeIcon className="w-5 h-5" />
            ) : (
              <EyeSlashIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </td>
      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        <Link
          to={apiKey.id}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <PencilIcon className="w-4 h-4" />

          <span>
            Edit<span className="sr-only">, {apiKey.name}</span>
          </span>
        </Link>
      </td>
    </tr>
  );
}

export default function AppApiKeys() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="mt-2">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">API Keys</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all the API Keys for this app including their name, when
            they were created and secret.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="new"
            className="inline-flex items-center gap-2 text-sm text-white font-bold bg-black py-2 px-6 rounded ring-2 ring-black hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            Add API Key
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 mt-8">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  ID
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Secret
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.apiKeys.map((apiKey) => (
                <ApiKeyRow key={apiKey.id} apiKey={apiKey} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
