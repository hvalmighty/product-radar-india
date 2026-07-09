import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  UserCircle2,
  ShieldCheck,
  Gauge,
  Target,
  Landmark,
  ClipboardCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Upload,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Investor Onboarding — Mutual Funds | mPower Wealth" },
      {
        name: "description",
        content:
          "Guided onboarding journey for new mutual fund investors — KYC, risk profiling, goal planning, bank & nominee capture and a suggested starter portfolio.",
      },
    ],
  }),
  component: OnboardingPage,
});

type StepId = "personal" | "kyc" | "risk" | "goals" | "bank" | "review" | "done";

interface Step {
  id: StepId;
  title: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { id: "personal", title: "Personal Details", short: "Personal", icon: UserCircle2 },
  { id: "kyc", title: "KYC Verification", short: "KYC", icon: ShieldCheck },
  { id: "risk", title: "Risk Profiling", short: "Risk", icon: Gauge },
  { id: "goals", title: "Investment Goals", short: "Goals", icon: Target },
  { id: "bank", title: "Bank & Nominee", short: "Bank", icon: Landmark },
  { id: "review", title: "Review & Confirm", short: "Review", icon: ClipboardCheck },
];

interface FormState {
  fullName: string;
  dob: string;
  gender: "male" | "female" | "other" | "";
  email: string;
  mobile: string;
  city: string;
  pan: string;
  aadhaarLast4: string;
  panVerified: boolean;
  aadhaarVerified: boolean;
  income: "<5L" | "5-10L" | "10-25L" | "25L-1Cr" | ">1Cr" | "";
  occupation: string;
  riskAnswers: Record<string, number>;
  goals: Array<{ name: string; horizonYears: number; targetLakh: number; sipMonthly: number }>;
  bankName: string;
  ifsc: string;
  accountLast4: string;
  nomineeName: string;
  nomineeRelation: string;
  agreed: boolean;
}

const RISK_QUESTIONS = [
  {
    q: "What is your primary investment objective?",
    opts: ["Capital protection", "Steady income", "Balanced growth", "Aggressive growth"],
  },
  {
    q: "How long can you stay invested without needing this money?",
    opts: ["< 1 year", "1–3 years", "3–7 years", "> 7 years"],
  },
  {
    q: "If your portfolio drops 20% in a year, you would:",
    opts: ["Exit fully", "Reduce allocation", "Hold", "Invest more"],
  },
  {
    q: "How much investing experience do you have?",
    opts: ["None", "Only FDs / savings", "Some MF / equity", "Active investor"],
  },
  {
    q: "What share of your savings goes into market-linked products?",
    opts: ["< 10%", "10–25%", "25–50%", "> 50%"],
  },
];

