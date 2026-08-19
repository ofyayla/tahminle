import BottomNav from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
