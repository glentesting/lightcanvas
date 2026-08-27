import { redirect } from "next/navigation";

// Single-user tool: the app starts at the project list.
export default function RootPage() {
  redirect("/projects");
}
