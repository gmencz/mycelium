import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { hash } from "~/utils/argon.server";
import { nanoid } from "nanoid";
import { db } from "~/utils/db.server";
import { createUserSession, getUserId } from "~/utils/session.server";
import { Prisma } from "@prisma/client";

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

  let user;
  try {
    user = await db.user.create({
      data: {
        id: nanoid(),
        email: email!,
        passwordHash: await hash(password!),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return json<ActionData>(
          {
            formError: `That email is not available, someone else is using it`,
            fields,
          },
          { status: 400 }
        );
      }
    }
    throw e;
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

export default function SignUp() {
  return (
    <div className="p-12 bg-black h-full flex flex-col justify-center">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-3">
          <img className="h-12 w-auto" src="/logo.svg" alt="Mycelium" />
        </Link>

        <h2 className="mt-6 text-center text-5xl font-extrabold text-white">
          Create your free account
        </h2>

        <p className="mt-2 text-center text-lg text-gray-300">
          Or{" "}
          <Link
            to="/login"
            className="font-medium text-red-400 hover:text-red-500"
          >
            log in to an existing account
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
          />

          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            type="password"
            name="password"
            className="p-4 text-xl rounded w-full"
            placeholder="Password"
          />

          <button
            type="submit"
            className="w-full flex justify-center p-4 border border-transparent rounded shadow-sm text-lg font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
