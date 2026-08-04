import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/dashboard/OverviewPage";

export const Route = createFileRoute("/dashboard/")({
  ssr: false,
  component: OverviewPage,
});
