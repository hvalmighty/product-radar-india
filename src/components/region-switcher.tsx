import { useRegion, REGION_META, type Region } from "@/lib/region";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Globe } from "lucide-react";

export function RegionSwitcher() {
  const { region, setRegion } = useRegion();
  const meta = REGION_META[region];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface/80 backdrop-blur text-xs font-medium hover:border-foreground/40 hover:bg-surface transition-colors"
          aria-label="Switch region"
        >
          <Globe className="w-3.5 h-3.5 opacity-70" />
          <span className="text-base leading-none">{meta.flag}</span>
          <span className="hidden sm:inline">{meta.label}</span>
          <span className="text-[10px] mono-num text-muted-foreground">{meta.currency}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-normal">
          Market Region
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(REGION_META) as Region[]).map((r) => {
          const m = REGION_META[r];
          const active = r === region;
          return (
            <DropdownMenuItem
              key={r}
              onSelect={() => setRegion(r)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg leading-none">{m.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{m.label}</div>
                <div className="text-[10px] text-muted-foreground mono-num">
                  {m.currency} · {m.locale}
                </div>
              </div>
              {active && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground leading-relaxed">
          Switches all product data, currency, indices and sample portfolios across every page.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
