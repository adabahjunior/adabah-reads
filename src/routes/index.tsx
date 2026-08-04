import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BundleLoader } from "@/components/BundleLoader";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  ssr: false,
  component: HomeRedirect,
});

function HomeRedirect() {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    void navigate({ to: hasRole("admin") ? "/admin" : "/dashboard", replace: true });
  }, [loading, isAuthenticated, hasRole, navigate]);

  return <BundleLoader fullScreen label="BundleMart" />;
}
