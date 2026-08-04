import { createFileRoute } from "@tanstack/react-router";
import { AdminTopupsPage } from "@/components/admin/AdminTopupsPage";

export const Route = createFileRoute("/admin/topups")({
  ssr: false,
  component: AdminTopupsPage,
});
