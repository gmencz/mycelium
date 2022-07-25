import { Prisma } from "@prisma/client";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { nanoid } from "nanoid";
import { z } from "zod";
import PublicFacingNavbar from "~/components/public-facing-navbar";
import { validateFormData } from "~/utils/actions";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

interface ActionData {
  fieldsErrors?: {
    usagePlans?: string;
    email?: string;
  };

  formError?: string;
}

const schema = z.object({
  email: z.string().email("That email is not valid"),

  "usage-plans": z
    .string({
      required_error:
        "It's required that you tell us what you plan on using Mycelium for",
    })
    .min(10, "At least 20 characters on what you plan on using Mycelium for")
    .max(500, "Max. 500 characters on what you plan on using Mycelium for"),
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
          usagePlans: errors["usage-plans"],
        },
      },
      { status: 400 }
    );
  }

  const { email, "usage-plans": usagePlans } = formData;

  try {
    await db.betaAccessRequests.create({
      data: {
        id: nanoid(),
        email,
        usagePlans,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return json<ActionData>(
          {
            formError:
              "There's an existing beta access request associated to this email",
          },
          { status: 400 }
        );
      }
    }

    return json<ActionData>(
      {
        formError:
          "Something unexpected went wrong creating your beta access request",
      },
      { status: 500 }
    );
  }

  return redirect(`/request-beta-access-success?email=${email}`);
}

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}

export default function RequestBetaAccess() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <div className="relative flex flex-col h-full p-8">
      <PublicFacingNavbar isLoggedIn={data.isLoggedIn} />

      <div className="max-w-6xl w-full mx-auto mt-32 pb-32">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Try the beta today
        </h1>

        <p className="mt-6 text-base leading-7 xs:text-lg xs:leading-8 max-w-3xl">
          Mycelium is still under heavy development and testing and we're
          offering access to the beta to those interested in trying it out and
          helping us improve. The beta is not intended for production use.
        </p>

        <div className="mt-12 flex max-w-5xl">
          <div className="flex-1 lg:mr-28">
            <h3 className="text-lg font-medium text-warm-gray-900">
              Tell us more about why you're interested
            </h3>
            <Form method="post" className="mt-6 flex flex-col gap-8">
              <div>
                <div className="sm:col-span-2">
                  <div className="flex justify-between">
                    <label
                      htmlFor="usage-plans"
                      className="block text-sm font-medium text-warm-gray-900"
                    >
                      What do you plan on using Mycelium for?
                    </label>
                    <span
                      id="usage-plans-max"
                      className="ml-2 text-sm text-warm-gray-500"
                    >
                      Max. 500 characters
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <textarea
                      id="usage-plans"
                      name="usage-plans"
                      rows={4}
                      className="py-3 px-4 block w-full shadow-sm text-warm-gray-900 focus:ring-black focus:border-black border border-warm-gray-300 rounded-md"
                      aria-describedby="usage-plans-max"
                      aria-invalid={Boolean(
                        actionData?.fieldsErrors?.usagePlans
                      )}
                      aria-errormessage={
                        actionData?.fieldsErrors?.usagePlans
                          ? "usage-plans-error"
                          : undefined
                      }
                    />
                  </div>
                </div>

                {actionData?.fieldsErrors?.usagePlans ? (
                  <p
                    className="mt-2 text-sm text-red-500 font-medium"
                    role="alert"
                    id="usage-plans-error"
                  >
                    {actionData.fieldsErrors.usagePlans}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-warm-gray-900"
                >
                  Give us an email where we can keep you updated on your access
                  to the beta
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
                        ? "email-error"
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

              <div className="w-full">
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
                  Request Access
                </button>
              </div>
            </Form>
          </div>

          <img className="hidden lg:inline" src="/beta.png" alt="" />
        </div>
      </div>
    </div>
  );
}
