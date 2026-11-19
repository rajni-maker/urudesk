import LoginForm from "./LoginForm";

const ERRORS: Record<string, string> = {
  invalid_link: "That link is invalid or has expired. Ask your admin for a new invite, or log in below.",
  auth: "That link is invalid or has expired. Ask your admin for a new invite, or log in below.",
  no_profile: "Your account isn't set up yet. Ask your admin to finish setting it up.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <LoginForm linkError={(error && ERRORS[error]) || null} />;
}
