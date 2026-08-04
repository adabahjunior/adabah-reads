import { createFileRoute } from "@tanstack/react-router";
import { AdminWithdrawalsPage } from "@/components/admin/AdminWithdrawalsPage";

export const Route = createFileRoute("/admin/withdrawals")({
  ssr: false,
  component: AdminWithdrawalsPage,
});
