import { createFileRoute } from "@tanstack/react-router";
import { BuyDataPage } from "@/components/dashboard/BuyDataPage";

export const Route = createFileRoute("/dashboard/buy")({
  ssr: false,
  component: BuyDataPage,
});
