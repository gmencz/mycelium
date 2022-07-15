import { Link } from "@remix-run/react";
import { Menu } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/outline";

interface NavigationItem {
  name: string;
  href?: string;
  dropdownItems?: { name: string; href: string }[];
}

const navigationItems: NavigationItem[] = [
  {
    name: "Features",
    dropdownItems: [
      {
        name: "Edge Pub/Sub",
        href: "/features/edge-pubsub",
      },
      {
        name: "Client SDKs",
        href: "/features/client-sdks",
      },
      {
        name: "Analytics",
        href: "/features/analytics",
      },
      {
        name: "REST API",
        href: "/features/rest-api",
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
  return (
    <header className="p-6 max-w-6xl w-full mx-auto flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        <span className="text-black text-xl font-black">Mycelium</span>
      </div>

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
                <Menu.Items>
                  {navigationItem.dropdownItems.map((dropdownItem) => (
                    <Menu.Item key={dropdownItem.name}>
                      {({ active }) => (
                        <Link to={dropdownItem.href}>{dropdownItem.name}</Link>
                      )}
                    </Menu.Item>
                  ))}
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
              to="/login"
              className="text-sm text-black font-bold bg-white py-2.5 px-8 rounded ring-2 ring-black"
            >
              Log in
            </Link>

            <Link
              to="/sign-up"
              className="text-sm text-white font-bold bg-black py-2.5 px-8 rounded ring-2 ring-black"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
