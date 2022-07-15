import { useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
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

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}

export default function LandingPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="relative h-full bg-white">
      <PublicFacingNavbar isLoggedIn={data.isLoggedIn} />
    </div>
  );
}
