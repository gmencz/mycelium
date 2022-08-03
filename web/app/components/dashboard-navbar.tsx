import { Form, Link, NavLink } from "@remix-run/react";
import clsx from "clsx";

interface DashboardNavbarProps {
  username: string;
}

const navigationItems = [{ name: "Apps", to: "/dashboard", end: true }];

export default function DashboardNavbar({ username }: DashboardNavbarProps) {
  return (
    <div className="border-b border-gray-300 pt-4 px-8 bg-white bg-opacity-75">
      <div className="flex flex-col gap-4 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-12 justify-between">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="flex items-center text-black">
              <img src="/logo.svg" alt="Mycelium" className="h-7 w-7" />
            </Link>

            <svg
              className="text-gray-400"
              fill="none"
              height="32"
              shapeRendering="geometricPrecision"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              viewBox="0 0 24 24"
              width="32"
            >
              <path d="M16.88 3.549L7.12 20.451"></path>
            </svg>

            <span className="font-bold">{username}</span>
          </div>

          <Form method="post" action="/log-out">
            <button
              type="submit"
              className="text-sm text-black font-extrabold bg-white py-2 px-6 rounded ring-2 ring-black hover:bg-gray-200"
            >
              Log Out
            </button>
          </Form>
        </div>

        <ul className="flex items-center gap-6">
          {navigationItems.map((navigationItem) => (
            <li key={navigationItem.name}>
              <NavLink
                to={navigationItem.to}
                end={navigationItem.end}
                className={({ isActive }) =>
                  clsx("font-medium", isActive ? "text-black" : "text-gray-500")
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="mb-2 block">{navigationItem.name}</span>

                    {isActive ? (
                      <div className="w-full h-[3px] bg-black rounded-full" />
                    ) : (
                      <div className="w-full h-[3px] bg-transparent rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
