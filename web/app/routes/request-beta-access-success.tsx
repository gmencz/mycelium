import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import PublicFacingNavbar from "~/components/public-facing-navbar";
import { getUserId } from "~/utils/session.server";

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}

export default function RequestBetaAccessSuccess() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="relative flex flex-col h-full p-8">
      <PublicFacingNavbar isLoggedIn={data.isLoggedIn} />

      <div className="max-w-6xl w-full mx-auto mt-32 pb-32">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          We're reviewing your request!
        </h1>

        <p className="mt-6 text-base leading-7 xs:text-lg xs:leading-8">
          Thank you for wanting to try out the beta, we have received your
          request and will review it as soon as possible. If everything is good,
          we'll grant you access and send an email to{" "}
          <span className="font-bold">{email}</span>. Depending on how many
          requests we have, it normally takes between 1 and 5 business days to
          process your request.
        </p>

        <img
          className="mt-16 w-full max-w-md"
          src="/beta_thank_you.svg"
          alt=""
        />
      </div>
    </div>
  );
}
