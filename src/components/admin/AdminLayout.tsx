import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Package,
  Tag,
  ArrowDownToLine,
  Wallet,
  Store,
  ShoppingCart,
} from "lucide-react";
import { BundleLoader } from "@/components/BundleLoader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const nav = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard },
  { label: "Orders", to: "/admin/orders", icon: FileText },
  { label: "Packages", to: "/admin/packages", icon: Tag },
  { label: "Resellers", to: "/admin/resellers", icon: Users },
  { label: "Top-ups", to: "/admin/topups", icon: Wallet },
  { label: "Withdrawals", to: "/admin/withdrawals", icon: ArrowDownToLine },
  { label: "Stores", to: "/admin/stores", icon: Store },
  { label: "Settings", to: "/admin/settings", icon: Settings },
] as const;

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, loading, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/auth" });
      return;
    }
    if (!hasRole("admin")) {
      void navigate({ to: "/dashboard" });
    }
  }, [loading, isAuthenticated, hasRole, navigate]);

  if (loading) {
    return <BundleLoader fullScreen label="Loading admin" />;
  }

  if (!isAuthenticated || !hasRole("admin")) return null;

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
          <Link to="/admin" className="flex items-center gap-2.5">
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
              pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
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
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="mt-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-sm font-medium text-primary"
          >
            <ShoppingCart className="h-5 w-5" />
            Reseller view
          </Link>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => navigate({ to: "/auth" }));
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
          <button type="button" onClick={() => setSidebarOpen(true)} className="text-muted-foreground lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Admin Panel
          </h1>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
