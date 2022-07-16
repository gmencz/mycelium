import { Link, useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import TypeAnimation from "react-type-animation";
import { getUserId } from "~/utils/session.server";
import PublicFacingNavbar from "~/components/public-facing-navbar";

const pricingPlans = [
  {
    name: "Free",
    details:
      "Perfect for proof of concepts, development, MVPs and personal projects (no credit card required).",
    features: {
      monthlyPeakConnections: "1K",
      monthlyMaxMessages: "1M",
      developersSupport: false,
      restAPI: true,
      appsPerAccount: "3",
    },
  },
  {
    name: "Pay as you go",
    details: "$2.99 per 1M messages, $4.99 per 1K peak connections.",
    features: {
      monthlyPeakConnections: "Unlimited",
      monthlyMaxMessages: "Unlimited",
      developersSupport: true,
      restAPI: true,
      appsPerAccount: "Unlimited",
    },
  },
];

const exampleUseCasesSequenceDelay = 2000;

const exampleUseCasesSequence = [
  "in-app chats",
  exampleUseCasesSequenceDelay,
  "multiplayer games",
  exampleUseCasesSequenceDelay,
  "real-time charts",
  exampleUseCasesSequenceDelay,
  "food delivery",
  exampleUseCasesSequenceDelay,
  "virtual events",
  exampleUseCasesSequenceDelay,
  "notifications",
];

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}

export default function LandingPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="relative h-full">
      <PublicFacingNavbar isLoggedIn={data.isLoggedIn} />

      <div className="px-8 max-w-6xl w-full mx-auto mt-24 flex flex-col items-center">
        <h1 className="flex flex-col justify-center items-center text-black font-black text-8xl gap-1">
          <span>Real-time</span>
          <span>Platform</span>
          <span className="text-[#D3F5F9] bg-black px-6 py-4 rounded">
            For The Edge
          </span>
        </h1>

        <div>
          <p className="text-center mt-20 text-xl text-gray-700 font-semibold">
            Build better&nbsp;
            <TypeAnimation
              wrapper="span"
              sequence={exampleUseCasesSequence}
              repeat={Infinity}
            />
          </p>
        </div>

        {data.isLoggedIn ? (
          <Link
            to="/dashboard"
            className="mt-4 text-base text-black font-extrabold bg-[#D3F5F9] py-2.5 px-6 rounded ring-2 ring-black"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            to="/sign-up"
            className="mt-4 text-base text-black font-extrabold bg-[#D3F5F9] py-2.5 px-6 rounded ring-2 ring-black"
          >
            Start free now
          </Link>
        )}
      </div>
    </div>
  );
}
