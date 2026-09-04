import { useMemo, useState } from "react";
import {
  Fingerprint,
  ShieldCheck,
  BadgeCheck,
  GraduationCap,
  Gauge,
  Landmark,
  ClipboardCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  AlertTriangle,
  FolderUp,
} from "lucide-react";
import {
  DocumentSlots,
  FaceLivenessCapture,
  missingRequiredDocs,
  type DocMap,
  type DocSlot,
  type FaceCaptureResult,
} from "@/components/onboarding-capture";

/**
 * Singapore investor onboarding — modelled on MAS requirements:
 *  - Singpass / Myinfo retrieval of verified identity data
 *  - CDD & screening under MAS Notice SFA04-N02 / Notice 626 (PEP, source of wealth, sanctions)
 *  - Investor classification under SFA s.4A (Accredited Investor opt-in / opt-out)
 *  - Customer Knowledge Assessment (CKA) / Customer Account Review (CAR) for SIPs
 *  - FAA-N16 suitability: risk profile → recommended allocation
 *  - FATCA / CRS tax residency self-certification
 * All verification calls are simulated for this demo.
 */

type StepId =
  | "singpass"
  | "identity"
  | "cdd"
  | "classification"
  | "cka"
  | "risk"
  | "bank"
  | "documents"
  | "review";

const STEPS: { id: StepId; title: string; short: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "singpass", title: "Singpass Myinfo Retrieval", short: "Singpass", icon: Fingerprint },
  { id: "identity", title: "Identity & Residency", short: "Identity", icon: BadgeCheck },
  { id: "cdd", title: "Customer Due Diligence & Screening", short: "CDD", icon: ShieldCheck },
  { id: "classification", title: "Investor Classification (SFA s.4A)", short: "Class", icon: ClipboardCheck },
  { id: "cka", title: "Knowledge Assessment (CKA / CAR)", short: "CKA/CAR", icon: GraduationCap },
  { id: "risk", title: "Risk Profile & Allocation", short: "Risk", icon: Gauge },
  { id: "bank", title: "Bank, SRS / CPFIS & Payment", short: "Bank", icon: Landmark },
  { id: "documents", title: "Documents & Identity Verification", short: "Documents", icon: FolderUp },
  { id: "review", title: "Review & Declarations", short: "Review", icon: ClipboardCheck },
];

const SG_BANKS = [
  { name: "DBS Bank", swift: "DBSSSGSG" },
  { name: "OCBC Bank", swift: "OCBCSGSG" },
  { name: "United Overseas Bank (UOB)", swift: "UOVBSGSG" },
  { name: "Standard Chartered Singapore", swift: "SCBLSG22" },
  { name: "Citibank Singapore", swift: "CITISGSG" },
  { name: "HSBC Singapore", swift: "HSBCSGSG" },
  { name: "Maybank Singapore", swift: "MBBESGS2" },
];

const OCCUPATIONS = [
  "Employee — Financial Services",
  "Employee — Non-Financial",
  "Self-Employed / Business Owner",
  "Professional (Legal / Medical / Accounting)",
  "Civil Servant / Statutory Board",
  "Retired",
  "Homemaker",
  "Student",
  "Unemployed",
];

const SOURCE_OF_WEALTH = [
  "Employment income / salary",
  "Business ownership / dividends",
  "Sale of property",
  "Inheritance / gift",
  "Investment returns",
  "Retirement proceeds (CPF / SRS)",
  "Other",
];

const RISK_QUESTIONS = [
  { q: "What is your primary objective for this account?", opts: ["Capital preservation", "Income generation", "Balanced growth", "Maximum capital growth"] },
  { q: "Intended investment horizon?", opts: ["Under 1 year", "1–3 years", "3–7 years", "Over 7 years"] },
  { q: "If your portfolio fell 20% within a year you would:", opts: ["Redeem everything", "Switch to cash funds", "Stay invested", "Top up at lower prices"] },
  { q: "Experience with collective investment schemes?", opts: ["None", "Fixed deposits / SSB only", "Unit trusts / ETFs", "Active investor incl. structured products"] },
  { q: "What proportion of your liquid assets will this account represent?", opts: ["Over 75%", "50–75%", "25–50%", "Under 25%"] },
];

const CKA_QUESTIONS = [
  { key: "education", label: "Education", detail: "Diploma or higher in accountancy, business, economics, finance or related field", },
  { key: "experience", label: "Work experience", detail: "Minimum 3 consecutive years in the past 10 years in a role involving investment products", },
  { key: "trading", label: "Investment experience", detail: "At least 6 transactions in unlisted Specified Investment Products in the preceding 3 years", },
] as const;

interface SgForm {
  singpassRetrieved: boolean;
  fullName: string;
  aliasName: string;
  nric: string;
  dob: string;
  nationality: string;
  residency: "citizen" | "pr" | "employment-pass" | "foreigner" | "";
  postal: string;
  address: string;
  email: string;
  mobile: string;
  occupation: string;
  employer: string;
  annualIncomeSgd: "<50k" | "50-100k" | "100-300k" | "300k-1m" | ">1m" | "";
  sourceOfWealth: string[];
  sourceOfFunds: string;
  pep: "no" | "self" | "family" | "";
  pepDetails: string;
  usPerson: boolean;
  taxResidencies: Array<{ country: string; tin: string }>;
  screened: boolean;
  classification: "retail" | "accredited" | "";
  aiTests: string[];
  aiOptIn: boolean;
  ckaFlags: string[];
  ckaAcknowledged: boolean;
  riskAnswers: Record<string, number>;
  bankName: string;
  swift: string;
  accountLast4: string;
  payMode: "giro" | "paynow" | "fast" | "";
  useSrs: boolean;
  useCpfis: boolean;
  declarations: Record<string, boolean>;
  noSingpass: boolean;
  docs: DocMap;
  faceCapture: FaceCaptureResult | null;
}

