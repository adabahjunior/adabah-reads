import { createFileRoute } from "@tanstack/react-router";
import { AdminUserDetailPage } from "@/components/admin/AdminUserDetailPage";

export const Route = createFileRoute("/admin/resellers/$userId")({
  ssr: false,
  component: AdminUserDetailRoute,
});

function AdminUserDetailRoute() {
  const { userId } = Route.useParams();
  return <AdminUserDetailPage userId={userId} />;
}
