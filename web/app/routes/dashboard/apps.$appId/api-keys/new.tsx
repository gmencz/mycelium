import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { nanoid } from "nanoid";
import { z } from "zod";
import { validateFormData } from "~/utils/actions";
import { db } from "~/utils/db.server";

interface ActionData {
  fieldsErrors?: {
    name?: string;
    secret?: string;
    capabilities?: string;
  };

  formError?: string;
}

const actionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  capabilities: z
    .string()
    .min(1, "Capabilities are required")
    .refine(
      (val) => {
        let json;
        try {
          json = JSON.parse(val);
        } catch (error) {
          return false;
        }

        let hasInvalidKeys = Object.entries(json).some(
          ([k, v]) => typeof k !== "string" || typeof v !== "string"
        );

        return !hasInvalidKeys;
      },
      {
        message: "Invalid capabilities",
      }
    ),
});

type ActionInput = z.TypeOf<typeof actionSchema>;

export async function action({ request, params }: ActionArgs) {
  const { formData, errors } = await validateFormData<ActionInput>({
    request,
    schema: actionSchema,
  });

  if (errors) {
    return json<ActionData>({ fieldsErrors: errors }, { status: 400 });
  }

  if (!params.appId) {
    return json<ActionData>(
      { formError: `Invalid submission` },
      { status: 400 }
    );
  }

  try {
    const apiKey = await db.apiKey.create({
      data: {
        id: nanoid(),
        name: formData.name,
        secret: nanoid(32),
        capabilities: JSON.parse(formData.capabilities),
        appID: params.appId,
      },
    });

    return redirect(`/dashboard/apps/${params.appId}/api-keys/${apiKey.id}`);
  } catch (error) {
    return json<ActionData>(
      {
        formError: "Something went wrong creating the API Key, try again later",
      },
      { status: 500 }
    );
  }
}

export default function NewApiKey() {
  const actionData = useActionData<ActionData>();
  const { state } = useTransition();
  const busy = state === "submitting";

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg w-full">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-black">
          New API Key
        </h3>
      </div>
      <Form method="post" className="border-t border-gray-200">
        <div className="space-y-6 sm:space-y-5">
          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5 px-4 sm:px-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>

              <p className="text-xs text-gray-700">
                Something that helps you identify this key.
              </p>
            </div>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <input
                type="text"
                name="name"
                id="name"
                className="max-w-lg block w-full shadow-sm text-black focus:ring-black focus:border-black border-warm-gray-300 rounded-md sm:max-w-xs sm:text-sm"
                aria-invalid={Boolean(actionData?.fieldsErrors?.name)}
                aria-errormessage={
                  actionData?.fieldsErrors?.name ? "name-error" : undefined
                }
              />

              {actionData?.fieldsErrors?.name ? (
                <p
                  className="mt-2 text-sm text-red-500 font-medium"
                  role="alert"
                  id="name-error"
                >
                  {actionData.fieldsErrors.name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5 px-4 sm:px-6">
            <div>
              <label
                htmlFor="capabilities"
                className="block text-sm font-medium text-gray-700"
              >
                Capabilities
              </label>
              <p className="text-xs text-gray-700">
                The capabilities specify which operations (such as subscribe or
                publish) can be performed on which channels.
              </p>
            </div>
            <div className="mt-1 sm:mt-0 sm:col-span-2">
              <textarea
                defaultValue={JSON.stringify({ "*": "*" }, null, 2)}
                name="capabilities"
                rows={15}
                id="capabilities"
                className="block w-full shadow-sm text-black focus:ring-black focus:border-black border-warm-gray-300 rounded-md sm:text-sm"
                aria-invalid={Boolean(actionData?.fieldsErrors?.capabilities)}
                aria-errormessage={
                  actionData?.fieldsErrors?.capabilities
                    ? "capabilities-error"
                    : undefined
                }
              />

              {actionData?.fieldsErrors?.capabilities ? (
                <p
                  className="mt-2 text-sm text-red-500 font-medium"
                  role="alert"
                  id="capabilities-error"
                >
                  {actionData.fieldsErrors.capabilities}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-5 p-5 border-t border-gray-200">
          <div className="flex">
            {actionData?.formError ? (
              <p className="mr-4 text-sm text-red-500 font-medium" role="alert">
                {actionData.formError}
              </p>
            ) : null}

            <button
              type="submit"
              className="ml-auto text-sm text-white font-bold bg-black py-2 px-6 rounded ring-2 ring-black hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              {busy ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
}
