import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useRegion } from "@/lib/region";
import { SingaporeOnboarding } from "@/components/onboarding-singapore";
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
  FileCheck2,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Investor Onboarding — Mutual Funds | mPower Wealth" },
      {
        name: "description",
        content:
          "Guided onboarding journey for new mutual fund investors — KYC, risk profiling, suggested asset allocation, optional goals and bank capture.",
      },
    ],
  }),
  component: OnboardingRouter,
});

function OnboardingRouter() {
  const { region } = useRegion();
  if (region === "SG") return <SingaporeOnboarding />;
  return <OnboardingPage />;
}

type StepId = "personal" | "kyc" | "compliance" | "risk" | "goals" | "bank" | "review" | "done";

interface Step {
  id: StepId;
  title: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  optional?: boolean;
}

const STEPS: Step[] = [
  { id: "personal", title: "Personal Details", short: "Personal", icon: UserCircle2 },
  { id: "kyc", title: "KYC Verification", short: "KYC", icon: ShieldCheck },
  { id: "compliance", title: "Compliance & Declarations", short: "Compliance", icon: FileCheck2 },
  { id: "risk", title: "Risk Profiling & Allocation", short: "Risk", icon: Gauge },
  { id: "goals", title: "Investment Goals (Optional)", short: "Goals", icon: Target, optional: true },
  { id: "bank", title: "Bank & Nominee", short: "Bank", icon: Landmark },
  { id: "review", title: "Review & Confirm", short: "Review", icon: ClipboardCheck },
];

// ---------------- Reference data ----------------

const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "SG", name: "Singapore" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
];

// India state → cities (representative list, not exhaustive)
const INDIA_STATE_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Saket"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Chandigarh", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Ghaziabad", "Kanpur", "Varanasi", "Agra", "Prayagraj"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Nainital"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
};

const INDIA_STATES = Object.keys(INDIA_STATE_CITIES).sort();

// Generic KYC occupation list (CVL/CAMS KRA standard)
const OCCUPATIONS = [
  "Salaried — Private Sector",
  "Salaried — Public Sector / PSU",
  "Salaried — Government Service",
  "Business",
  "Professional",
  "Agriculturist",
  "Retired",
  "Housewife",
  "Student",
  "Self-Employed",
  "Forex Dealer",
  "Others",
];

// Common Indian banks
const BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "IndusInd Bank",
  "IDFC First Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
];

// Bank → state → city → branch (representative demo data)
const BANK_BRANCHES: Record<string, Record<string, Record<string, { name: string; ifsc: string }[]>>> = {
  "HDFC Bank": {
    "Maharashtra": {
      "Mumbai": [
        { name: "Fort Main Branch", ifsc: "HDFC0000060" },
        { name: "Bandra West", ifsc: "HDFC0000221" },
        { name: "Powai", ifsc: "HDFC0000513" },
      ],
      "Pune": [
        { name: "Camp", ifsc: "HDFC0000045" },
        { name: "Kothrud", ifsc: "HDFC0000340" },
      ],
    },
    "Karnataka": {
      "Bengaluru": [
        { name: "MG Road", ifsc: "HDFC0000122" },
        { name: "Koramangala", ifsc: "HDFC0000205" },
        { name: "Whitefield", ifsc: "HDFC0000631" },
      ],
    },
    "Delhi": {
      "New Delhi": [
        { name: "Connaught Place", ifsc: "HDFC0000003" },
        { name: "Nehru Place", ifsc: "HDFC0000018" },
      ],
    },
  },
  "ICICI Bank": {
    "Maharashtra": {
      "Mumbai": [
        { name: "BKC", ifsc: "ICIC0000104" },
        { name: "Andheri East", ifsc: "ICIC0000031" },
      ],
    },
    "Karnataka": {
      "Bengaluru": [
        { name: "Indiranagar", ifsc: "ICIC0000123" },
        { name: "HSR Layout", ifsc: "ICIC0000456" },
      ],
    },
    "Delhi": {
      "New Delhi": [
        { name: "Connaught Place", ifsc: "ICIC0000007" },
      ],
    },
  },
  "State Bank of India": {
    "Maharashtra": {
      "Mumbai": [
        { name: "Nariman Point", ifsc: "SBIN0000300" },
        { name: "Dadar", ifsc: "SBIN0000459" },
      ],
    },
    "Delhi": {
      "New Delhi": [{ name: "Parliament Street", ifsc: "SBIN0000691" }],
    },
    "Tamil Nadu": {
      "Chennai": [{ name: "Anna Salai Main", ifsc: "SBIN0000800" }],
    },
  },
  "Axis Bank": {
    "Maharashtra": {
      "Mumbai": [
        { name: "Fort", ifsc: "UTIB0000004" },
        { name: "Malad West", ifsc: "UTIB0000212" },
      ],
    },
    "Karnataka": {
      "Bengaluru": [{ name: "MG Road", ifsc: "UTIB0000009" }],
    },
  },
  "Kotak Mahindra Bank": {
    "Maharashtra": { "Mumbai": [{ name: "BKC", ifsc: "KKBK0000958" }] },
    "Karnataka": { "Bengaluru": [{ name: "Koramangala", ifsc: "KKBK0000432" }] },
  },
};

