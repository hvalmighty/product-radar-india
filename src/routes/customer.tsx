import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession, clearSession, type CustomerSession } from "@/lib/customer-auth";
import { REGION_META } from "@/lib/region";
import { LayoutDashboard, ShoppingBag, LogOut, User } from "lucide-react";

export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "Customer Portal — mPower Wealth" },
      { name: "description", content: "Secure client login for portfolio review, risk profile, benchmark performance and new investment orders." },
    ],
  }),
  component: CustomerLayout,
});

function CustomerLayout() {
  const path = useRouterState({ select: r => r.location.pathname });
  const navigate = useNavigate();
  const [session, setSessionState] = useState<CustomerSession | null>(null);

  useEffect(() => {
    setSessionState(getSession());
  }, [path]);

  const isLogin = path === "/customer" || path === "/customer/login";

  useEffect(() => {
    if (!isLogin && !session && typeof window !== "undefined") {
      // Give effect one tick to read localStorage
      const s = getSession();
      if (!s) navigate({ to: "/customer/login" });
      else setSessionState(s);
    }
  }, [isLogin, session, navigate]);

  function onLogout() {
    clearSession();
    setSessionState(null);
    navigate({ to: "/customer/login" });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/customer/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-6 w-6 rounded bg-primary text-primary-foreground grid place-items-center text-xs">mP</span>
            <span>mPower Client Portal</span>
          </Link>

          {!isLogin && session && (
            <nav className="flex items-center gap-1">
              <Link to="/customer/dashboard" className={navCls(path === "/customer/dashboard")}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/customer/invest" className={navCls(path === "/customer/invest")}>
                <ShoppingBag className="w-4 h-4" /> Invest Now
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-3 text-sm">
            {session ? (
              <>
                <span className="hidden sm:flex items-center gap-1 text-muted-foreground">
                  <User className="w-4 h-4" /> {session.name}
                  <span className="ml-2 opacity-70">{REGION_META[session.region].flag}</span>
                </span>
                <button onClick={onLogout} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-accent">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <Link to="/" className="text-muted-foreground hover:text-foreground">RM Portal →</Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        For illustrative purposes only. Data shown is simulated.
      </footer>
    </div>
  );
}

function navCls(active: boolean) {
  return `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
  }`;
}
