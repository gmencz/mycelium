import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { MenuIcon, XIcon } from "@heroicons/react/outline";
import { Link } from "@remix-run/react";

const navigation: { name: string; href: string }[] = [];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden h-full">
      <Popover as="header" className="relative">
        <div className="bg-stone-900 pt-16">
          <nav
            className="relative max-w-5xl mx-auto flex items-center justify-between px-8 sm:px-10"
            aria-label="Global"
          >
            <div className="flex items-center flex-1">
              <div className="flex items-center justify-between w-full md:w-auto">
                <a href="#" className="flex items-center gap-3">
                  <img className="h-10 w-auto" src="/logo.svg" alt="" />
                  <span className="text-white text-sm font-extrabold">
                    MYCELIUM
                  </span>
                </a>
                <div className="-mr-2 flex items-center md:hidden">
                  <Popover.Button className="bg-stone-900 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-800 focus:outline-none focus:ring-2 focus-ring-inset focus:ring-white">
                    <span className="sr-only">Open main menu</span>
                    <MenuIcon className="h-6 w-6" aria-hidden="true" />
                  </Popover.Button>
                </div>
              </div>
              <div className="hidden space-x-8 md:flex md:ml-10">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-base font-medium text-white hover:text-gray-300"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="hidden md:flex md:items-center md:space-x-6">
              <a
                href="#"
                className="inline-flex items-center px-4 py-2 border border-transparent text-lg font-medium rounded-md text-white bg-neutral-700 hover:bg-neutral-800"
              >
                Login
              </a>
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
                  <Popover.Button className="bg-stone-900 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500">
                    <span className="sr-only">Close menu</span>
                    <XIcon className="h-6 w-6" aria-hidden="true" />
                  </Popover.Button>
                </div>
              </div>
              <div className="pt-5 pb-6">
                <div className="px-2 space-y-1">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="block px-3 py-2 rounded-md text-base font-medium text-black hover:bg-gray-50"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="mt-6 px-5">
                  <a
                    href="#"
                    className="block text-center w-full py-3 px-4 rounded-md shadow bg-red-500 text-white font-medium hover:bg-red-600"
                  >
                    Login
                  </a>
                </div>
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>

      <main className="h-full">
        <div
          className="pt-10 h-full bg-stone-900 sm:pt-16 lg:pt-8 lg:pb-14 lg:overflow-hidden"
          style={{
            backgroundImage: "url(/map.png)",
            backgroundPosition: "center",
            backgroundSize: "1418px 686px",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="mx-auto max-w-5xl lg:px-8">
            <div className="px-8 py-24 flex flex-col items-center">
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

              <Link
                to="/sign-up"
                className="bg-red-500 text-center mt-12 py-4 px-8 text-white font-semibold rounded"
              >
                Create your free account
              </Link>
            </div>
          </div>
        </div>

        {/* More main page content here... */}
      </main>
    </div>
  );
}