function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    dob: "",
    gender: "",
    email: "",
    mobile: "",
    city: "",
    pan: "",
    aadhaarLast4: "",
    panVerified: false,
    aadhaarVerified: false,
    income: "",
    occupation: "",
    riskAnswers: {},
    goals: [
      { name: "Retirement", horizonYears: 20, targetLakh: 200, sipMonthly: 15000 },
    ],
    bankName: "",
    ifsc: "",
    accountLast4: "",
    nomineeName: "",
    nomineeRelation: "",
    agreed: false,
  });

  const current = STEPS[stepIndex];
  const isDone = stepIndex >= STEPS.length;

  const riskScore = useMemo(() => {
    const vals = Object.values(form.riskAnswers);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
  }, [form.riskAnswers]);

  const riskBand = useMemo(() => {
    if (riskScore < 30) return { label: "Conservative", color: "text-emerald-600", bg: "bg-emerald-500/10" };
    if (riskScore < 55) return { label: "Moderate", color: "text-sky-600", bg: "bg-sky-500/10" };
    if (riskScore < 80) return { label: "Balanced", color: "text-amber-600", bg: "bg-amber-500/10" };
    return { label: "Aggressive", color: "text-rose-600", bg: "bg-rose-500/10" };
  }, [riskScore]);

  const suggestedAllocation = useMemo(() => {
    const band = riskBand.label;
    if (band === "Conservative") return { equity: 20, debt: 65, gold: 10, cash: 5 };
    if (band === "Moderate") return { equity: 40, debt: 45, gold: 10, cash: 5 };
    if (band === "Balanced") return { equity: 60, debt: 30, gold: 7, cash: 3 };
    return { equity: 80, debt: 12, gold: 5, cash: 3 };
  }, [riskBand]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canProceed(): { ok: boolean; msg?: string } {
    switch (current?.id) {
      case "personal":
        if (!form.fullName.trim()) return { ok: false, msg: "Enter full name" };
        if (!form.dob) return { ok: false, msg: "Enter date of birth" };
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return { ok: false, msg: "Enter a valid email" };
        if (!/^\d{10}$/.test(form.mobile)) return { ok: false, msg: "Enter a 10-digit mobile" };
        return { ok: true };
      case "kyc":
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan.toUpperCase()))
          return { ok: false, msg: "Enter a valid PAN (e.g. ABCDE1234F)" };
        if (!/^\d{4}$/.test(form.aadhaarLast4))
          return { ok: false, msg: "Enter last 4 digits of Aadhaar" };
        if (!form.panVerified || !form.aadhaarVerified)
          return { ok: false, msg: "Verify PAN and Aadhaar to continue" };
        if (!form.income) return { ok: false, msg: "Select annual income" };
        return { ok: true };
      case "risk":
        if (Object.keys(form.riskAnswers).length < RISK_QUESTIONS.length)
          return { ok: false, msg: "Answer all risk questions" };
        return { ok: true };
      case "goals":
        if (form.goals.length === 0) return { ok: false, msg: "Add at least one goal" };
        return { ok: true };
      case "bank":
        if (!form.bankName.trim()) return { ok: false, msg: "Enter bank name" };
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase()))
          return { ok: false, msg: "Enter a valid IFSC" };
        if (!/^\d{4}$/.test(form.accountLast4))
          return { ok: false, msg: "Enter last 4 digits of account" };
        if (!form.nomineeName.trim()) return { ok: false, msg: "Enter nominee name" };
        return { ok: true };
      case "review":
        if (!form.agreed) return { ok: false, msg: "Accept terms to submit" };
        return { ok: true };
      default:
        return { ok: true };
    }
  }

  const proceed = canProceed();
  const [showError, setShowError] = useState(false);

  function next() {
    if (!proceed.ok) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setStepIndex((i) => i + 1);
  }
  function back() {
    setShowError(false);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (isDone) {
    return <SuccessScreen form={form} riskBand={riskBand.label} allocation={suggestedAllocation} onReset={() => { setStepIndex(0); }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-medium uppercase tracking-wider">Investor Onboarding</span>
          </div>
          <h1 className="text-2xl font-semibold">Start your mutual fund journey</h1>
          <p className="text-sm text-muted-foreground">
            A guided 6-step flow — KYC, risk profile, goals and a starter portfolio, in under 5 minutes.
          </p>
        </header>

        <Stepper stepIndex={stepIndex} />

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            <current.icon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">{current.title}</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
          </div>

          <div className="p-5">
            {current.id === "personal" && <PersonalStep form={form} update={update} />}
            {current.id === "kyc" && <KycStep form={form} update={update} />}
            {current.id === "risk" && (
              <RiskStep form={form} update={update} score={riskScore} band={riskBand} />
            )}
            {current.id === "goals" && <GoalsStep form={form} update={update} />}
            {current.id === "bank" && <BankStep form={form} update={update} />}
            {current.id === "review" && (
              <ReviewStep form={form} update={update} band={riskBand.label} allocation={suggestedAllocation} />
            )}
          </div>

          {showError && !proceed.ok && (
            <div className="mx-5 mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {proceed.msg}
            </div>
          )}

          <div className="border-t border-border px-5 py-3 flex items-center justify-between">
            <button
              onClick={back}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={next}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {stepIndex === STEPS.length - 1 ? "Submit" : "Continue"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ stepIndex }: { stepIndex: number }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((s, i) => {
        const active = i === stepIndex;
        const done = i < stepIndex;
        return (
          <li key={s.id} className="flex items-center flex-1 min-w-fit">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs whitespace-nowrap border ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : done
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                  : "bg-muted/40 text-muted-foreground border-border"
              }`}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="font-medium">{i + 1}. {s.short}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 ${done ? "bg-emerald-500/40" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function PersonalStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Full name (as on PAN)">
        <input className={inputCls} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Ravi Kumar" />
      </Field>
      <Field label="Date of birth">
        <input type="date" className={inputCls} value={form.dob} onChange={(e) => update("dob", e.target.value)} />
      </Field>
      <Field label="Gender">
        <select className={inputCls} value={form.gender} onChange={(e) => update("gender", e.target.value as FormState["gender"])}>
          <option value="">Select…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="City">
        <input className={inputCls} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" />
      </Field>
      <Field label="Email">
        <input type="email" className={inputCls} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
      </Field>
      <Field label="Mobile" hint="10-digit Indian mobile number">
        <input inputMode="numeric" maxLength={10} className={inputCls} value={form.mobile} onChange={(e) => update("mobile", e.target.value.replace(/\D/g, ""))} placeholder="9876543210" />
      </Field>
    </div>
  );
}

function KycStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          KYC is verified once with CVL / KRA and is portable across all mutual funds. Your Aadhaar OTP flow is simulated in this demo.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="PAN">
          <div className="flex gap-2">
            <input
              className={inputCls + " uppercase"}
              value={form.pan}
              maxLength={10}
              onChange={(e) => update("pan", e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
            />
            <button
              type="button"
              disabled={form.pan.length !== 10}
              onClick={() => update("panVerified", true)}
              className="px-3 h-9 rounded-md text-xs bg-primary text-primary-foreground disabled:opacity-40"
            >
              {form.panVerified ? "Verified ✓" : "Verify"}
            </button>
          </div>
        </Field>
        <Field label="Aadhaar (last 4)">
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={4}
              className={inputCls}
              value={form.aadhaarLast4}
              onChange={(e) => update("aadhaarLast4", e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
            />
            <button
              type="button"
              disabled={form.aadhaarLast4.length !== 4}
              onClick={() => update("aadhaarVerified", true)}
              className="px-3 h-9 rounded-md text-xs bg-primary text-primary-foreground disabled:opacity-40"
            >
              {form.aadhaarVerified ? "OTP Verified ✓" : "Send OTP"}
            </button>
          </div>
        </Field>
        <Field label="Annual income">
          <select
            className={inputCls}
            value={form.income}
            onChange={(e) => update("income", e.target.value as FormState["income"])}
          >
            <option value="">Select…</option>
            <option value="<5L">Below ₹5 Lakh</option>
            <option value="5-10L">₹5 – 10 Lakh</option>
            <option value="10-25L">₹10 – 25 Lakh</option>
            <option value="25L-1Cr">₹25 Lakh – 1 Crore</option>
            <option value=">1Cr">Above ₹1 Crore</option>
          </select>
        </Field>
        <Field label="Occupation">
          <input className={inputCls} value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="Salaried / Self-employed / Retired" />
        </Field>
      </div>

      <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        Drag & drop a signed cancelled cheque or bank statement (optional in demo)
      </div>
    </div>
  );
}

function RiskStep({
  form,
  update,
  score,
  band,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  score: number;
  band: { label: string; color: string; bg: string };
}) {
  return (
    <div className="space-y-5">
      <div className={`rounded-md ${band.bg} p-3 flex items-center justify-between`}>
        <div>
          <div className="text-xs text-muted-foreground">Live risk profile</div>
          <div className={`text-lg font-semibold ${band.color}`}>{band.label}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Score</div>
          <div className="text-lg font-semibold">{score}/100</div>
        </div>
      </div>

      <ol className="space-y-4">
        {RISK_QUESTIONS.map((q, qi) => (
          <li key={qi} className="space-y-2">
            <div className="text-sm font-medium">{qi + 1}. {q.q}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.opts.map((opt, oi) => {
                const active = form.riskAnswers[String(qi)] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => update("riskAnswers", { ...form.riskAnswers, [String(qi)]: oi })}
                    className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-accent"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GoalsStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  function addGoal() {
    update("goals", [...form.goals, { name: "New goal", horizonYears: 5, targetLakh: 20, sipMonthly: 5000 }]);
  }
  function removeGoal(i: number) {
    update("goals", form.goals.filter((_, idx) => idx !== i));
  }
  function patch(i: number, key: keyof FormState["goals"][number], value: string | number) {
    const next = form.goals.slice();
    next[i] = { ...next[i], [key]: value } as FormState["goals"][number];
    update("goals", next);
  }
  const presets = ["Retirement", "Child Education", "Home Down-payment", "Wealth Creation", "Emergency Fund"];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => update("goals", [...form.goals, { name: p, horizonYears: 10, targetLakh: 50, sipMonthly: 10000 }])}
            className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-accent"
          >
            + {p}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {form.goals.map((g, i) => (
          <div key={i} className="rounded-md border border-border p-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Field label="Goal name">
              <input className={inputCls} value={g.name} onChange={(e) => patch(i, "name", e.target.value)} />
            </Field>
            <Field label="Horizon (yrs)">
              <input type="number" min={1} className={inputCls} value={g.horizonYears} onChange={(e) => patch(i, "horizonYears", Number(e.target.value))} />
            </Field>
            <Field label="Target (₹ Lakh)">
              <input type="number" min={1} className={inputCls} value={g.targetLakh} onChange={(e) => patch(i, "targetLakh", Number(e.target.value))} />
            </Field>
            <Field label="SIP (₹/month)">
              <input type="number" min={500} step={500} className={inputCls} value={g.sipMonthly} onChange={(e) => patch(i, "sipMonthly", Number(e.target.value))} />
            </Field>
            <button
              type="button"
              onClick={() => removeGoal(i)}
              className="h-9 text-xs rounded-md border border-border hover:bg-destructive/10 hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addGoal}
        className="text-sm px-3 py-1.5 rounded-md border border-dashed border-border hover:bg-accent"
      >
        + Add another goal
      </button>
    </div>
  );
}

function BankStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Bank name">
        <input className={inputCls} value={form.bankName} onChange={(e) => update("bankName", e.target.value)} placeholder="HDFC Bank" />
      </Field>
      <Field label="IFSC" hint="Format: 4 letters + 0 + 6 alphanumerics">
        <input className={inputCls + " uppercase"} maxLength={11} value={form.ifsc} onChange={(e) => update("ifsc", e.target.value.toUpperCase())} placeholder="HDFC0001234" />
      </Field>
      <Field label="Account number (last 4)">
        <input inputMode="numeric" maxLength={4} className={inputCls} value={form.accountLast4} onChange={(e) => update("accountLast4", e.target.value.replace(/\D/g, ""))} placeholder="6789" />
      </Field>
      <Field label="Nominee name">
        <input className={inputCls} value={form.nomineeName} onChange={(e) => update("nomineeName", e.target.value)} placeholder="Full name" />
      </Field>
      <Field label="Nominee relation">
        <select className={inputCls} value={form.nomineeRelation} onChange={(e) => update("nomineeRelation", e.target.value)}>
          <option value="">Select…</option>
          <option>Spouse</option>
          <option>Parent</option>
          <option>Child</option>
          <option>Sibling</option>
          <option>Other</option>
        </select>
      </Field>
    </div>
  );
}

function ReviewStep({
  form,
  update,
  band,
  allocation,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  band: string;
  allocation: { equity: number; debt: number; gold: number; cash: number };
}) {
  const totalSip = form.goals.reduce((s, g) => s + g.sipMonthly, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SummaryCard title="Investor">
          <SummaryRow k="Name" v={form.fullName || "—"} />
          <SummaryRow k="Email" v={form.email || "—"} />
          <SummaryRow k="Mobile" v={form.mobile || "—"} />
          <SummaryRow k="City" v={form.city || "—"} />
        </SummaryCard>
        <SummaryCard title="KYC">
          <SummaryRow k="PAN" v={form.pan || "—"} />
          <SummaryRow k="Aadhaar" v={form.aadhaarLast4 ? `••••••••${form.aadhaarLast4}` : "—"} />
          <SummaryRow k="Income" v={form.income || "—"} />
          <SummaryRow k="Occupation" v={form.occupation || "—"} />
        </SummaryCard>
        <SummaryCard title="Risk & suggested allocation">
          <SummaryRow k="Profile" v={band} />
          <SummaryRow k="Equity" v={`${allocation.equity}%`} />
          <SummaryRow k="Debt" v={`${allocation.debt}%`} />
          <SummaryRow k="Gold" v={`${allocation.gold}%`} />
          <SummaryRow k="Cash" v={`${allocation.cash}%`} />
        </SummaryCard>
        <SummaryCard title="Goals & SIPs">
          {form.goals.map((g, i) => (
            <SummaryRow key={i} k={g.name} v={`₹${g.sipMonthly.toLocaleString("en-IN")}/mo · ${g.horizonYears}y → ₹${g.targetLakh}L`} />
          ))}
          <div className="pt-2 mt-2 border-t border-border flex justify-between text-sm font-medium">
            <span>Total monthly SIP</span>
            <span>₹{totalSip.toLocaleString("en-IN")}</span>
          </div>
        </SummaryCard>
        <SummaryCard title="Bank & Nominee">
          <SummaryRow k="Bank" v={form.bankName || "—"} />
          <SummaryRow k="IFSC" v={form.ifsc || "—"} />
          <SummaryRow k="A/c" v={form.accountLast4 ? `••••${form.accountLast4}` : "—"} />
          <SummaryRow k="Nominee" v={`${form.nomineeName || "—"}${form.nomineeRelation ? ` (${form.nomineeRelation})` : ""}`} />
        </SummaryCard>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={form.agreed} onChange={(e) => update("agreed", e.target.checked)} />
        <span className="text-muted-foreground">
          I confirm the details above are correct and consent to opening a mutual fund investment account.
          I have read the risk profile disclosure and scheme information documents.
        </span>
      </label>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3 bg-muted/20">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right truncate">{v}</span>
    </div>
  );
}

function SuccessScreen({
  form,
  riskBand,
  allocation,
  onReset,
}: {
  form: FormState;
  riskBand: string;
  allocation: { equity: number; debt: number; gold: number; cash: number };
  onReset: () => void;
}) {
  const totalSip = form.goals.reduce((s, g) => s + g.sipMonthly, 0);
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 grid place-items-center">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome aboard, {form.fullName.split(" ")[0] || "investor"}!</h1>
        <p className="text-sm text-muted-foreground">
          Your mutual fund investment account is being set up. You'll receive an activation email at <span className="font-medium text-foreground">{form.email}</span> within 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Risk profile</div>
          <div className="text-lg font-semibold">{riskBand}</div>
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Suggested allocation</div>
          <div className="text-sm font-medium">
            Eq {allocation.equity} · Db {allocation.debt} · Au {allocation.gold} · Cs {allocation.cash}
          </div>
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Total monthly SIP</div>
          <div className="text-lg font-semibold">₹{totalSip.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={onReset} className="px-4 py-2 rounded-md text-sm border border-border hover:bg-accent">
          Onboard another investor
        </button>
        <a href="/proposal" className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90">
          Build a proposal →
        </a>
      </div>
    </div>
  );
}