const inputCls =
  "w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

export function SingaporeOnboarding() {
  const [stepIndex, setStepIndex] = useState(0);
  const [showError, setShowError] = useState(false);
  const [form, setForm] = useState<SgForm>({
    singpassRetrieved: false,
    fullName: "",
    aliasName: "",
    nric: "",
    dob: "",
    nationality: "Singaporean",
    residency: "",
    postal: "",
    address: "",
    email: "",
    mobile: "",
    occupation: "",
    employer: "",
    annualIncomeSgd: "",
    sourceOfWealth: [],
    sourceOfFunds: "",
    pep: "",
    pepDetails: "",
    usPerson: false,
    taxResidencies: [{ country: "Singapore", tin: "" }],
    screened: false,
    classification: "",
    aiTests: [],
    aiOptIn: false,
    ckaFlags: [],
    ckaAcknowledged: false,
    riskAnswers: {},
    bankName: "",
    swift: "",
    accountLast4: "",
    payMode: "",
    useSrs: false,
    useCpfis: false,
    declarations: {},
    noSingpass: false,
    docs: {},
    faceCapture: null,
  });

  function update<K extends keyof SgForm>(key: K, value: SgForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const current = STEPS[stepIndex];
  const isDone = stepIndex >= STEPS.length;

  const riskScore = useMemo(() => {
    const vals = Object.values(form.riskAnswers);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
  }, [form.riskAnswers]);

  const riskBand = useMemo(() => {
    if (riskScore < 30) return { label: "Conservative", color: "text-emerald-600", bg: "bg-emerald-500/10" };
    if (riskScore < 55) return { label: "Moderate", color: "text-sky-600", bg: "bg-sky-500/10" };
    if (riskScore < 80) return { label: "Balanced", color: "text-amber-600", bg: "bg-amber-500/10" };
    return { label: "Aggressive", color: "text-rose-600", bg: "bg-rose-500/10" };
  }, [riskScore]);

  const allocation = useMemo(() => {
    switch (riskBand.label) {
      case "Conservative": return { equity: 15, bonds: 65, alternates: 10, cash: 10 };
      case "Moderate": return { equity: 40, bonds: 45, alternates: 10, cash: 5 };
      case "Balanced": return { equity: 60, bonds: 27, alternates: 10, cash: 3 };
      default: return { equity: 75, bonds: 12, alternates: 10, cash: 3 };
    }
  }, [riskBand]);

  const ckaPassed = form.ckaFlags.length > 0;
  const isAccredited = form.classification === "accredited" && form.aiTests.length > 0 && form.aiOptIn;

  function canProceed(): { ok: boolean; msg?: string } {
    switch (current?.id) {
      case "singpass":
        if (!form.singpassRetrieved && !form.noSingpass)
          return { ok: false, msg: "Retrieve Myinfo data via Singpass, or choose to continue without Singpass" };
        return { ok: true };
      case "identity":
        if (!form.fullName.trim()) return { ok: false, msg: "Enter full name as per NRIC/FIN" };
        if (!/^[STFGM]\d{7}[A-Z]$/i.test(form.nric.trim())) return { ok: false, msg: "Enter a valid NRIC / FIN (e.g. S1234567D)" };
        if (!form.dob) return { ok: false, msg: "Enter date of birth" };
        if (!form.residency) return { ok: false, msg: "Select residential status" };
        if (!/^\d{6}$/.test(form.postal)) return { ok: false, msg: "Enter a 6-digit Singapore postal code" };
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return { ok: false, msg: "Enter a valid email" };
        if (!/^[89]\d{7}$/.test(form.mobile)) return { ok: false, msg: "Enter an 8-digit SG mobile starting with 8 or 9" };
        return { ok: true };
      case "cdd":
        if (!form.occupation) return { ok: false, msg: "Select occupation" };
        if (!form.annualIncomeSgd) return { ok: false, msg: "Select annual income band" };
        if (form.sourceOfWealth.length === 0) return { ok: false, msg: "Select at least one source of wealth" };
        if (!form.sourceOfFunds.trim()) return { ok: false, msg: "Describe the source of funds" };
        if (!form.pep) return { ok: false, msg: "Complete the PEP declaration" };
        if (form.pep !== "no" && !form.pepDetails.trim()) return { ok: false, msg: "Provide PEP details for enhanced due diligence" };
        if (form.taxResidencies.some((t) => !t.country.trim() || !t.tin.trim())) return { ok: false, msg: "Provide TIN for every tax residency (NRIC is the SG TIN)" };
        if (!form.screened) return { ok: false, msg: "Run the sanctions / adverse-media screening" };
        return { ok: true };
      case "classification":
        if (!form.classification) return { ok: false, msg: "Select an investor classification" };
        if (form.classification === "accredited" && form.aiTests.length === 0) return { ok: false, msg: "Select at least one accredited investor eligibility test" };
        if (form.classification === "accredited" && !form.aiOptIn) return { ok: false, msg: "Confirm the AI opt-in acknowledgement" };
        return { ok: true };
      case "cka":
        if (!form.ckaAcknowledged) return { ok: false, msg: "Acknowledge the CKA / CAR outcome" };
        return { ok: true };
      case "risk":
        if (Object.keys(form.riskAnswers).length < RISK_QUESTIONS.length) return { ok: false, msg: "Answer all risk questions" };
        return { ok: true };
      case "bank":
        if (!form.bankName) return { ok: false, msg: "Select your bank" };
        if (!/^\d{4}$/.test(form.accountLast4)) return { ok: false, msg: "Enter last 4 digits of account" };
        if (!form.payMode) return { ok: false, msg: "Select a funding mode" };
        return { ok: true };
      case "documents": {
        const missing = missingRequiredDocs(sgDocSlots(form), form.docs);
        if (missing.length) return { ok: false, msg: `Upload required document: ${missing[0]!.label}` };
        if (!form.singpassRetrieved && !form.faceCapture)
          return { ok: false, msg: "Complete the liveness and face-match capture for non-face-to-face verification" };
        return { ok: true };
      }
      case "review": {
        const required = ["accuracy", "crs", "riskdisc", "fees"];
        if (!required.every((k) => form.declarations[k])) return { ok: false, msg: "Accept all declarations to submit" };
        return { ok: true };
      }
      default:
        return { ok: true };
    }
  }

  const proceed = canProceed();

  function next() {
    if (!proceed.ok) { setShowError(true); return; }
    setShowError(false);
    setStepIndex((i) => i + 1);
  }
  function back() { setShowError(false); setStepIndex((i) => Math.max(0, i - 1)); }

  if (isDone) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-semibold">Account application submitted</h1>
          <p className="text-sm text-muted-foreground">
            {form.fullName || "The client"} has been onboarded as a{" "}
            <span className="font-medium">{isAccredited ? "Accredited Investor" : "Retail Investor"}</span> with a{" "}
            <span className="font-medium">{riskBand.label}</span> risk profile. CDD records, CRS self-certification and
            the {ckaPassed ? "passed" : "not-passed"} CKA outcome have been filed against the client file.
          </p>
          <div className="rounded-lg border border-border bg-card p-4 text-left text-sm space-y-2">
            <Row k="Client reference" v={`SG-${(form.nric || "XXXXXXX").slice(-5).toUpperCase()}-${new Date().getFullYear()}`} />
            <Row k="Classification" v={isAccredited ? "Accredited Investor (SFA s.4A, opted in)" : "Retail Investor"} />
            <Row k="CKA / CAR" v={ckaPassed ? "Passed — SIPs available" : "Not passed — advised sales only for SIPs"} />
            <Row k="Screening" v="Sanctions & adverse media — clear" />
            <Row k="Funding" v={`${form.bankName} ····${form.accountLast4} via ${form.payMode.toUpperCase()}`} />
            <Row k="Recommended mix" v={`${allocation.equity}% equity · ${allocation.bonds}% bonds · ${allocation.alternates}% alts · ${allocation.cash}% cash`} />
          </div>
          <button onClick={() => setStepIndex(0)} className="text-sm px-4 py-2 rounded-md border border-border hover:bg-accent">
            Start another application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-medium uppercase tracking-wider">Singapore Investor Onboarding · MAS</span>
          </div>
          <h1 className="text-2xl font-semibold">Open a Singapore investment account</h1>
          <p className="text-sm text-muted-foreground">
            Singpass Myinfo identity retrieval, MAS Notice 626 due diligence, SFA s.4A investor classification,
            CKA/CAR assessment and FAA-N16 suitability — in one guided flow.
          </p>
        </header>

        <Stepper stepIndex={stepIndex} />

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            {current && <current.icon className="w-4 h-4 text-primary" />}
            <h2 className="text-sm font-semibold">{current?.title}</h2>
            <span className="ml-auto text-xs text-muted-foreground">Step {stepIndex + 1} of {STEPS.length}</span>
          </div>

          <div className="p-5">
            {current?.id === "singpass" && <SingpassStep form={form} update={update} />}
            {current?.id === "identity" && <IdentityStep form={form} update={update} />}
            {current?.id === "cdd" && <CddStep form={form} update={update} />}
            {current?.id === "classification" && <ClassificationStep form={form} update={update} />}
            {current?.id === "cka" && <CkaStep form={form} update={update} passed={ckaPassed} />}
            {current?.id === "risk" && <RiskStep form={form} update={update} score={riskScore} band={riskBand} allocation={allocation} />}
            {current?.id === "bank" && <BankStep form={form} update={update} />}
            {current?.id === "documents" && <DocumentsStep form={form} update={update} />}
            {current?.id === "review" && (
              <ReviewStep form={form} update={update} band={riskBand.label} allocation={allocation} accredited={isAccredited} ckaPassed={ckaPassed} />
            )}
          </div>

          <div className="border-t border-border px-5 py-3 flex items-center gap-3">
            <button onClick={back} disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border disabled:opacity-40 hover:bg-accent">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {showError && !proceed.ok && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {proceed.msg}
              </span>
            )}
            <button onClick={next}
              className="ml-auto inline-flex items-center gap-1 text-sm px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              {current?.id === "review" ? "Submit application" : "Continue"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ helpers

