import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Link } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { createUserSession, getUserId } from "~/utils/session.server";

export const action: ActionFunction = async ({ request }) => {
  const body = await request.formData();
  const email = body.get("email")?.toString();

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return {
      formError: `Email doesn't exist`,
    };
  }

  // TODO: All the email auth stuff.

  return createUserSession(user.id, "/dashboard");
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/dashboard");
  }

  return null;
};

export default function Login() {
  return (
    <div className="p-12 bg-black h-full flex flex-col justify-center">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-3">
          <img className="h-10 w-auto" src="/logo.svg" alt="Mycelium" />
        </Link>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Log in to your account
        </h2>

        <p className="mt-2 text-center text-sm text-gray-300">
          Or{" "}
          <Link
            to="/sign-up"
            className="font-medium text-red-400 hover:text-red-500"
          >
            create your free account
          </Link>
        </p>

        <Form method="post" className="mt-8 space-y-6">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            className="p-4 text-xl rounded w-full"
          />

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded shadow-sm text-lg font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
          >
            Log in
          </button>
        </Form>
      </div>
    </div>
  );
}
