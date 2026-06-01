import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  switch (session.user.role) {
    case "EMPLOYEE":
      redirect("/employee");
    case "MANAGER":
      redirect("/admin");
    case "INSPECTOR":
      redirect("/inspector");
    default:
      redirect("/login");
  }
}
