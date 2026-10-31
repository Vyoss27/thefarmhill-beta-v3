"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { leaveWaitlist } from "@/lib/actions/waitlist";

export default function HapusWaitlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await leaveWaitlist({ productId });
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      aria-label="Hapus dari daftar diingatkan"
      className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
    >
      <X size={16} strokeWidth={1.75} />
    </button>
  );
}
