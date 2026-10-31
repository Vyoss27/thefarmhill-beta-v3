"use client";

import { createClient } from "@/lib/supabase/client";

export default function CustomerLogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button type="button" onClick={handleLogout} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-link)]">
      Keluar
    </button>
  );
}
