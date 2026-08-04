import { createFileRoute } from "@tanstack/react-router";
import { WalletPage } from "@/components/dashboard/WalletPage";

export const Route = createFileRoute("/dashboard/wallet")({
  ssr: false,
  component: WalletPage,
});
