import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/components/dashboard/CustomersPage";

export const Route = createFileRoute("/dashboard/customers")({
  ssr: false,
  component: CustomersPage,
});
