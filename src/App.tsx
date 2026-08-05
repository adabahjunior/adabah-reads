import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthPage } from "@/components/AuthPage";
import { BundleLoader } from "@/components/BundleLoader";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminOrdersPage } from "@/components/admin/AdminOrdersPage";
import { AdminOverviewPage } from "@/components/admin/AdminOverviewPage";
import { AdminPackagesPage } from "@/components/admin/AdminPackagesPage";
import { AdminResellersPage } from "@/components/admin/AdminResellersPage";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { AdminStoresPage } from "@/components/admin/AdminStoresPage";
import { AdminTopupsPage } from "@/components/admin/AdminTopupsPage";
import { AdminUserDetailPage } from "@/components/admin/AdminUserDetailPage";
import { AdminWithdrawalsPage } from "@/components/admin/AdminWithdrawalsPage";
import { ApiAccessPage } from "@/components/dashboard/ApiAccessPage";
import { ApiDocsPage } from "@/components/dashboard/ApiDocsPage";
import { BuyDataPage } from "@/components/dashboard/BuyDataPage";
import { CustomersPage } from "@/components/dashboard/CustomersPage";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { OrdersPage } from "@/components/dashboard/OrdersPage";
import { OverviewPage } from "@/components/dashboard/OverviewPage";
import { ResellerPackagesPage } from "@/components/dashboard/ResellerPackagesPage";
import { SettingsPage } from "@/components/dashboard/SettingsPage";
import { TrackOrderPage } from "@/components/dashboard/TrackOrderPage";
import { WalletPage } from "@/components/dashboard/WalletPage";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function HomeRedirect() {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) navigate(isAuthenticated ? (hasRole("admin") ? "/admin" : "/dashboard") : "/auth", { replace: true });
  }, [hasRole, isAuthenticated, loading, navigate]);

  return <BundleLoader fullScreen label="BundleMart" />;
}

function AdminUserRoute() {
  const { userId } = useParams<{ userId: string }>();
  return userId ? <AdminUserDetailPage userId={userId} /> : <Navigate to="/admin/resellers" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="buy" element={<BuyDataPage />} />
            <Route path="track" element={<TrackOrderPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="packages" element={<ResellerPackagesPage />} />
            <Route path="api" element={<ApiAccessPage />} />
            <Route path="api-docs" element={<ApiDocsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="packages" element={<AdminPackagesPage />} />
            <Route path="resellers" element={<AdminResellersPage />} />
            <Route path="resellers/:userId" element={<AdminUserRoute />} />
            <Route path="topups" element={<AdminTopupsPage />} />
            <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="stores" element={<AdminStoresPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
