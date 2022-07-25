import type { LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Link } from "@remix-run/react";
import PublicFacingNavbar from "~/components/public-facing-navbar";
import { getUserId } from "~/utils/session.server";

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/");
  }

  return null;
}

export default function LogIn() {
  return (
    <div className="relative flex flex-col h-full p-8">
      <PublicFacingNavbar isLoggedIn={false} />

      <div className="mt-14 lg:mt-32 flex max-w-6xl w-full mx-auto items-center">
        <div className="hidden lg:block max-w-md mr-16 flex-1">
          <img src="/log-in.svg" className="w-full" alt="" />
        </div>

        <div className="flex-1 flex flex-col flex-shrink-0">
          <h1 className="mt-6 text-4xl font-extrabold text-black">
            Log in to your account
          </h1>

          <div className="mt-8">
            <Form method="post" className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-warm-gray-900"
                >
                  Email
                </label>
                <div className="mt-1.5">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="you@example.com"
                    className="py-3 px-4 block w-full shadow-sm text-black focus:ring-black focus:border-black border-warm-gray-300 rounded-md"
                    // aria-invalid={Boolean(actionData?.fieldsErrors?.email)}
                    // aria-errormessage={
                    //   actionData?.fieldsErrors?.email
                    //     ? "usage-plans-error"
                    //     : undefined
                    // }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-warm-gray-900"
                >
                  Password
                </label>
                <div className="mt-1.5">
                  <input
                    type="password"
                    name="password"
                    id="email"
                    className="py-3 px-4 block w-full shadow-sm text-black focus:ring-black focus:border-black border-warm-gray-300 rounded-md"
                    // aria-invalid={Boolean(actionData?.fieldsErrors?.email)}
                    // aria-errormessage={
                    //   actionData?.fieldsErrors?.email
                    //     ? "usage-plans-error"
                    //     : undefined
                    // }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-black"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-yellow-500 hover:text-yellow-600"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="mt-2 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded shadow-sm text-base font-semibold text-white bg-black ring-2 ring-black hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Request Access
                </button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
