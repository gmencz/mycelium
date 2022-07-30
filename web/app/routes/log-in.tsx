import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import { verify } from "~/utils/argon.server";
import { z } from "zod";
import PublicFacingNavbar from "~/components/public-facing-navbar";
import { validateFormData } from "~/utils/actions";
import { db } from "~/utils/db.server";
import { createUserSession, getUserId } from "~/utils/session.server";

interface ActionData {
  fieldsErrors?: {
    email?: string;
    password?: string;
  };

  formError?: string;
}

const schema = z.object({
  email: z.string().email("That email is not valid"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  remember: z.string().optional(),
});

type ActionInput = z.TypeOf<typeof schema>;

export async function action({ request }: ActionArgs) {
  const { formData, errors } = await validateFormData<ActionInput>({
    request,
    schema,
  });

  if (errors) {
    return json<ActionData>(
      {
        fieldsErrors: {
          email: errors.email,
          password: errors.password,
        },
      },
      { status: 400 }
    );
  }

  const { email, password, remember } = formData;
  const user = await db.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return json<ActionData>(
      { formError: "Invalid email or password" },
      { status: 401 }
    );
  }

  const isValidPassword = await verify(user.passwordHash, password);
  if (!isValidPassword) {
    return json<ActionData>(
      { formError: "Invalid email or password" },
      { status: 400 }
    );
  }

  return createUserSession(user.id, "/dashboard/apps", !!remember);
}

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/dashboard/apps");
  }

  return null;
}

export default function LogIn() {
  const actionData = useActionData<ActionData>();

  return (
    <div className="relative flex flex-col h-full p-8">
      <PublicFacingNavbar isLoggedIn={false} />

      <div className="mt-14 lg:mt-32 flex max-w-6xl w-full mx-auto items-center">
        <div className="hidden lg:block max-w-md mr-16 flex-1">
          <img src="/log-in.svg" className="w-full" alt="" />
        </div>

        <div className="flex-1 flex flex-col flex-shrink-0">
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-black sm:text-5xl">
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
                    aria-invalid={Boolean(actionData?.fieldsErrors?.email)}
                    aria-errormessage={
                      actionData?.fieldsErrors?.email
                        ? "usage-plans-error"
                        : undefined
                    }
                  />
                </div>

                {actionData?.fieldsErrors?.email ? (
                  <p
                    className="mt-2 text-sm text-red-500 font-medium"
                    role="alert"
                    id="email-error"
                  >
                    {actionData.fieldsErrors.email}
                  </p>
                ) : null}
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
                    aria-invalid={Boolean(actionData?.fieldsErrors?.password)}
                    aria-errormessage={
                      actionData?.fieldsErrors?.password
                        ? "password-error"
                        : undefined
                    }
                  />
                </div>

                {actionData?.fieldsErrors?.password ? (
                  <p
                    className="mt-2 text-sm text-red-500 font-medium"
                    role="alert"
                    id="password-error"
                  >
                    {actionData.fieldsErrors.password}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember"
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
                <div className="mb-2">
                  {actionData?.formError ? (
                    <p
                      className="text-sm text-red-500 font-medium"
                      role="alert"
                    >
                      {actionData.formError}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded shadow-sm text-base font-semibold text-white bg-black ring-2 ring-black hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Continue
                </button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
