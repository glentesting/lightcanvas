import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex items-center justify-center min-h-screen flex-col">
      <SignUp fallbackRedirectUrl="/dashboard" />
      <p className="text-xs mt-4 text-center" style={{ color: "var(--ink-3)", maxWidth: 360 }}>
        By signing up you agree to our{" "}
        <a href="/legal/terms" style={{ color: "var(--accent)", textDecoration: "underline" }}>Terms of Service</a>
        {" "}and{" "}
        <a href="/legal/privacy" style={{ color: "var(--accent)", textDecoration: "underline" }}>Privacy Policy</a>.
      </p>
    </main>
  );
}
