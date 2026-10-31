import { createClient } from "@supabase/supabase-js";

/**
 * Client service-role — bypass RLS. Hanya dipakai di server action/route
 * handler untuk kasus yang butuh akses tanpa sesi user (mis. upload bukti
 * bayar oleh pelanggan tamu yang tidak login). Jangan pernah diekspos ke
 * client.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
