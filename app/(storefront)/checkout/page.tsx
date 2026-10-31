import { getCurrentCustomer } from "@/lib/customer-auth";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();

  return <CheckoutForm initialNama={customer?.nama ?? ""} initialWa={customer?.wa ?? ""} />;
}
