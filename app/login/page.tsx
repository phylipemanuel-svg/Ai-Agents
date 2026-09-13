import { redirect } from "next/navigation";
import { isAuthConfigured } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  if (!isAuthConfigured()) {
    redirect("/");
  }
  const { from } = await searchParams;

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <LoginForm redirectTo={from && from.startsWith("/") ? from : "/"} />
    </div>
  );
}
