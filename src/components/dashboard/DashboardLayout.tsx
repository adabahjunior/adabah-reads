import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Wallet,
  Package,
  Shield,
  KeyRound,
  BookOpen,
  MapPin,
  Tags,
} from "lucide-react";
import { BundleLoader } from "@/components/BundleLoader";
import { FloatingSupportButtons } from "@/components/dashboard/FloatingSupportButtons";
import { LiveStatusBar } from "@/components/dashboard/LiveStatusBar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const nav = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Buy Data", to: "/dashboard/buy", icon: ShoppingCart },
  { label: "Track Order", to: "/dashboard/track", icon: MapPin },
  { label: "Wallet", to: "/dashboard/wallet", icon: Wallet },
  { label: "My Orders", to: "/dashboard/orders", icon: FileText },
  { label: "Customers", to: "/dashboard/customers", icon: Users },
  { label: "Data Packages", to: "/dashboard/packages", icon: Tags },
  { label: "API Access", to: "/dashboard/api", icon: KeyRound },
  { label: "API Docs", to: "/dashboard/api-docs", icon: BookOpen },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
] as const;

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const { signOut, loading, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      void navigate("/auth");
      return;
    }
    if (!hasRole("reseller") && !hasRole("admin")) {
      void navigate("/auth");
    }
  }, [loading, isAuthenticated, hasRole, navigate]);

  if (loading) {
    return <BundleLoader fullScreen label="Loading dashboard" />;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:sticky",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border p-5">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="gold-gradient-static flex h-8 w-8 items-center justify-center rounded-lg">
              <Package className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight text-sidebar-foreground">
              Bundle<span className="text-sidebar-primary">Mart</span>
            </span>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {nav.map((item) => {
            const isActive =
              pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          {hasRole("admin") ? (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="mt-3 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
            >
              <Shield className="h-5 w-5" />
              Admin Panel
            </Link>
          ) : null}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => navigate("/auth"));
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4">
            <button type="button" onClick={() => setSidebarOpen(true)} className="text-muted-foreground lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Reseller Dashboard
            </h1>
          </div>
          <LiveStatusBar />
        </header>
        <main className="relative flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        <FloatingSupportButtons />
      </div>
    </div>
  );
}
