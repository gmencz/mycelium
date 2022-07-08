import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link, useActionData } from "@remix-run/react";
import { verify } from "~/utils/argon.server";
import { db } from "~/utils/db.server";
import { createUserSession, getUserId } from "~/utils/session.server";

interface ActionData {
  formError?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
  fields?: {
    email?: string;
    password?: string;
  };
}

export const action: ActionFunction = async ({ request }) => {
  const body = await request.formData();
  const email = body.get("email")?.toString();
  const password = body.get("password")?.toString();
  const fieldErrors: ActionData["fieldErrors"] = {};

  if (!email) {
    fieldErrors.email = `Your email is required`;
  } else if (!email.includes("@")) {
    fieldErrors.email = `That's not a valid email`;
  }

  if (!password) {
    fieldErrors.password = `Your password is required`;
  } else if (password.length < 6) {
    fieldErrors.password = `Passwords must be at least 6 characters long`;
  }

  const fields: ActionData["fields"] = {
    email,
    password,
  };

  if (Object.keys(fieldErrors).length) {
    return json<ActionData>({ fieldErrors, fields }, { status: 400 });
  }

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
      { formError: `That email/password combination is not valid`, fields },
      { status: 400 }
    );
  }

  const validPassword = await verify(user.passwordHash, password!);
  if (!validPassword) {
    return json<ActionData>(
      { formError: `That email/password combination is not valid`, fields },
      { status: 400 }
    );
  }

  return createUserSession(user.id, "/dashboard");
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/dashboard");
  }

  return null;
};

interface ActionData {
  formError?: string;
}

export default function Login() {
  const actionData = useActionData<ActionData>();

  return (
    <div className="p-12 bg-black h-full flex flex-col justify-center">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-3">
          <img className="h-12 w-auto" src="/logo.svg" alt="Mycelium" />
        </Link>

        <h2 className="mt-6 text-center text-5xl font-extrabold text-white">
          Log in to your account
        </h2>

        <p className="mt-2 text-center text-lg text-gray-300">
          Or{" "}
          <Link
            to="/sign-up"
            className="font-medium text-red-400 hover:text-red-500"
          >
            create a free one
          </Link>
        </p>

        <form method="post" className="mt-8 space-y-6">
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            type="email"
            name="email"
            placeholder="Email address"
            className="p-4 text-xl rounded w-full"
            defaultValue={actionData?.fields?.email}
            aria-invalid={Boolean(actionData?.fieldErrors?.email)}
            aria-errormessage={
              actionData?.fieldErrors?.email ? "email-error" : undefined
            }
          />
          {actionData?.fieldErrors?.email ? (
            <p role="alert" id="email-error" className="text-red-500 block">
              {actionData.fieldErrors.email}
            </p>
          ) : null}

          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            type="password"
            name="password"
            className="p-4 text-xl rounded w-full"
            placeholder="Password"
            defaultValue={actionData?.fields?.password}
            aria-invalid={Boolean(actionData?.fieldErrors?.password)}
            aria-errormessage={
              actionData?.fieldErrors?.password ? "password-error" : undefined
            }
          />
          {actionData?.fieldErrors?.password ? (
            <p role="alert" id="password-error" className="text-red-500 block">
              {actionData.fieldErrors.password}
            </p>
          ) : null}

          <div id="form-error-message">
            {actionData?.formError ? (
              <p className="text-red-500 block" role="alert">
                {actionData.formError}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="w-full flex justify-center p-4 border border-transparent rounded shadow-sm text-lg font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
