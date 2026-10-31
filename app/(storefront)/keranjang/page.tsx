import { redirect } from "next/navigation";

/**
 * Keranjang & checkout digabung jadi satu halaman (lihat desain D5) —
 * halaman ini tetap ada supaya bookmark/link lama tidak putus.
 */
export default function KeranjangRedirect() {
  redirect("/checkout");
}
