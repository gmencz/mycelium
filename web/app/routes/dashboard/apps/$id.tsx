import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserId(request);
  if (!userId) {
    // Redirect to the home page if they are not signed in.
    return redirect("/");
  }

  const app = await db.app.findUnique({
    where: {
      id: params.id,
    },
    select: {
      id: true,
      name: true,
      apiKeys: {
        select: {
          id: true,
          secret: true,
        },
      },
    },
  });

  if (!app) {
    throw new Response("App not found", {
      status: 404,
    });
  }

  return { app };
};

interface LoaderData {
  app: {
    id: string;
    name: string;
    apiKeys: {
      id: string;
      secret: string;
    }[];
  };
}

export default function App() {
  const { app } = useLoaderData<LoaderData>();

  return (
    <div className="p-12">
      <h1>
        {app.name} - {app.id}
      </h1>

      <h2 className="mt-8">API Keys</h2>
      <ul>
        {app.apiKeys.map((apiKey) => (
          <li key={apiKey.id} className="flex flex-col">
            <span>ID: {apiKey.id}</span>
            <span>Secret: {apiKey.secret}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
