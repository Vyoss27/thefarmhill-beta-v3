import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import LogoutButton from "./LogoutButton";
import AdminNav from "./AdminNav";
import AdminBottomTabBar from "./AdminBottomTabBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  const pendingCount = await db.order.count({ where: { status: "menunggu_konfirmasi" } });
  const today = new Date().toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="flex min-h-screen bg-[var(--surface-app)] text-[var(--text-body)]">
      <AdminNav pendingCount={pendingCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center gap-4 border-b border-[var(--border-default)] bg-[var(--surface-card)] px-4 sm:px-7">
          <span className="hidden text-[13px] text-[var(--text-muted)] sm:inline">{today} WIB</span>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <Bell size={18} strokeWidth={1.75} className="hidden text-[var(--text-muted)] sm:block" />
            <span className="text-sm text-[var(--text-body)]">
              {staff.nama} · <span className="text-[var(--text-muted)]">{staff.role}</span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-7 sm:py-7 md:pb-7">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
      <AdminBottomTabBar pendingCount={pendingCount} />
    </div>
  );
}
