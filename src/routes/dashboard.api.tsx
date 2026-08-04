import { createFileRoute } from "@tanstack/react-router";
import { ApiAccessPage } from "@/components/dashboard/ApiAccessPage";

export const Route = createFileRoute("/dashboard/api")({
  ssr: false,
  component: ApiAccessPage,
});