function Stepper({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {STEPS.map((s, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <div key={s.id}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
              active ? "border-primary bg-primary/10 text-primary font-medium"
                : done ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                : "border-border text-muted-foreground"
            }`}>
            {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
            {s.short}
          </div>
        );
      })}
    </div>
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

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex gap-2 items-start cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-[var(--color-primary)]" />
      <span className="text-sm leading-snug">
        {label}
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

// ------------------------------------------------------------------- steps

function SingpassStep({ form, update }: { form: SgForm; update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void }) {
  const [loading, setLoading] = useState(false);
  function retrieve() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      update("singpassRetrieved", true);
      update("fullName", "Tan Wei Ming");
      update("nric", "S8412345D");
      update("dob", "1984-06-19");
      update("nationality", "Singaporean");
      update("residency", "citizen");
      update("postal", "238823");
      update("address", "Blk 12 Orchard Boulevard #14-05, Singapore");
      update("email", "weiming.tan@example.sg");
      update("mobile", "91234567");
      update("occupation", "Employee — Non-Financial");
      update("employer", "Keppel Corporation");
      update("annualIncomeSgd", "100-300k");
      update("taxResidencies", [{ country: "Singapore", tin: "S8412345D" }]);
    }, 1400);
  }
  return (
    <div className="space-y-4">
      <Note>
        Myinfo returns government-verified name, NRIC/FIN, date of birth, registered address, notice of assessment
        income and CPF details, so the client does not re-key or upload documents. Retrieval is simulated here.
      </Note>
      <div className="rounded-lg border border-border bg-muted/20 p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 grid place-items-center">
          <Fingerprint className="w-6 h-6 text-rose-500" />
        </div>
        <div className="text-sm font-medium">Retrieve verified data with Singpass</div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          The client authorises release of Myinfo fields: NRIC/FIN, name, date of birth, nationality, residential
          status, registered address, contact, employment and Notice of Assessment income.
        </p>
        <button
          type="button"
          onClick={retrieve}
          disabled={loading || form.singpassRetrieved}
          className="px-4 py-2 rounded-md bg-rose-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {form.singpassRetrieved ? "Myinfo data retrieved ✓" : loading ? "Redirecting to Singpass…" : "Retrieve with Singpass"}
        </button>
        {form.singpassRetrieved && (
          <div className="text-left mx-auto max-w-md rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-1.5">
            <Row k="Name" v={form.fullName} />
            <Row k="NRIC / FIN" v={maskNric(form.nric)} />
            <Row k="Date of birth" v={form.dob} />
            <Row k="Residential status" v="Singapore Citizen" />
            <Row k="Registered address" v={form.address} />
            <Row k="Assessable income" v="S$100k – 300k" />
          </div>
        )}
      </div>
      <div className="text-center text-xs text-muted-foreground space-y-2">
        <p>
          No Singpass? Continue and capture details manually — certified true copies of NRIC/passport and proof of
          address, plus a live face verification, will then be required for non-face-to-face onboarding.
        </p>
        {!form.singpassRetrieved && (
          <button
            type="button"
            onClick={() => update("noSingpass", !form.noSingpass)}
            className={`text-xs px-3 h-8 rounded-md border ${form.noSingpass ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
          >
            {form.noSingpass ? "Continuing without Singpass ✓" : "Continue without Singpass"}
          </button>
        )}
      </div>
    </div>
  );
}

function maskNric(n: string) {
  if (n.length < 5) return n;
  return `${n[0]}····${n.slice(-4)}`;
}

function IdentityStep({ form, update }: { form: SgForm; update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void }) {
  return (
    <div className="space-y-4">
      <Note>Fields retrieved from Myinfo are pre-filled and treated as verified. Edits to verified fields trigger manual review.</Note>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full name (as per NRIC / FIN)">
          <input className={inputCls} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Tan Wei Ming" />
        </Field>
        <Field label="Alias / Chinese name (optional)">
          <input className={inputCls} value={form.aliasName} onChange={(e) => update("aliasName", e.target.value)} placeholder="陈伟明" />
        </Field>
        <Field label="NRIC / FIN" hint="S / T for citizens & PRs, F / G / M for foreigners">
          <input className={inputCls + " uppercase"} maxLength={9} value={form.nric} onChange={(e) => update("nric", e.target.value.toUpperCase())} placeholder="S1234567D" />
        </Field>
        <Field label="Date of birth">
          <input type="date" className={inputCls} value={form.dob} onChange={(e) => update("dob", e.target.value)} />
        </Field>
        <Field label="Nationality">
          <input className={inputCls} value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
        </Field>
        <Field label="Residential status">
          <select className={inputCls} value={form.residency} onChange={(e) => update("residency", e.target.value as SgForm["residency"])}>
            <option value="">Select…</option>
            <option value="citizen">Singapore Citizen</option>
            <option value="pr">Permanent Resident</option>
            <option value="employment-pass">Employment / S Pass holder</option>
            <option value="foreigner">Foreigner (non-resident)</option>
          </select>
        </Field>
        <Field label="Postal code">
          <input inputMode="numeric" maxLength={6} className={inputCls} value={form.postal} onChange={(e) => update("postal", e.target.value.replace(/\D/g, ""))} placeholder="238823" />
        </Field>
        <Field label="Residential address">
          <input className={inputCls} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Blk 12 Orchard Boulevard #14-05" />
        </Field>
        <Field label="Email">
          <input type="email" className={inputCls} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.sg" />
        </Field>
        <Field label="Mobile (+65)" hint="8 digits beginning with 8 or 9">
          <input inputMode="numeric" maxLength={8} className={inputCls} value={form.mobile} onChange={(e) => update("mobile", e.target.value.replace(/\D/g, ""))} placeholder="91234567" />
        </Field>
      </div>
    </div>
  );
}

function CddStep({ form, update }: { form: SgForm; update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void }) {
  const [screening, setScreening] = useState(false);
  function toggleSow(v: string) {
    update("sourceOfWealth", form.sourceOfWealth.includes(v) ? form.sourceOfWealth.filter((x) => x !== v) : [...form.sourceOfWealth, v]);
  }
  function patchTax(i: number, key: "country" | "tin", value: string) {
    const next = form.taxResidencies.slice();
    next[i] = { ...next[i], [key]: value } as { country: string; tin: string };
    update("taxResidencies", next);
  }
  return (
    <div className="space-y-5">
      <Note>
        Due diligence under MAS Notice SFA04-N02 / Notice 626 — occupation, source of wealth and funds, PEP status
        and sanctions screening. A PEP or higher-risk match escalates the file to enhanced due diligence with
        senior-management approval.
      </Note>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Occupation">
          <select className={inputCls} value={form.occupation} onChange={(e) => update("occupation", e.target.value)}>
            <option value="">Select…</option>
            {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Employer / business name">
          <input className={inputCls} value={form.employer} onChange={(e) => update("employer", e.target.value)} placeholder="Company name" />
        </Field>
        <Field label="Annual income (SGD)">
          <select className={inputCls} value={form.annualIncomeSgd} onChange={(e) => update("annualIncomeSgd", e.target.value as SgForm["annualIncomeSgd"])}>
            <option value="">Select…</option>
            <option value="<50k">Below S$50,000</option>
            <option value="50-100k">S$50,000 – 100,000</option>
            <option value="100-300k">S$100,000 – 300,000</option>
            <option value="300k-1m">S$300,000 – 1 million</option>
            <option value=">1m">Above S$1 million</option>
          </select>
        </Field>
        <Field label="Source of funds for this account">
          <input className={inputCls} value={form.sourceOfFunds} onChange={(e) => update("sourceOfFunds", e.target.value)} placeholder="e.g. Monthly salary credited to DBS account" />
        </Field>
      </div>

      <div className="rounded-md border border-border p-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Source of wealth (select all that apply)</div>
        <div className="flex flex-wrap gap-2">
          {SOURCE_OF_WEALTH.map((s) => {
            const on = form.sourceOfWealth.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSow(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-md border border-border p-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Politically exposed person declaration</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { v: "no", l: "Not a PEP" },
            { v: "self", l: "I am a PEP" },
            { v: "family", l: "Family member / close associate of a PEP" },
          ].map((o) => (
            <button key={o.v} type="button" onClick={() => update("pep", o.v as SgForm["pep"])}
              className={`text-sm px-3 py-2 rounded-md border text-left ${form.pep === o.v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
              {o.l}
            </button>
          ))}
        </div>
        {form.pep && form.pep !== "no" && (
          <div className="space-y-2">
            <Field label="PEP details — position, jurisdiction, relationship">
              <input className={inputCls} value={form.pepDetails} onChange={(e) => update("pepDetails", e.target.value)} placeholder="e.g. Spouse of a serving Member of Parliament, Malaysia" />
            </Field>
            <div className="text-[11px] text-amber-600 flex gap-1.5 items-start">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Enhanced due diligence applies: senior-management approval, corroborated source of wealth and ongoing monitoring.
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border p-3 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">FATCA / CRS self-certification</div>
        <Check checked={form.usPerson} onChange={(v) => update("usPerson", v)} label="I am a US citizen or US tax resident (FATCA reportable)" />
        {form.taxResidencies.map((t, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <Field label="Country / jurisdiction of tax residence">
              <input className={inputCls} value={t.country} onChange={(e) => patchTax(i, "country", e.target.value)} placeholder="Singapore" />
            </Field>
            <Field label="Tax Identification Number" hint="For Singapore residents the TIN is the NRIC / FIN">
              <input className={inputCls} value={t.tin} onChange={(e) => patchTax(i, "tin", e.target.value)} placeholder="S1234567D" />
            </Field>
            {form.taxResidencies.length > 1 && (
              <button type="button" onClick={() => update("taxResidencies", form.taxResidencies.filter((_, x) => x !== i))}
                className="h-9 px-3 text-xs rounded-md border border-border hover:bg-destructive/10 hover:text-destructive">Remove</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => update("taxResidencies", [...form.taxResidencies, { country: "", tin: "" }])}
          className="text-xs px-3 py-1.5 rounded-md border border-dashed border-border hover:bg-accent">
          + Add another tax residency
        </button>
      </div>

      <div className="rounded-md border border-border p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium">Sanctions & adverse media screening</div>
          <div className="text-[11px] text-muted-foreground">UN / MAS TSOFA lists, OFAC, EU consolidated list and negative news.</div>
        </div>
        <button type="button" disabled={screening || form.screened}
          onClick={() => { setScreening(true); setTimeout(() => { setScreening(false); update("screened", true); }, 1200); }}
          className="px-3 h-9 rounded-md text-xs bg-primary text-primary-foreground disabled:opacity-50">
          {form.screened ? "No match — clear ✓" : screening ? "Screening…" : "Run screening"}
        </button>
      </div>
    </div>
  );
}

const AI_TESTS = [
  { id: "income", label: "Income test — income in the preceding 12 months of at least S$300,000" },
  { id: "netfin", label: "Financial assets test — net financial assets exceeding S$1 million" },
  { id: "netpersonal", label: "Net personal assets test — net personal assets exceeding S$2 million (primary residence capped at S$1 million)" },
  { id: "joint", label: "Joint account with an accredited investor account holder" },
];

function ClassificationStep({ form, update }: { form: SgForm; update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void }) {
  function toggleTest(id: string) {
    update("aiTests", form.aiTests.includes(id) ? form.aiTests.filter((x) => x !== id) : [...form.aiTests, id]);
  }
  return (
    <div className="space-y-5">
      <Note>
        Under section 4A of the Securities and Futures Act, accredited-investor status is opt-in. Retail investors keep
        the full protections of the FAA — prospectus disclosure, CKA/CAR gating and the MAS-prescribed complaints and
        suitability regime.
      </Note>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { v: "retail", t: "Retail Investor", d: "Full regulatory protections. Access to authorised / recognised collective investment schemes and Excluded Investment Products." },
          { v: "accredited", t: "Accredited Investor (opt-in)", d: "Access to restricted schemes, private markets and structured notes; reduced disclosure and safeguards." },
        ].map((o) => (
          <button key={o.v} type="button" onClick={() => update("classification", o.v as SgForm["classification"])}
            className={`text-left rounded-lg border p-4 transition-colors ${form.classification === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
            <div className="text-sm font-semibold">{o.t}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">{o.d}</div>
          </button>
        ))}
      </div>

      {form.classification === "accredited" && (
        <div className="rounded-md border border-border p-3 space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Eligibility tests met</div>
          {AI_TESTS.map((t) => (
            <Check key={t.id} checked={form.aiTests.includes(t.id)} onChange={() => toggleTest(t.id)} label={t.label} />
          ))}
          <div className="border-t border-border pt-3">
            <Check
              checked={form.aiOptIn}
              onChange={(v) => update("aiOptIn", v)}
              label="I consent to be treated as an Accredited Investor and understand the protections I give up."
              hint="Status must be reconfirmed at least every 12 months; the client may opt out at any time in writing. Supporting evidence (NOA, bank / CDP statements, valuation reports) must be on file."
            />
          </div>
        </div>
      )}

      {form.classification === "retail" && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
          Retail classification selected — product access is limited to authorised and recognised schemes, and any
          Specified Investment Product will be gated by the CKA / CAR outcome in the next step.
        </div>
      )}
    </div>
  );
}

function CkaStep({ form, update, passed }: { form: SgForm; update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void; passed: boolean }) {
  function toggle(k: string) {
    update("ckaFlags", form.ckaFlags.includes(k) ? form.ckaFlags.filter((x) => x !== k) : [...form.ckaFlags, k]);
  }
  return (
    <div className="space-y-5">
      <Note>
        The Customer Knowledge Assessment (unlisted SIPs) and Customer Account Review (listed SIPs) test whether the
        client has the education, work experience or transaction history to understand Specified Investment Products
        such as structured funds, futures-based ETFs and leveraged products.
      </Note>
      <div className="space-y-3">
        {CKA_QUESTIONS.map((q) => (
          <div key={q.key} className={`rounded-md border p-3 ${form.ckaFlags.includes(q.key) ? "border-primary bg-primary/5" : "border-border"}`}>
            <Check checked={form.ckaFlags.includes(q.key)} onChange={() => toggle(q.key)} label={q.label} hint={q.detail} />
          </div>
        ))}
      </div>

      <div className={`rounded-md p-4 ${passed ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
        <div className="text-sm font-semibold">{passed ? "CKA / CAR passed" : "CKA / CAR not passed"}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {passed
            ? "The client may transact in Specified Investment Products on an execution-only basis, subject to product due diligence."
            : "The client may still invest in Excluded Investment Products (plain unit trusts, listed shares, SSBs). Any SIP transaction must be preceded by advice from a qualified representative, with the recommendation documented."}
        </p>
      </div>

      <Check
        checked={form.ckaAcknowledged}
        onChange={(v) => update("ckaAcknowledged", v)}
        label="The outcome above has been explained to the client and acknowledged."
      />
    </div>
  );
}

function RiskStep({
  form, update, score, band, allocation,
}: {
  form: SgForm;
  update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void;
  score: number;
  band: { label: string; color: string; bg: string };
  allocation: { equity: number; bonds: number; alternates: number; cash: number };
}) {
  const complete = Object.keys(form.riskAnswers).length === RISK_QUESTIONS.length;
  const rows = [
    { label: "Equity", value: allocation.equity, color: "bg-sky-500", sub: "SG / global developed / Asia ex-Japan funds" },
    { label: "Bonds", value: allocation.bonds, color: "bg-emerald-500", sub: "SGD investment grade, SGS, Asian credit" },
    { label: "Alternates", value: allocation.alternates, color: "bg-amber-500", sub: "S-REITs, gold, multi-asset income" },
    { label: "Cash", value: allocation.cash, color: "bg-slate-400", sub: "SGD money market / T-bills" },
  ];
  return (
    <div className="space-y-5">
      <Note>Suitability assessment under MAS FAA-N16. The recommended mix is indicative and must be documented in the advice record.</Note>
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
                  <button key={oi} type="button"
                    onClick={() => update("riskAnswers", { ...form.riskAnswers, [String(qi)]: oi })}
                    className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"}`}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {complete && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Recommended asset allocation (SGD)</div>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-border">
            {rows.map((r) => <div key={r.label} className={r.color} style={{ width: `${r.value}%` }} title={`${r.label} ${r.value}%`} />)}
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
      )}
    </div>
  );
}

function BankStep({ form, update }: { form: SgForm; update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void }) {
  return (
    <div className="space-y-5">
      <Note>
        Funds must come from an account in the client's own name (third-party payments are declined). SRS and CPF
        Investment Scheme monies can only be applied to schemes included under those schemes.
      </Note>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Bank">
          <select className={inputCls} value={form.bankName}
            onChange={(e) => {
              const b = SG_BANKS.find((x) => x.name === e.target.value);
              update("bankName", e.target.value);
              update("swift", b?.swift ?? "");
            }}>
            <option value="">Select bank…</option>
            {SG_BANKS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="SWIFT / BIC" hint="Auto-filled from bank selection">
          <input className={inputCls + " bg-muted/40"} readOnly value={form.swift} placeholder="Auto" />
        </Field>
        <Field label="Account number (last 4)">
          <input inputMode="numeric" maxLength={4} className={inputCls} value={form.accountLast4} onChange={(e) => update("accountLast4", e.target.value.replace(/\D/g, ""))} placeholder="6789" />
        </Field>
        <Field label="Funding mode">
          <select className={inputCls} value={form.payMode} onChange={(e) => update("payMode", e.target.value as SgForm["payMode"])}>
            <option value="">Select…</option>
            <option value="giro">GIRO direct debit (for regular savings plans)</option>
            <option value="paynow">PayNow QR / UEN transfer</option>
            <option value="fast">FAST bank transfer</option>
          </select>
        </Field>
      </div>

      <div className="rounded-md border border-border p-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Additional investment wallets</div>
        <Check checked={form.useSrs} onChange={(v) => update("useSrs", v)} label="Link Supplementary Retirement Scheme (SRS) account" hint="SRS contributions are tax deductible; withdrawals before statutory retirement age attract a 5% penalty." />
        <Check checked={form.useCpfis} onChange={(v) => update("useCpfis", v)} label="Link CPF Investment Scheme (CPFIS-OA / SA) account" hint="Only CPFIS-included funds are eligible; CPFIS-SA carries tighter risk classification limits." />
      </div>
    </div>
  );
}

function ReviewStep({
  form, update, band, allocation, accredited, ckaPassed,
}: {
  form: SgForm;
  update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void;
  band: string;
  allocation: { equity: number; bonds: number; alternates: number; cash: number };
  accredited: boolean;
  ckaPassed: boolean;
}) {
  const decl = [
    { k: "accuracy", l: "I confirm all information provided is true, accurate and complete, and will notify any change within 30 days." },
    { k: "crs", l: "I certify my FATCA / CRS tax residency declaration and consent to reporting to IRAS where required." },
    { k: "riskdisc", l: "I have read the risk disclosure statement and product highlights sheet, and understand investments may lose value." },
    { k: "fees", l: "I accept the fee schedule, including trailer fees and platform charges disclosed to me." },
    { k: "marketing", l: "Optional: I consent to receiving marketing material (PDPA / DNC)." },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Identity">
          <Row k="Name" v={form.fullName || "—"} />
          <Row k="NRIC / FIN" v={form.nric ? maskNric(form.nric) : "—"} />
          <Row k="Residential status" v={form.residency || "—"} />
          <Row k="Contact" v={form.mobile ? `+65 ${form.mobile}` : "—"} />
          <Row k="Myinfo" v={form.singpassRetrieved ? "Verified via Singpass" : "Manual capture"} />
          <Row k="Documents" v={`${Object.keys(form.docs).length} uploaded${missingRequiredDocs(sgDocSlots(form), form.docs).length ? " · pending" : " · complete"}`} />
          <Row k="Face verification" v={form.faceCapture ? `Passed · liveness ${form.faceCapture.livenessScore}% / match ${form.faceCapture.matchScore}%` : form.singpassRetrieved ? "Not required (Singpass verified)" : "Not captured"} />
        </Card>
        <Card title="Due diligence">
          <Row k="Occupation" v={form.occupation || "—"} />
          <Row k="Income band" v={form.annualIncomeSgd || "—"} />
          <Row k="Source of wealth" v={form.sourceOfWealth.join(", ") || "—"} />
          <Row k="PEP status" v={form.pep === "no" ? "Not a PEP" : form.pep ? "PEP — EDD required" : "—"} />
          <Row k="Screening" v={form.screened ? "Clear" : "Pending"} />
        </Card>
        <Card title="Classification & knowledge">
          <Row k="Classification" v={accredited ? "Accredited Investor (opted in)" : "Retail Investor"} />
          <Row k="CKA / CAR" v={ckaPassed ? "Passed" : "Not passed — advised sales only"} />
          <Row k="Tax residency" v={form.taxResidencies.map((t) => t.country).filter(Boolean).join(", ") || "—"} />
          <Row k="US person" v={form.usPerson ? "Yes — FATCA reportable" : "No"} />
        </Card>
        <Card title="Suitability & funding">
          <Row k="Risk profile" v={band} />
          <Row k="Recommended mix" v={`${allocation.equity}/${allocation.bonds}/${allocation.alternates}/${allocation.cash}`} />
          <Row k="Bank" v={form.bankName ? `${form.bankName} ····${form.accountLast4}` : "—"} />
          <Row k="Funding mode" v={form.payMode ? form.payMode.toUpperCase() : "—"} />
          <Row k="Wallets" v={[form.useSrs && "SRS", form.useCpfis && "CPFIS"].filter(Boolean).join(", ") || "Cash only"} />
        </Card>
      </div>

      <div className="rounded-md border border-border p-4 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Declarations</div>
        {decl.map((d) => (
          <Check key={d.k} checked={!!form.declarations[d.k]} onChange={(v) => update("declarations", { ...form.declarations, [d.k]: v })} label={d.l} />
        ))}
      </div>
    </div>
  );
}


// ------------------------------------------------- documents (MAS / Myinfo)

function sgDocSlots(form: SgForm): DocSlot[] {
  const slots: DocSlot[] = [];
  const myinfo = form.singpassRetrieved;
  const foreigner = form.residency === "foreigner" || form.residency === "employment-pass";

  if (!myinfo) {
    slots.push(
      {
        id: "nric",
        label: "NRIC / FIN — front and back",
        hint: "Certified true copy for non-face-to-face onboarding",
        required: true,
        note: "Under MAS Notice 626, identity documents must be verified against an independent source when the client is not seen in person.",
      },
      {
        id: "address",
        label: "Proof of residential address",
        hint: "Bank or utility statement issued in the last 3 months",
        required: true,
      },
    );
  }

  if (foreigner) {
    slots.push(
      { id: "passport", label: "Passport — biodata page", hint: "Mandatory for foreigners and pass holders", required: true },
      { id: "pass", label: "Employment Pass / S Pass / Dependant Pass", hint: "Both sides, showing validity dates", required: true },
    );
  }

  const edd =
    form.pep !== "no" ||
    form.annualIncomeSgd === "300k-1m" ||
    form.annualIncomeSgd === ">1m" ||
    form.sourceOfWealth.some((w) => w === "Inheritance / gift" || w === "Sale of property" || w === "Business ownership / dividends");

  if (edd) {
    slots.push({
      id: "sow",
      label: "Source of wealth evidence",
      hint: "Payslip / CPF statement, sale & purchase agreement, dividend statement or a letter from a lawyer",
      required: true,
      note: "Enhanced due diligence triggered by the declared PEP status, income band or source of wealth.",
    });
  }

  if (form.classification === "accredited") {
    slots.push({
      id: "aiProof",
      label: "Accredited Investor eligibility proof",
      hint: "Notice of Assessment, latest 12 months' payslips, or a bank/CDP statement evidencing net financial assets",
      required: true,
      note: "SFA s.4A requires documentary evidence before AI opt-in takes effect; status must be re-affirmed annually.",
    });
  }

  if (form.useCpfis || form.useSrs) {
    slots.push({
      id: "cpfSrs",
      label: "CPFIS / SRS account statement",
      hint: "Latest statement from your CPF Investment or SRS operator bank",
      required: false,
    });
  }

  slots.push({
    id: "signature",
    label: "Specimen signature",
    hint: "Signature on plain paper — used for instruction verification",
    required: false,
  });

  return slots;
}

function DocumentsStep({ form, update }: { form: SgForm; update: <K extends keyof SgForm>(k: K, v: SgForm[K]) => void }) {
  const slots = useMemo(() => sgDocSlots(form), [form]);
  const requiredCount = slots.filter((s) => s.required).length;
  const doneCount = slots.filter((s) => s.required && form.docs[s.id]).length;

  return (
    <div className="space-y-4">
      <Note>
        {form.singpassRetrieved
          ? "Myinfo already delivered government-verified identity and address, so only exception documents are requested here."
          : "Without Singpass this is a non-face-to-face account opening: identity documents and a live face verification are mandatory under MAS Notice 626."}
      </Note>

      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Documents</div>
        <span className="text-xs text-muted-foreground">{doneCount} of {requiredCount} required uploaded</span>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
          No documents outstanding — Myinfo covers identity, address and income for this client profile.
        </div>
      ) : (
        <DocumentSlots slots={slots} docs={form.docs} onChange={(d) => update("docs", d)} />
      )}

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Identity proofing</div>
        {form.singpassRetrieved ? (
          <div className="rounded-md border border-border p-3 text-xs text-muted-foreground space-y-2">
            <p>
              Singpass Face Verification already satisfied the identity-proofing requirement. An additional capture is
              optional and simply strengthens the audit record.
            </p>
            <FaceLivenessCapture title="Optional face capture" result={form.faceCapture} onResult={(r) => update("faceCapture", r)} />
          </div>
        ) : (
          <FaceLivenessCapture
            title="Face verification — liveness & document match"
            subtitle="Non-face-to-face identity proofing: a live, time-stamped and geo-tagged capture matched against the NRIC or passport photograph."
            result={form.faceCapture}
            onResult={(r) => update("faceCapture", r)}
          />
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1.5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}
