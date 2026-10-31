import { redirect } from "next/navigation";

/**
 * Login admin/sales sekarang satu pintu dengan pelanggan di /login —
 * sistem yang menentukan tujuan setelah autentikasi (lihat
 * lib/actions/login-destination.ts). Halaman ini tetap ada supaya
 * bookmark/link lama tidak putus.
 */
export default function AdminLoginRedirect() {
  redirect("/login");
}
