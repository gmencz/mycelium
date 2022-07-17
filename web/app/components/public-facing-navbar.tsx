import { Link } from "@remix-run/react";
import { Menu } from "@headlessui/react";
import {
  ChevronDownIcon,
  CloudIcon,
  CodeIcon,
  TrendingUpIcon,
} from "@heroicons/react/outline";
import type { ComponentProps, FunctionComponent } from "react";
import clsx from "clsx";
import { useScrollPosition } from "~/utils/use-scroll-position";

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
    name: "Features",
    dropdownItems: [
      {
        name: "Edge Pub/Sub",
        description: "Power any real-time experience.",
        Icon: CloudIcon,
        href: "/features/edge-pubsub",
      },
      {
        name: "SDKs",
        description: "Start building with our SDKs.",
        Icon: CodeIcon,
        href: "/features/sdks",
      },
      {
        name: "Analytics",
        description: "Real-time insights into your products.",
        Icon: TrendingUpIcon,
        href: "/features/analytics",
      },
    ],
  },
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
  const scrollPosition = useScrollPosition();

  return (
    <header
      className={clsx(
        "px-8 py-4 bg-white w-full bg-opacity-80 backdrop-blur-sm fixed top-0 z-10",
        scrollPosition > 0 && "border-b border-gray-300"
      )}
    >
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-black">
          <img src="/logo.svg" alt="" className="h-7 w-7" />
          <span className="text-black text-xl font-black">Mycelium</span>
        </Link>

        {/* Navigation */}
        <nav>
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
                <li key={navigationItem.name} className="text-sm text-gray-700">
                  <Link to={navigationItem.href!}>{navigationItem.name}</Link>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Dashboard/Auth */}
        <div>
          {isLoggedIn ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
            </>
          ) : (
            <div className="flex gap-6">
              <Link
                to="/log-in"
                className="text-sm text-black font-extrabold bg-white py-2.5 px-6 rounded ring-2 ring-black"
              >
                Log in
              </Link>

              <Link
                to="/sign-up"
                className="text-sm text-white font-bold bg-black py-2.5 px-6 rounded ring-2 ring-black"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Logo */}
    </header>
  );
}
