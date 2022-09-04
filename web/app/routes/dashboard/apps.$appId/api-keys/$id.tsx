import {
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from "@heroicons/react/20/solid";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";
import clsx from "clsx";
import { nanoid } from "nanoid";
import { useState } from "react";
import { z } from "zod";
import { validateFormData } from "~/utils/actions";
import { db } from "~/utils/db.server";
import { requireUserSession } from "~/utils/session.server";

export async function loader({ params, request }: LoaderArgs) {
  await requireUserSession(request);

  const apiKey = await db.apiKey.findUnique({
    where: {
      id: params.id,
    },
    select: {
      name: true,
      secret: true,
      capabilities: true,
    },
  });

  if (!apiKey) {
    throw new Response("API Key Not Found", {
      status: 404,
    });
  }

  return json({ apiKey });
}

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
  secret: z.string().length(32, "Invalid secret").optional(),
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

  try {
    await db.apiKey.update({
      where: {
        id: params.id,
      },
      data: {
        name: formData.name ? formData.name : undefined,
        secret: formData.secret ? formData.secret : undefined,
        capabilities: formData.capabilities
          ? JSON.parse(formData.capabilities)
          : undefined,
      },
    });
  } catch (error) {
    return json<ActionData>(
      {
        formError: "Something went wrong updating the API Key, try again later",
      },
      { status: 500 }
    );
  }

  const { pathname, search } = new URL(request.url);
  return redirect(pathname + search);
}

export default function ApiKey() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [isSecretBlurred, setIsSecretBlurred] = useState(true);
  const [newSecret, setNewSecret] = useState<string>();
  const { state } = useTransition();
  const busy = state === "submitting";

  const resetSecret = () => {
    setNewSecret(nanoid(32));
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg w-full">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-black">
          API Key information
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
                defaultValue={data.apiKey.name}
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
              <p className="block text-sm font-medium text-gray-700">Secret</p>
              <p className="text-xs text-gray-700">
                The secret used to sign tokens and authenticate connections.
              </p>
            </div>
            <div className="mt-1 sm:mt-0 sm:col-span-2 flex flex-col gap-3 items-start">
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "text-gray-500 text-sm",
                    isSecretBlurred && "blur select-none"
                  )}
                >
                  {newSecret || data.apiKey.secret}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSecretBlurred((is) => !is);
                  }}
                >
                  <span className="sr-only">
                    {isSecretBlurred ? "Show" : "Hide"}
                  </span>
                  {isSecretBlurred ? (
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EyeSlashIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {newSecret ? (
                <input type="hidden" name="secret" value={newSecret} />
              ) : null}

              <button
                onClick={resetSecret}
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowPathIcon className="w-4 h-4" />

                <span>Reset secret</span>
              </button>

              <p className="text-xs text-gray-700">
                If you believe the secret has been leaked or something similar,
                you can reset it here. Don't forget to save changes.
              </p>
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
                defaultValue={JSON.stringify(data.apiKey.capabilities, null, 2)}
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
              {busy ? "Saving changes..." : "Save changes"}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
}
