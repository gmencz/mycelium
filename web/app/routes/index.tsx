import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { CheckIcon, MenuIcon, XIcon } from "@heroicons/react/outline";
import { Link, useLoaderData } from "@remix-run/react";
import SectionShadow from "~/components/section-shadow";
import type { LoaderFunction } from "@remix-run/node";
import { getUserId } from "~/utils/session.server";

const navigation: { name: string; href: string }[] = [];

const pricingPlans = [
  {
    name: "Free",
    details:
      "Perfect for proof of concepts, development, MVPs and personal projects (no credit card required).",
    features: {
      monthlyPeakConnections: "500",
      monthlyMaxMessages: "5 million",
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

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  return {
    userId,
  };
};

interface LoaderData {
  userId: string;
}

export default function LandingPage() {
  const { userId } = useLoaderData<LoaderData>();

  return (
    <div className="relative bg-black">
      <Popover as="header" className="relative">
        <div>
          <nav
            className="relative py-14 max-w-5xl mx-auto flex items-center justify-between px-8 sm:px-10"
            aria-label="Global"
          >
            <div className="flex items-center flex-1">
              <div className="flex items-center justify-between w-full md:w-auto">
                <Link to="/" className="flex items-center gap-3">
                  <img className="h-10 w-auto" src="/logo.svg" alt="" />
                  <span className="text-white text-base font-extrabold">
                    MYCELIUM
                  </span>
                </Link>
                <div className="-mr-2 flex items-center md:hidden">
                  <Popover.Button className="bg-black rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus-ring-inset focus:ring-white">
                    <span className="sr-only">Open main menu</span>
                    <MenuIcon className="h-6 w-6" aria-hidden="true" />
                  </Popover.Button>
                </div>
              </div>
              <div className="hidden space-x-8 md:flex md:ml-10">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-base font-medium text-white hover:text-gray-300"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hidden md:flex md:items-center md:space-x-6">
              {userId ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-lg font-medium rounded-md text-white bg-neutral-700 hover:bg-neutral-800"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-lg font-medium rounded-md text-white bg-neutral-700 hover:bg-neutral-800"
                >
                  Login
                </Link>
              )}
            </div>
          </nav>
        </div>

        <Transition
          as={Fragment}
          enter="duration-150 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="duration-100 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Popover.Panel
            focus
            className="absolute z-10 top-0 inset-x-0 p-2 transition transform origin-top md:hidden"
          >
            <div className="rounded-lg shadow-md bg-stone-800 ring-1 ring-black ring-opacity-5 overflow-hidden">
              <div className="px-5 pt-4 flex items-center justify-between">
                <div>
                  <img className="h-8 w-auto" src="/logo.svg" alt="" />
                </div>
                <div className="-mr-2">
                  <Popover.Button className="bg-black rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500">
                    <span className="sr-only">Close menu</span>
                    <XIcon className="h-6 w-6" aria-hidden="true" />
                  </Popover.Button>
                </div>
              </div>
              <div className="pt-5 pb-6">
                <div className="px-2 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block px-3 py-2 rounded-md text-base font-medium text-black hover:bg-gray-50"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="mt-6 px-5">
                  {userId ? (
                    <Link
                      to="/login"
                      className="block text-center w-full py-3 px-4 rounded-md shadow bg-red-500 text-white font-medium hover:bg-red-600"
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="block text-center w-full py-3 px-4 rounded-md shadow bg-red-500 text-white font-medium hover:bg-red-600"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>

      <main className="h-full bg-black">
        <div
          className="pt-10 h-full  sm:pt-16 lg:pt-8 lg:pb-14 lg:overflow-hidden"
          style={{
            backgroundImage: "url(/map.png)",
            backgroundPosition: "bottom",
            backgroundSize: "1418px 686px",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="mx-auto max-w-5xl lg:px-8">
            <div className="px-8 pb-24 pt-12 flex flex-col items-center">
              <h1 className="mt-4 text-center tracking-tight font-extrabold break-all text-white sm:mt-5 lg:mt-6 text-6xl sm:text-8xl">
                <span className="block">Serverless</span>
                <span className="block mt-2">Realtime</span>
                <span className="block mt-2 text-red-500">for the edge</span>
              </h1>

              <h2 className="mt-10 text-center tracking-tight font-semibold text-white text-2xl">
                <span className="block text-stone-300">
                  Runs All Over The World
                </span>
                <span className="block mt-2 text-stone-300">Pay Per Use</span>
              </h2>

              {!userId ? (
                <Link
                  to="/sign-up"
                  className="bg-red-500 text-center text-base sm:text-lg mt-12 py-4 px-8 text-white font-semibold rounded hover:bg-red-600"
                >
                  Create your free account
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden mt-12">
          <SectionShadow />

          <div className="pt-24 max-w-7xl mx-auto text-center relative px-4 sm:px-6 lg:px-8 z-20">
            <div className="max-w-3xl mx-auto space-y-6 lg:max-w-none">
              <h2 className="text-5xl leading-6 font-extrabold text-white">
                Pricing
              </h2>
              <p className="text-lg text-gray-400">
                🌔 Pay only for what you use and dynamically scale to the moon
                🌖
              </p>
            </div>

            <div className="pb-14 pt-12 sm:pb-16 lg:pb-24">
              <div className="grid grid-cols-3">
                <div></div>
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.name}
                    className="text-2xl font-bold text-white p-5"
                  >
                    {plan.name}
                  </div>
                ))}

                <div className="col-span-3">
                  <div className="h-[1px] bg-stone-800"></div>
                </div>

                <div className="p-5 text-gray-300">
                  Monthly Peak Connections
                </div>
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.features.monthlyPeakConnections}
                    className="p-5 text-white"
                  >
                    {plan.features.monthlyPeakConnections}
                  </div>
                ))}
                <div className="col-span-3">
                  <div className="h-[1px] bg-stone-800"></div>
                </div>

                <div className="p-5 text-gray-300">Monthly Messages Limit</div>
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.features.monthlyMaxMessages}
                    className="p-5 text-white"
                  >
                    {plan.features.monthlyMaxMessages}
                  </div>
                ))}
                <div className="col-span-3">
                  <div className="h-[1px] bg-stone-800"></div>
                </div>

                <div className="p-5 text-gray-300">Apps Per Account</div>
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.features.appsPerAccount}
                    className="p-5 text-white"
                  >
                    {plan.features.appsPerAccount}
                  </div>
                ))}
                <div className="col-span-3">
                  <div className="h-[1px] bg-stone-800"></div>
                </div>

                <div className="p-5 text-gray-300">REST API</div>
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.name}
                    className="p-5 text-white flex items-center justify-center"
                  >
                    {plan.features.restAPI ? (
                      <CheckIcon className="h-6 w-6 text-green-400" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400 text-2xl"
                      >
                        <path d="M5 12h14"></path>
                      </svg>
                    )}
                  </div>
                ))}
                <div className="col-span-3">
                  <div className="h-[1px] bg-stone-800"></div>
                </div>

                <div className="p-5 text-gray-300">Technical Support</div>
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.name}
                    className="p-5 text-white flex items-center justify-center"
                  >
                    {plan.features.developersSupport ? (
                      <CheckIcon className="h-6 w-6 text-green-400" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400 text-2xl"
                      >
                        <path d="M5 12h14"></path>
                      </svg>
                    )}
                  </div>
                ))}
                <div className="col-span-3">
                  <div className="h-[1px] bg-stone-800"></div>
                </div>

                <div></div>
                {pricingPlans.map((plan) => (
                  <div key={plan.name} className="text-white text-sm p-5">
                    {plan.details}
                  </div>
                ))}

                {!userId ? (
                  <>
                    <div className="col-span-3">
                      <div className="h-[1px] bg-stone-800"></div>
                    </div>

                    <div></div>
                    <div className="p-5">
                      <Link
                        to="/sign-up"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-neutral-700 hover:bg-neutral-800"
                      >
                        Get started
                      </Link>
                    </div>

                    <div className="p-5">
                      <Link
                        to="/sign-up"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
                      >
                        Get started
                      </Link>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
