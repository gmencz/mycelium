import type { ActionFunction } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { createUserSession } from "~/utils/session.server";

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

  return createUserSession(user.id, "/dashboard");
};

export default function Login() {
  return (
    <div className="p-12">
      <h1>Login</h1>

      <Form method="post">
        <input type="email" name="email" placeholder="you@example.com" />
        <button type="submit">Login</button>
      </Form>
    </div>
  );
}
