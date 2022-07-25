import type { LoaderArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { getUserId } from "~/utils/session.server";
import PublicFacingNavbar from "~/components/public-facing-navbar";

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}

export default function LandingPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="relative flex flex-col h-full p-8">
      <PublicFacingNavbar isLoggedIn={data.isLoggedIn} />

      <div className="max-w-6xl w-full mx-auto mt-32 flex flex-col xl:flex-row justify-between items-center gap-16">
        <div className="flex flex-col gap-8 items-start flex-1 max-w-xl w-full">
          <h1 className="text-[2.5rem] leading-[2.75rem] xs:text-6xl xs:leading-[4rem] flex flex-col gap-2 font-black">
            <span>Build fast &</span>
            <div>
              <span>reliable </span>
              <div className="inline-flex flex-col">
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-400">
                  real-time
                </span>
                <div className="inline rounded bg-gradient-to-r from-red-500 via-yellow-500 to-blue-400 h-2 w-full" />
              </div>{" "}
            </div>
            <span>experiences.</span>
          </h1>

          <p className="text-base leading-7 xs:text-lg xs:leading-8">
            Mycelium combines the best development experience with a globally
            distributed platform to give your users the snappiest of
            experiences.
          </p>

          <Link
            to="/request-beta-access"
            className="text-center rounded bg-gradient-to-r from-red-500 via-yellow-500 to-blue-400 py-4 px-8 font-bold w-full transition-transform hover:opacity-90"
          >
            Request Beta Access
          </Link>
        </div>

        <div className="bg-black rounded-full  w-full max-w-[550px] h-[450px] xs:h-[550px] flex items-center justify-center mb-8">
          <img src="/hero.png" className="max-w-[400px] w-full" alt="" />
        </div>
      </div>
    </div>
  );
}
