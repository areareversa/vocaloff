import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-2xl bg-surface" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
