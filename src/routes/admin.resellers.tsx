import { createFileRoute } from "@tanstack/react-router";
import { AdminResellersPage } from "@/components/admin/AdminResellersPage";

export const Route = createFileRoute("/admin/resellers")({
  ssr: false,
  component: AdminResellersPage,
});
