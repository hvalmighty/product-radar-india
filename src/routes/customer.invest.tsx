import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/customer-auth";
import { ResearchTerminal } from "@/routes/index";

export const Route = createFileRoute("/customer/invest")({
  component: InvestPage,
});

function InvestPage() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!getSession()) { navigate({ to: "/customer/login" }); return; }
    setOk(true);
  }, [navigate]);
  if (!ok) return null;
  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Invest Now</span> — browse, compare and place orders across mutual funds, fixed deposits, insurance and other products. Same institutional screener your relationship manager uses.
        </div>
      </div>
      <ResearchTerminal />
    </div>
  );
}
