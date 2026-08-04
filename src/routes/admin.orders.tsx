import { createFileRoute } from "@tanstack/react-router";
import { AdminOrdersPage } from "@/components/admin/AdminOrdersPage";

export const Route = createFileRoute("/admin/orders")({
  ssr: false,
  component: AdminOrdersPage,
});
