import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewPage } from "@/components/admin/AdminOverviewPage";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminOverviewPage,
});
