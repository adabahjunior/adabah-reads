import { createFileRoute } from "@tanstack/react-router";
import { AdminPackagesPage } from "@/components/admin/AdminPackagesPage";

export const Route = createFileRoute("/admin/packages")({
  ssr: false,
  component: AdminPackagesPage,
});
