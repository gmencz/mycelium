import { Form } from "@remix-run/react";

export default function Login() {
  return (
    <div className="p-12">
      <h1>Login</h1>

      <Form>
        <input type="text" />
      </Form>
    </div>
  );
}
