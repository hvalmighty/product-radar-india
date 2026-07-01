import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { availableInvestors, setSession } from "@/lib/customer-auth";
import { useRegion, REGION_META } from "@/lib/region";
import { LogIn, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/customer/login")({
  component: LoginPage,
});

const RISK_BY_INDEX: Array<"Conservative" | "Moderate" | "Balanced" | "Aggressive"> = [
  "Conservative", "Moderate", "Balanced", "Aggressive",
];

function LoginPage() {
  const { region, meta } = useRegion();
  const navigate = useNavigate();
  const investors = useMemo(() => availableInvestors(region), [region]);
  const [portfolioId, setPortfolioId] = useState(investors[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setPortfolioId(investors[0]?.id ?? "");
    const first = investors[0];
    if (first) {
      const slug = first.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
      setEmail(`${slug}@example.com`);
    }
  }, [investors]);

  function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const inv = investors.find(i => i.id === portfolioId);
    if (!inv) { setErr("Please select a client profile"); return; }
    if (!email.trim() || password.length < 4) { setErr("Enter a valid email and password"); return; }
    const idx = investors.findIndex(i => i.id === portfolioId);
    setSession({
      email: email.trim(),
      name: inv.name,
      portfolioId: inv.id,
      region,
      riskProfile: RISK_BY_INDEX[idx % RISK_BY_INDEX.length],
      loggedInAt: Date.now(),
    });
    navigate({ to: "/customer/dashboard" });
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="rounded-xl border border-border bg-card shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Client Login</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Access your consolidated portfolio, risk profile and place new investment orders.
          Region: <span className="font-medium">{meta.flag} {meta.label}</span>
        </p>

        <form className="space-y-3" onSubmit={onLogin}>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Client Profile (demo)</label>
            <select
              value={portfolioId}
              onChange={(e) => {
                setPortfolioId(e.target.value);
                const inv = investors.find(i => i.id === e.target.value);
                if (inv) {
                  const slug = inv.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
                  setEmail(`${slug}@example.com`);
                }
              }}
              className="mt-1 w-full h-9 px-2 rounded border border-border bg-background text-sm"
            >
              {investors.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.name}{inv.family ? ` — ${inv.family}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              className="mt-1 w-full h-9 px-2 rounded border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
              className="mt-1 w-full h-9 px-2 rounded border border-border bg-background text-sm" />
          </div>
          {err && <div className="text-xs text-negative">{err}</div>}
          <button type="submit" className="w-full h-9 rounded bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-primary/90">
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </form>

        <div className="mt-4 text-[11px] text-muted-foreground text-center">
          This is a demo portal. Any password of 4+ characters works.
        </div>
      </div>
    </div>
  );
}
