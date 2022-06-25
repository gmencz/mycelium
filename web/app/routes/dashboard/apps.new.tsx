import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { nanoid } from "nanoid";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export const action: ActionFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (!userId) {
    // Redirect to the home page if they are not signed in.
    return redirect("/");
  }

  const body = await request.formData();
  const name = body.get("name")?.toString();
  if (!name) {
    return {
      formError: `Name is required`,
    };
  }

  const app = await db.app.create({
    data: {
      id: nanoid(),
      name,
      userId,
      // Create an initial API key with max capabilities.
      apiKeys: {
        create: {
          id: nanoid(),
          capabilities: {
            "*": "*",
          },
          secret: nanoid(32),
        },
      },
    },
    select: {
      id: true,
    },
  });

  return redirect(`/app/apps/${app.id}`);
};

export default function NewApp() {
  return (
    <div className="p-12">
      <h1>New app</h1>
      <Form method="post">
        <input type="text" name="name" placeholder="Name" />
        <button type="submit">Create</button>
      </Form>
    </div>
  );
}