// Fallback IFSC generator for banks/cities we haven't hard-coded
function ifscPrefix(bank: string): string {
  switch (bank) {
    case "HDFC Bank": return "HDFC";
    case "ICICI Bank": return "ICIC";
    case "State Bank of India": return "SBIN";
    case "Axis Bank": return "UTIB";
    case "Kotak Mahindra Bank": return "KKBK";
    case "Yes Bank": return "YESB";
    case "IndusInd Bank": return "INDB";
    case "IDFC First Bank": return "IDFB";
    case "Punjab National Bank": return "PUNB";
    case "Bank of Baroda": return "BARB";
    case "Canara Bank": return "CNRB";
    case "Union Bank of India": return "UBIN";
    default: return "BANK";
  }
}
function fallbackBranches(bank: string, city: string): { name: string; ifsc: string }[] {
  const p = ifscPrefix(bank);
  const seed = Math.abs(hash(city + bank)) % 900 + 100;
  return [
    { name: `${city} Main Branch`, ifsc: `${p}0000${seed}` },
    { name: `${city} — Central`, ifsc: `${p}000${seed + 11}` },
    { name: `${city} — City Centre`, ifsc: `${p}000${seed + 27}` },
  ];
}
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i); return h; }

// ---------------- Form state ----------------

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string; // auto-composed but editable
  dob: string;
  gender: "male" | "female" | "other" | "";
  email: string;
  mobile: string;
  country: string;
  state: string;
  city: string;
  pan: string;
  aadhaarLast4: string;
  panVerified: boolean;
  aadhaarVerified: boolean;
  income: "<5L" | "5-10L" | "10-25L" | "25L-1Cr" | ">1Cr" | "";
  occupation: string;
  // India compliance (SEBI / AMFI / PMLA)
  investorCategory: "resident" | "nri-nre" | "nri-nro" | "minor" | "huf" | "";
  kycStatus: "" | "validated" | "registered" | "on-hold" | "new";
  ckycNumber: string;
  kraAgency: string;
  panAadhaarLinked: boolean;
  ipvMode: "video" | "in-person" | "aadhaar-ekyc" | "";
  ipvDone: boolean;
  taxResidencyOutsideIndia: boolean;
  fatcaCountry: string;
  fatcaTin: string;
  birthCity: string;
  birthCountry: string;
  pepStatus: "no" | "self" | "related" | "";
  holdingMode: "single" | "joint-anyone" | "joint-jointly" | "";
  ucc: string;
  riskAnswers: Record<string, number>;
  goals: Array<{ name: string; horizonYears: number; targetLakh: number; sipMonthly: number }>;
  bankName: string;
  bankState: string;
  bankCity: string;
  branch: string;
  ifsc: string;
  accountLast4: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeOptOut: boolean;
  nomineeShare: number;
  agreed: boolean;
}

const RISK_QUESTIONS = [
  { q: "What is your primary investment objective?", opts: ["Capital protection", "Steady income", "Balanced growth", "Aggressive growth"] },
  { q: "How long can you stay invested without needing this money?", opts: ["< 1 year", "1–3 years", "3–7 years", "> 7 years"] },
  { q: "If your portfolio drops 20% in a year, you would:", opts: ["Exit fully", "Reduce allocation", "Hold", "Invest more"] },
  { q: "How much investing experience do you have?", opts: ["None", "Only FDs / savings", "Some MF / equity", "Active investor"] },
  { q: "What share of your savings goes into market-linked products?", opts: ["< 10%", "10–25%", "25–50%", "> 50%"] },
];

