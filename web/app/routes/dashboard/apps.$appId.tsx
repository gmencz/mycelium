import {
  AdjustmentsIcon,
  BookOpenIcon,
  ChartBarIcon,
  KeyIcon,
} from "@heroicons/react/outline";
import { NavLink, Outlet } from "@remix-run/react";
import clsx from "clsx";

const navigation = [
  { name: "Overview", to: ".", icon: BookOpenIcon, end: true },
  { name: "API Keys", to: "api-keys", icon: KeyIcon },
  { name: "Analytics", to: "analytics", icon: ChartBarIcon },
  { name: "Settings", to: "settings", icon: AdjustmentsIcon },
];

export default function AppLayout() {
  return (
    <div className="flex space-x-10">
      <nav className="space-y-1" aria-label="Sidebar">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                isActive
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-200",
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={clsx(
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-black",
                    "flex-shrink-0 -ml-1 mr-3 h-6 w-6"
                  )}
                  aria-hidden="true"
                />

                <span
                  className={clsx(
                    !isActive && "group-hover:text-black",
                    "truncate"
                  )}
                >
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
