import { createFileRoute } from "@tanstack/react-router";
import { ResellerPackagesPage } from "@/components/dashboard/ResellerPackagesPage";

export const Route = createFileRoute("/dashboard/packages")({
  ssr: false,
  component: ResellerPackagesPage,
});
