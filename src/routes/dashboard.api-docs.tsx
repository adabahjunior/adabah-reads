import { createFileRoute } from "@tanstack/react-router";
import { ApiDocsPage } from "@/components/dashboard/ApiDocsPage";

export const Route = createFileRoute("/dashboard/api-docs")({
  ssr: false,
  component: ApiDocsPage,
});
