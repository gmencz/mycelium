import { Link } from "@remix-run/react";
import { Menu, Popover, Transition } from "@headlessui/react";
import {
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import type { ComponentProps, FunctionComponent } from "react";
import { Fragment } from "react";
import clsx from "clsx";

interface NavigationItem {
  name: string;
  href?: string;
  dropdownItems?: {
    name: string;
    description: string;
    href: string;
    Icon: FunctionComponent<ComponentProps<"svg">>;
  }[];
}

const navigationItems: NavigationItem[] = [
  {
    name: "Pricing",
    href: "/pricing",
  },
  {
    name: "Docs",
    href: "/docs",
  },
];

interface PublicFacingNavbarProps {
  isLoggedIn: boolean;
}

export default function PublicFacingNavbar({
  isLoggedIn,
}: PublicFacingNavbarProps) {
  return (
    <header>
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-black">
          <img src="/logo.svg" alt="" className="h-7 w-7" />
          <span className="text-black text-xl font-black">Mycelium</span>
        </Link>

        <Popover>
          <Popover.Button className="bg-gray-50 md:hidden rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black">
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </Popover.Button>

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
              className="absolute z-10 top-0 inset-x-0 p-2 transition transform origin-top-right md:hidden"
            >
              <div className="rounded-lg shadow-md bg-white ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div className="px-5 pt-4 flex items-center justify-between">
                  <div>
                    <Link to="/" className="flex items-center gap-2 text-black">
                      <img src="/logo.svg" alt="" className="h-7 w-7" />
                      <span className="text-black text-xl font-black">
                        Mycelium
                      </span>
                    </Link>
                  </div>
                  <div className="-mr-2">
                    <Popover.Button className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black">
                      <span className="sr-only">Close menu</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </Popover.Button>
                  </div>
                </div>
                <ul className="px-2 pt-2 pb-3">
                  {navigationItems.map((navigationItem) => (
                    <li key={navigationItem.name}>
                      <Link
                        className="block w-full px-5 py-3 text-center font-medium text-gray-800 hover:text-black bg-white hover:bg-gray-100"
                        to={navigationItem.href!}
                      >
                        {navigationItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>

        {/* Navigation */}
        <nav className="hidden md:block">
          <ul className="flex gap-8 items-center">
            {navigationItems.map((navigationItem) =>
              navigationItem.dropdownItems ? (
                <Menu
                  as="li"
                  key={navigationItem.name}
                  className="text-sm text-gray-700"
                >
                  <Menu.Button className="flex">
                    <span>{navigationItem.name}</span>
                    <ChevronDownIcon className="w-3.5 h-3.5 flex mt-1 ml-1.5 text-gray-700" />
                  </Menu.Button>

                  <Menu.Items className="absolute w-full left-0 top-full py-10 px-8 bg-white border-t border-t-gray-300 shadow-sm shadow-gray-300 flex justify-center">
                    <div className="flex gap-10">
                      {navigationItem.dropdownItems.map((dropdownItem) => (
                        <Menu.Item key={dropdownItem.name}>
                          {({ active }) => (
                            <Link
                              to={dropdownItem.href}
                              className={clsx(
                                "flex items-center gap-3 p-6 rounded",
                                active && "bg-gray-50 ring-gray-300 ring-1"
                              )}
                            >
                              <div className="w-11 h-11 bg-black rounded-full flex items-center justify-center">
                                <dropdownItem.Icon className="w-6 h-6 text-white " />
                              </div>

                              <div className="flex flex-col gap-1">
                                <span className="text-black font-bold">
                                  {dropdownItem.name}
                                </span>
                                <p>{dropdownItem.description}</p>
                              </div>
                            </Link>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Menu>
              ) : (
                <li
                  key={navigationItem.name}
                  className="text-sm font-medium text-gray-800 hover:text-black"
                >
                  <Link to={navigationItem.href!}>{navigationItem.name}</Link>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Dashboard/Auth */}
        <div className="hidden md:block">
          {isLoggedIn ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-white font-bold bg-black py-2 px-6 rounded ring-2 ring-black hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <div className="flex gap-6">
              <Link
                to="/log-in"
                className="text-sm text-black font-extrabold bg-white py-2 px-6 rounded ring-2 ring-black hover:bg-gray-200"
              >
                Log in
              </Link>

              <Link
                to="/request-beta-access"
                className="text-sm text-white font-bold bg-black py-2 px-6 rounded ring-2 ring-black hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Request Beta Access
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Logo */}
    </header>
  );
}
