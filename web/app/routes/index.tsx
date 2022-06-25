import { Link } from "@remix-run/react";

export default function Index() {
  return (
    <div className="p-12">
      <h1>Mycelium</h1>

      <div className="mt-4 flex gap-4">
        <Link to="/login">Login</Link>
        <Link to="/sign-up">Sign up free</Link>
      </div>
    </div>
  );
}