function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    firstName: "",
    middleName: "",
    lastName: "",
    fullName: "",
    dob: "",
    gender: "",
    email: "",
    mobile: "",
    country: "IN",
    state: "",
    city: "",
    pan: "",
    aadhaarLast4: "",
    panVerified: false,
    aadhaarVerified: false,
    income: "",
    occupation: "",
    investorCategory: "resident",
    kycStatus: "",
    ckycNumber: "",
    kraAgency: "",
    panAadhaarLinked: false,
    ipvMode: "",
    ipvDone: false,
    taxResidencyOutsideIndia: false,
    fatcaCountry: "",
    fatcaTin: "",
    birthCity: "",
    birthCountry: "India",
    pepStatus: "",
    holdingMode: "single",
    ucc: "",
    riskAnswers: {},
    goals: [],
    bankName: "",
    bankState: "",
    bankCity: "",
    branch: "",
    ifsc: "",
    accountLast4: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeOptOut: false,
    nomineeShare: 100,
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
    // Equity / Debt / Alternates / Cash (Alternates = Gold + REITs/InvITs + Intl equity)
    if (band === "Conservative") return { equity: 15, debt: 70, alternates: 10, cash: 5 };
    if (band === "Moderate") return { equity: 40, debt: 45, alternates: 10, cash: 5 };
    if (band === "Balanced") return { equity: 60, debt: 25, alternates: 12, cash: 3 };
    return { equity: 75, debt: 10, alternates: 12, cash: 3 };
  }, [riskBand]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Composite name updater — keeps fullName in sync unless user overrides it.
  function updateName(part: "firstName" | "middleName" | "lastName", value: string) {
    setForm((f) => {
      const merged = { ...f, [part]: value };
      const composed = [merged.firstName, merged.middleName, merged.lastName].filter(Boolean).join(" ").trim();
      return { ...merged, fullName: composed };
    });
  }

  function canProceed(): { ok: boolean; msg?: string } {
    switch (current?.id) {
      case "personal":
        if (!form.firstName.trim()) return { ok: false, msg: "Enter first name" };
        if (!form.lastName.trim()) return { ok: false, msg: "Enter last name" };
        if (!form.dob) return { ok: false, msg: "Enter date of birth" };
        if (!form.country) return { ok: false, msg: "Select country" };
        if (form.country === "IN" && !form.state) return { ok: false, msg: "Select state" };
        if (form.country === "IN" && !form.city) return { ok: false, msg: "Select city" };
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return { ok: false, msg: "Enter a valid email" };
        if (!/^\d{10}$/.test(form.mobile)) return { ok: false, msg: "Enter a 10-digit mobile" };
        return { ok: true };
      case "kyc":
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan.toUpperCase())) return { ok: false, msg: "Enter a valid PAN (e.g. ABCDE1234F)" };
        if (!/^\d{4}$/.test(form.aadhaarLast4)) return { ok: false, msg: "Enter last 4 digits of Aadhaar" };
        if (!form.panVerified || !form.aadhaarVerified) return { ok: false, msg: "Verify PAN and Aadhaar to continue" };
        if (!form.income) return { ok: false, msg: "Select annual income" };
        if (!form.occupation) return { ok: false, msg: "Select occupation" };
        return { ok: true };
      case "compliance":
        if (!form.investorCategory) return { ok: false, msg: "Select investor category" };
        if (!form.kycStatus) return { ok: false, msg: "Run the KRA / CKYC status check" };
        if (form.kycStatus === "on-hold") return { ok: false, msg: "KYC is on hold — re-KYC with a validated email & mobile before proceeding" };
        if (!form.panAadhaarLinked) return { ok: false, msg: "Confirm PAN–Aadhaar linkage (mandatory for KYC validation)" };
        if (!form.ipvMode) return { ok: false, msg: "Select an in-person verification mode" };
        if (!form.ipvDone) return { ok: false, msg: "Complete in-person verification (IPV)" };
        if (!form.birthCity.trim()) return { ok: false, msg: "Enter place of birth (required for FATCA/CRS)" };
        if (form.taxResidencyOutsideIndia && (!form.fatcaCountry.trim() || !form.fatcaTin.trim()))
          return { ok: false, msg: "Enter the foreign tax jurisdiction and TIN" };
        if (!form.pepStatus) return { ok: false, msg: "Complete the PEP declaration" };
        if (!form.holdingMode) return { ok: false, msg: "Select mode of holding" };
        return { ok: true };
      case "risk":
        if (Object.keys(form.riskAnswers).length < RISK_QUESTIONS.length) return { ok: false, msg: "Answer all risk questions" };
        return { ok: true };
      case "goals":
        // Optional step — always allow proceeding
        return { ok: true };
      case "bank":
        if (!form.bankName.trim()) return { ok: false, msg: "Select bank" };
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase())) return { ok: false, msg: "IFSC missing — pick branch" };
        if (!/^\d{4}$/.test(form.accountLast4)) return { ok: false, msg: "Enter last 4 digits of account" };
        if (!form.nomineeOptOut && !form.nomineeName.trim()) return { ok: false, msg: "Enter nominee name or tick the opt-out declaration" };
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
    if (!proceed.ok) { setShowError(true); return; }
    setShowError(false);
    setStepIndex((i) => i + 1);
  }
  function back() {
    setShowError(false);
    setStepIndex((i) => Math.max(0, i - 1));
  }
  function skip() {
    setShowError(false);
    setStepIndex((i) => i + 1);
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
            A guided 6-step flow — personal details, KYC, risk profile, optional goals, bank and review — in under 5 minutes.
          </p>
        </header>

        <Stepper stepIndex={stepIndex} />

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            <current.icon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">{current.title}</h2>
            {current.optional && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Optional</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">Step {stepIndex + 1} of {STEPS.length}</span>
          </div>

          <div className="p-5">
            {current.id === "personal" && <PersonalStep form={form} update={update} updateName={updateName} />}
            {current.id === "kyc" && <KycStep form={form} update={update} />}
            {current.id === "risk" && (
              <RiskStep form={form} update={update} score={riskScore} band={riskBand} allocation={suggestedAllocation} />
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
            <div className="flex items-center gap-2">
              {current.optional && (
                <button
                  onClick={skip}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-border hover:bg-accent"
                >
                  Skip
                </button>
              )}
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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
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
  updateName,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  updateName: (part: "firstName" | "middleName" | "lastName", value: string) => void;
}) {
  const isIndia = form.country === "IN";
  const stateOptions = isIndia ? INDIA_STATES : [];
  const cityOptions = isIndia && form.state ? INDIA_STATE_CITIES[form.state] ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="First name">
          <input className={inputCls} value={form.firstName} onChange={(e) => updateName("firstName", e.target.value)} placeholder="Ravi" />
        </Field>
        <Field label="Middle name">
          <input className={inputCls} value={form.middleName} onChange={(e) => updateName("middleName", e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Last name">
          <input className={inputCls} value={form.lastName} onChange={(e) => updateName("lastName", e.target.value)} placeholder="Kumar" />
        </Field>
      </div>

      <Field label="Full name (as on PAN)" hint="Auto-composed from the fields above — edit if it differs from your PAN card">
        <input className={inputCls} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Ravi Kumar" />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Country">
          <select
            className={inputCls}
            value={form.country}
            onChange={(e) => {
              update("country", e.target.value);
              update("state", "");
              update("city", "");
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="State">
          {isIndia ? (
            <select
              className={inputCls}
              value={form.state}
              onChange={(e) => { update("state", e.target.value); update("city", ""); }}
            >
              <option value="">Select…</option>
              {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input className={inputCls} value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="State / Emirate / County" />
          )}
        </Field>
        <Field label="City">
          {isIndia ? (
            <select
              className={inputCls}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              disabled={!form.state}
            >
              <option value="">{form.state ? "Select…" : "Select state first"}</option>
              {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input className={inputCls} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Email">
          <input type="email" className={inputCls} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Mobile" hint="10-digit Indian mobile number">
          <input inputMode="numeric" maxLength={10} className={inputCls} value={form.mobile} onChange={(e) => update("mobile", e.target.value.replace(/\D/g, ""))} placeholder="9876543210" />
        </Field>
      </div>
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
        <Field label="Occupation" hint="As per CVL / CAMS KRA standard categories">
          <select
            className={inputCls}
            value={form.occupation}
            onChange={(e) => update("occupation", e.target.value)}
          >
            <option value="">Select…</option>
            {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
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
  allocation,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  score: number;
  band: { label: string; color: string; bg: string };
  allocation: { equity: number; debt: number; alternates: number; cash: number };
}) {
  const complete = Object.keys(form.riskAnswers).length === RISK_QUESTIONS.length;
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

      {complete && <AllocationPanel band={band.label} allocation={allocation} />}
    </div>
  );
}

function AllocationPanel({
  band,
  allocation,
}: {
  band: string;
  allocation: { equity: number; debt: number; alternates: number; cash: number };
}) {
  const rows: { label: string; value: number; color: string; sub: string }[] = [
    { label: "Equity", value: allocation.equity, color: "bg-sky-500", sub: "Large / mid / small-cap, flexicap, index" },
    { label: "Debt", value: allocation.debt, color: "bg-emerald-500", sub: "Liquid, short-duration, corporate bond, gilt" },
    { label: "Alternates", value: allocation.alternates, color: "bg-amber-500", sub: "Gold, silver, REITs / InvITs, international" },
    { label: "Cash", value: allocation.cash, color: "bg-slate-400", sub: "Liquid / overnight buffer" },
  ];
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Suggested asset allocation</div>
          <div className="text-sm">Based on your <span className="font-semibold">{band}</span> risk profile</div>
        </div>
        <div className="text-xs text-muted-foreground">Model portfolio · indicative</div>
      </div>

      {/* Stacked bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-border">
        {rows.map((r) => (
          <div key={r.label} className={r.color} style={{ width: `${r.value}%` }} title={`${r.label} ${r.value}%`} />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-md border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-sm ${r.color}`} />
              <span className="text-xs font-medium">{r.label}</span>
              <span className="ml-auto text-sm font-semibold">{r.value}%</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground leading-snug">{r.sub}</div>
          </div>
        ))}
      </div>
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
  function addGoal(seed?: Partial<FormState["goals"][number]>) {
    update("goals", [
      ...form.goals,
      { name: seed?.name ?? "New goal", horizonYears: seed?.horizonYears ?? 10, targetLakh: seed?.targetLakh ?? 50, sipMonthly: seed?.sipMonthly ?? 10000 },
    ]);
  }
  function removeGoal(i: number) { update("goals", form.goals.filter((_, idx) => idx !== i)); }
  function patch(i: number, key: keyof FormState["goals"][number], value: string | number) {
    const next = form.goals.slice();
    next[i] = { ...next[i], [key]: value } as FormState["goals"][number];
    update("goals", next);
  }
  const presets = ["Retirement", "Child Education", "Home Down-payment", "Wealth Creation", "Emergency Fund"];
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Goals are optional — you can Skip this step and add goals later from your dashboard. Adding goals helps us tune SIP amounts to what you actually want to achieve.
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => addGoal({ name: p })}
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
        {form.goals.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-md">
            No goals added. Pick a preset above or add one manually — or Skip this step.
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => addGoal()}
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
  const bankData = form.bankName ? BANK_BRANCHES[form.bankName] : undefined;
  const stateOptions = bankData ? Object.keys(bankData) : INDIA_STATES;
  const cityOptions =
    form.bankState && bankData?.[form.bankState]
      ? Object.keys(bankData[form.bankState])
      : form.bankState
      ? (INDIA_STATE_CITIES[form.bankState] ?? [])
      : [];
  const branches =
    form.bankName && form.bankCity
      ? (bankData?.[form.bankState]?.[form.bankCity] ?? fallbackBranches(form.bankName, form.bankCity))
      : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Bank">
          <select
            className={inputCls}
            value={form.bankName}
            onChange={(e) => {
              update("bankName", e.target.value);
              update("bankState", "");
              update("bankCity", "");
              update("branch", "");
              update("ifsc", "");
            }}
          >
            <option value="">Select bank…</option>
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Branch state">
          <select
            className={inputCls}
            value={form.bankState}
            disabled={!form.bankName}
            onChange={(e) => {
              update("bankState", e.target.value);
              update("bankCity", "");
              update("branch", "");
              update("ifsc", "");
            }}
          >
            <option value="">{form.bankName ? "Select…" : "Select bank first"}</option>
            {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Branch city">
          <select
            className={inputCls}
            value={form.bankCity}
            disabled={!form.bankState}
            onChange={(e) => {
              update("bankCity", e.target.value);
              update("branch", "");
              update("ifsc", "");
            }}
          >
            <option value="">{form.bankState ? "Select…" : "Select state first"}</option>
            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Branch" hint="IFSC auto-fills based on the branch selected">
          <select
            className={inputCls}
            value={form.branch}
            disabled={!form.bankCity}
            onChange={(e) => {
              const b = branches.find((br) => br.name === e.target.value);
              update("branch", e.target.value);
              update("ifsc", b?.ifsc ?? "");
            }}
          >
            <option value="">{form.bankCity ? "Select branch…" : "Select city first"}</option>
            {branches.map((b) => <option key={b.ifsc} value={b.name}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="IFSC" hint="Auto-filled from branch selection">
          <input className={inputCls + " uppercase bg-muted/40"} readOnly value={form.ifsc} placeholder="Auto" />
        </Field>
        <Field label="Account number (last 4)">
          <input inputMode="numeric" maxLength={4} className={inputCls} value={form.accountLast4} onChange={(e) => update("accountLast4", e.target.value.replace(/\D/g, ""))} placeholder="6789" />
        </Field>
        <Field label="Account type">
          <select className={inputCls} defaultValue="savings">
            <option value="savings">Savings</option>
            <option value="current">Current</option>
            <option value="nre">NRE</option>
            <option value="nro">NRO</option>
          </select>
        </Field>
      </div>

      <div className="rounded-md border border-border p-3 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Nominee</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
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
  allocation: { equity: number; debt: number; alternates: number; cash: number };
}) {
  const totalSip = form.goals.reduce((s, g) => s + g.sipMonthly, 0);
  const countryName = COUNTRIES.find((c) => c.code === form.country)?.name ?? form.country;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SummaryCard title="Investor">
          <SummaryRow k="Name" v={form.fullName || "—"} />
          <SummaryRow k="Email" v={form.email || "—"} />
          <SummaryRow k="Mobile" v={form.mobile || "—"} />
          <SummaryRow k="Location" v={[form.city, form.state, countryName].filter(Boolean).join(", ") || "—"} />
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
          <SummaryRow k="Alternates" v={`${allocation.alternates}%`} />
          <SummaryRow k="Cash" v={`${allocation.cash}%`} />
        </SummaryCard>
        <SummaryCard title="Goals & SIPs">
          {form.goals.length === 0 ? (
            <div className="text-xs text-muted-foreground">No goals added (optional — can be added later).</div>
          ) : (
            <>
              {form.goals.map((g, i) => (
                <SummaryRow key={i} k={g.name} v={`₹${g.sipMonthly.toLocaleString("en-IN")}/mo · ${g.horizonYears}y → ₹${g.targetLakh}L`} />
              ))}
              <div className="pt-2 mt-2 border-t border-border flex justify-between text-sm font-medium">
                <span>Total monthly SIP</span>
                <span>₹{totalSip.toLocaleString("en-IN")}</span>
              </div>
            </>
          )}
        </SummaryCard>
        <SummaryCard title="Bank & Nominee">
          <SummaryRow k="Bank" v={form.bankName || "—"} />
          <SummaryRow k="Branch" v={form.branch ? `${form.branch}, ${form.bankCity}` : "—"} />
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
  allocation: { equity: number; debt: number; alternates: number; cash: number };
  onReset: () => void;
}) {
  const totalSip = form.goals.reduce((s, g) => s + g.sipMonthly, 0);
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 grid place-items-center">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome aboard, {form.firstName || form.fullName.split(" ")[0] || "investor"}!</h1>
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
            Eq {allocation.equity} · Db {allocation.debt} · Alt {allocation.alternates} · Cs {allocation.cash}
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
