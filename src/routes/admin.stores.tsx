import { createFileRoute } from "@tanstack/react-router";
import { AdminStoresPage } from "@/components/admin/AdminStoresPage";

export const Route = createFileRoute("/admin/stores")({
  ssr: false,
  component: AdminStoresPage,
});
