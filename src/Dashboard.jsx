import * as React from "react";
import { useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  RefreshCcw,
  FileText,
  LogOut,
  Menu,
  Calendar,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import { FileDropzone } from "@/components/file-dropzone";
import bccLogo from "@/assets/bcclogo.png";

// ===== Env =====
const FLOW_URL = import.meta.env.VITE_FLOW_URL;
const PREFILL_URL = import.meta.env.VITE_PREFILL_URL;
const LIST_BY_SCHOOL_URL = import.meta.env.VITE_LIST_BY_SCHOOL_URL;

// ===== Helpers =====
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
  });

function asString(v) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function startOfDay(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  x.setHours(0, 0, 0, 0);
  return x;
}

function dueBadge(dueDate) {
  const due = startOfDay(dueDate);
  if (!due)
    return {
      label: "No due date",
      className: "bg-muted text-muted-foreground",
    };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = due.getTime() - today.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < 0)
    return {
      label: "Overdue",
      className: "bg-destructive text-destructive-foreground",
    };
  if (diff === 0)
    return { label: "Due today", className: "bg-amber-500 text-white" };
  if (diff <= 7 * oneDay)
    return { label: "Due soon", className: "bg-emerald-600 text-white" };

  return {
    label: "Awaiting response",
    className: "bg-secondary text-secondary-foreground",
  };
}

async function postToFlow(payload) {
  if (!FLOW_URL) throw new Error("Missing VITE_FLOW_URL");
  const resp = await fetch(FLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${text || "No response"}`);
  }
  try {
    return await resp.json();
  } catch {
    return { ok: true };
  }
}

async function fetchConsultationsForSchool(dfeValue, codeValue, location) {
  const qs = new URLSearchParams(location.search);
  const token = qs.get("token");
  const idConsultParam =
    qs.get("idConsult") ||
    qs.get("consultId") ||
    qs.get("ConsultID") ||
    qs.get("idConsultation");

  // Mode 1: Token (prefill)
  if (token) {
    if (!PREFILL_URL) throw new Error("Missing VITE_PREFILL_URL");
    let url = `${PREFILL_URL}${PREFILL_URL.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    if (idConsultParam) {
      url += `&idConsult=${encodeURIComponent(idConsultParam)}`;
    }
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Prefill API failed");
    const data = await resp.json();

        return [
      {
        id: asString(
          data.idConsult ?? data.idConsultation ?? idConsultParam ?? token,
        ),
        impulseId: asString(data.impulseId ?? ""),
        forename: asString(data.forename ?? ""),
        surname: asString(data.surname ?? ""),
        settingName: asString(data.settingName ?? ""),
        idConsult: asString(
          data.idConsult ?? data.idConsultation ?? idConsultParam ?? "",
        ),
        phaseId: asString(data.phaseId ?? ""),
        dueDate: asString(data.dueDate ?? ""),
      },
    ];
  }

  // Mode 2: Portal Login
  if (!dfeValue || !codeValue) {
    throw new Error("Please enter both DfE number and login code.");
  }
  if (!LIST_BY_SCHOOL_URL) throw new Error("Missing VITE_LIST_BY_SCHOOL_URL");

  const key = `${dfeValue}/${codeValue}`;
  const url = `${LIST_BY_SCHOOL_URL}${LIST_BY_SCHOOL_URL.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("List-by-school API failed");

  const list = await resp.json();
  if (!Array.isArray(list)) {
    const msg =
      list?.error || list?.message || "Unexpected response from login API.";
    throw new Error(msg);
  }
    return list.map((c, i) => ({
    id: `c${i + 1}`,
    impulseId: asString(c.impulseId ?? ""),
    forename: asString(c.forename ?? ""),
    surname: asString(c.surname ?? ""),
    settingName: asString(c.settingName ?? ""),
    idConsult: asString(c.idConsult ?? c.idConsultation ?? ""),
    phaseId: asString(c.phaseId ?? ""),
    dueDate: asString(c.dueDate ?? ""),
  }));
}

// ===== UI building blocks =====
function NavButton({ icon: Icon, active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "glass-btn w-full flex items-center gap-2 px-3 py-2.5 text-left",
        "text-white/90 hover:text-white",
        active && "glass-btn--active",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 opacity-90" />
      <span className="font-medium capitalize">{children}</span>
    </button>
  )
}

function AppSidebar({
  currentView,
  setCurrentView,
  canSeePortalViews,
  onLogout,
}) {
  const items = [
    { key: "home", label: "home", icon: Home, show: true },
    {
      key: "consultations",
      label: "consultations",
      icon: ClipboardList,
      show: canSeePortalViews,
    },
    {
      key: "phase-transfer",
      label: "phase transfer",
      icon: RefreshCcw,
      show: canSeePortalViews,
    },
    {
      key: "annual-reviews",
      label: "annual reviews",
      icon: FileText,
      show: canSeePortalViews,
    },
  ].filter((x) => x.show);

return (
  <div className="flex h-full flex-col text-white">
<div className="px-5 pt-6 pb-4">
  <img
    src={bccLogo}
    alt="Birmingham City Council"
    className="w-full h-[180px] object-contain"
  />
  <div className="mt-3 text-center text-2xl font-semibold tracking-wide text-white/95">
    SENAR Portal
  </div>
</div>

      <div className="mt-5 px-3">
        <div className="mb-2 px-2 text-xs font-medium text-white/70">
          Portal Menu
        </div>
        <div className="space-y-2">
            {items.filter((it) => it.show).map((it) => (
                <NavButton
                key={it.key}
                icon={it.icon}
                active={currentView === it.key}
                onClick={() => {
                    setCurrentView(it.key)
                    window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                >
                {it.label}
                </NavButton>
            ))}
            </div>
      </div>

      <div className="mt-auto p-4">
        {canSeePortalViews && (
                    <button
            type="button"
            onClick={onLogout}
            className={cn(
                "glass-btn w-full flex items-center justify-center gap-2 px-3 py-2.5",
                "text-white/95 hover:text-white",
            )}
            >
            <LogOut className="h-4 w-4 opacity-90" />
            <span className="font-medium">Log out</span>
            </button>
        )}

        <div className="mt-3 text-center text-[11px] text-white/60">
          Birmingham City Council • SENAR
        </div>
      </div>
    </div>
  );
}

// ===== Main Dashboard =====
export default function Dashboard() {
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const token = qs.get("token");
  const tokenMode = Boolean(token);
  const requestedIdConsult =
    qs.get("idConsult") ||
    qs.get("consultId") ||
    qs.get("ConsultID") ||
    qs.get("idConsultation");

  const [currentView, setCurrentView] = React.useState(
    tokenMode ? "consultations" : "home",
  );
  const [consultations, setConsultations] = React.useState([]);
  const [selectedConsultationId, setSelectedConsultationId] =
    React.useState(null);

  // Auth state (mirrors your current code) :contentReference[oaicite:10]{index=10}
  const [dfe, setDfe] = React.useState("");
  const [schoolCode, setSchoolCode] = React.useState("");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [portalError, setPortalError] = React.useState("");
  const [logonRequested, setLogonRequested] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const canAttemptLogin =
  dfe.trim().length > 0 && schoolCode.trim().length > 0 && !loggingIn;
  const [portalSettingName, setPortalSettingName] = React.useState("");

  // Consultation form
  const [suitableSetting, setSuitableSetting] = React.useState("");
  const [suitableReasoning, setSuitableReasoning] = React.useState("");
  const [attendanceIncompatible, setAttendanceIncompatible] =
    React.useState("");
  const [attendanceReasoning, setAttendanceReasoning] = React.useState("");
  const [proposedStartDate, setProposedStartDate] = React.useState("");
  const [bandingOrFunding, setBandingOrFunding] = React.useState("");
  const [additionalInfo, setAdditionalInfo] = React.useState("");
  const [responderName, setResponderName] = React.useState("");
  const [responderRole, setResponderRole] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState("");

  const consultationVisibleValid =
    !!selectedConsultationId &&
    (suitableSetting === "Yes" || suitableSetting === "No") &&
    (attendanceIncompatible === "Yes" || attendanceIncompatible === "No") &&
    responderName.trim().length > 0 &&
    responderRole.trim().length > 0 &&
    (suitableSetting !== "No" || suitableReasoning.trim().length > 0) &&
    (attendanceIncompatible !== "Yes" ||
      attendanceReasoning.trim().length > 0) &&
    !(
      suitableSetting === "Yes" &&
      attendanceIncompatible === "No" &&
      (proposedStartDate.trim().length === 0 ||
        bandingOrFunding.trim().length === 0 ||
        additionalInfo.trim().length === 0)
    );

  // Annual review (now supports multiple files)
  const [arData, setArData] = React.useState({
    impulseId: "",
    dob: "",
    reviewDate: "",
    recommendation: "",
    attachments: [],
  });
  const annualReviewVisibleValid =
  arData.impulseId.trim().length > 0 &&
  arData.dob.trim().length > 0 &&
  arData.reviewDate.trim().length > 0 &&
  arData.recommendation.trim().length > 0 &&
  (arData.attachments?.length ?? 0) > 0;


  const hasToken = tokenMode;
  const canSeePortalViews = isLoggedIn || hasToken;

  // Persistence
  const STORAGE_KEY = "senarPortalLogin";
  const persistLogin = (dfeVal, codeVal) =>
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dfe: dfeVal, schoolCode: codeVal }),
    );
  const clearLogin = () => localStorage.removeItem(STORAGE_KEY);
  const restoreLogin = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

  React.useEffect(() => {
    if (hasToken) return;
    const saved = restoreLogin();
    if (saved?.dfe && saved?.schoolCode) {
      setDfe(saved.dfe);
      setSchoolCode(saved.schoolCode);
      setLogonRequested(true);
    }
    setLoading(false);
  }, [hasToken]);

  React.useEffect(() => {
    async function load() {
      const hasTokenLocal = tokenMode;

      // Token mode: allow
      if (hasTokenLocal) {
        setLoading(true);
        try {
          const data = await fetchConsultationsForSchool("", "", location);
          const req = asString(requestedIdConsult).trim();
          const chosen = req
            ? data.find((c) => asString(c.idConsult).trim() === req)
            : data[0];
          const single = chosen ? [chosen] : data;
          setConsultations(single);
          setPortalSettingName(single?.[0]?.settingName ?? "");
          setIsLoggedIn(true);
          setPortalError("");
          setCurrentView("consultations");
          setSelectedConsultationId(single?.[0]?.id ?? null);
        } catch (e) {
          setPortalError(e.message);
          setIsLoggedIn(false);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Portal login mode
      if (!logonRequested) {
        setLoading(false);
        return;
      }

      const d = dfe.trim();
      const c = schoolCode.trim();
      if (!d || !c) {
        setPortalError("Please enter both DfE number and login code.");
        setIsLoggedIn(false);
        setLoading(false);
        setLoggingIn(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchConsultationsForSchool(d, c, location);
        setConsultations(data);
        setPortalSettingName(data?.[0]?.settingName ?? "");
        setIsLoggedIn(true);
        setPortalError("");
        persistLogin(d, c);
      } catch (e) {
        setPortalError(e.message);
        setIsLoggedIn(false);
        clearLogin();
      } finally {
        setLoading(false);
        setLoggingIn(false);
      }
    }
    load();
  }, [logonRequested, location, dfe, schoolCode]);

  const selectedConsultation = consultations.find(
    (c) => c.id === selectedConsultationId,
  );

  const showLogin = !hasToken && !isLoggedIn;

  const handlePortalLogin = (e) => {
    e.preventDefault();
    setPortalError("");

    const d = dfe.trim();
    const c = schoolCode.trim();

    if (!d || !c) {
      setPortalError("Please enter both DfE number and login code.");
      toast.error("Enter both login fields.");
      return;
    }

    setDfe(d);
    setSchoolCode(c);

    setLoggingIn(true);
    setLogonRequested(true);
  };

  const handleLogout = () => {
    clearLogin();
    setIsLoggedIn(false);
    setLogonRequested(false);
    setDfe("");
    setSchoolCode("");
    setSelectedConsultationId(null);
    setPortalSettingName("");
    setCurrentView("home");
    toast.success("Logged out.");
  };

  const resetConsultationForm = () => {
    setSuitableSetting("");
    setSuitableReasoning("");
    setAttendanceIncompatible("");
    setAttendanceReasoning("");
    setProposedStartDate("");
    setBandingOrFunding("");
    setAdditionalInfo("");
    setResponderName("");
    setResponderRole("");
    setSubmitMessage("");
  };

  // Submit: Consultation
  const handleConsultationSubmit = async (e) => {
    e.preventDefault();
    if (!consultationVisibleValid) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    setSubmitMessage("");
    try {
      const payload = {
        type: "CONSULTATION_RESPONSE",

        suitableSetting: asString(suitableSetting) || null,
        suitableReasoning:
          suitableSetting === "No" ? (asString(suitableReasoning) || null) : null,

        attendanceIncompatible: asString(attendanceIncompatible) || null,
        attendanceReasoning:
          attendanceIncompatible === "Yes"
            ? (asString(attendanceReasoning) || null)
            : null,

        proposedStartDate:
          suitableSetting === "Yes" && attendanceIncompatible === "No"
            ? (asString(proposedStartDate) || null)
            : null,

        bandingOrFunding:
          suitableSetting === "Yes" && attendanceIncompatible === "No"
            ? (asString(bandingOrFunding) || null)
            : null,

        additionalInfo:
          suitableSetting === "Yes" && attendanceIncompatible === "No"
            ? (asString(additionalInfo) || null)
            : null,

        responderName: asString(responderName) || null,
        responderRole: asString(responderRole) || null,

        consultation: selectedConsultation
          ? {
              id: asString(selectedConsultation.id) || null,
              impulseId: asString(selectedConsultation.impulseId) || null,
              forename: asString(selectedConsultation.forename) || null,
              surname: asString(selectedConsultation.surname) || null,
              settingName: asString(selectedConsultation.settingName) || null,
              idConsult: asString(selectedConsultation.idConsult) || null,
              phaseId: asString(selectedConsultation.phaseId) || null,
              dueDate: asString(selectedConsultation.dueDate) || null,
            }
          : null,
      };

      await postToFlow(payload);

      toast.success("Consultation response submitted.");
      setConsultations((prev) =>
        prev.filter((c) => c.id !== selectedConsultationId),
      );
      setSelectedConsultationId(null);
      resetConsultationForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitMessage(err.message);
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit: Annual Review
  const handleARSubmit = async (e) => {
    e.preventDefault();
    if (!annualReviewVisibleValid) {
      toast.error(
        "Please complete all required fields and add at least one attachment.",
      );
      return;
    }
    setSubmitting(true);
    setSubmitMessage("");
    try {
      const attachments = await Promise.all(
        (arData.attachments || []).map(async (f) => ({
          name: f.name,
          contentType: f.type || "application/octet-stream",
          contentBase64: await fileToBase64(f),
        })),
      );

      const payload = {
        type: "ANNUAL_REVIEW",
        impulseId: asString(arData.impulseId),
        dob: asString(arData.dob),
        reviewDate: asString(arData.reviewDate),
        recommendation: asString(arData.recommendation),
        attachments, // <-- array
      };

      await postToFlow(payload);

      toast.success("Annual Review submitted.");
      setArData({
        impulseId: "",
        dob: "",
        reviewDate: "",
        recommendation: "",
        attachments: [],
      });
      setCurrentView("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitMessage(err.message);
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Page content =====
  const todayLabel = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const total = consultations.length;
  const overdue = consultations.filter((c) => {
    const due = startOfDay(c.dueDate);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return due && due < t;
  }).length;

  const dueSoon = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const next7 = new Date(+t + 7 * 24 * 60 * 60 * 1000);
    return consultations.filter((c) => {
      const due = startOfDay(c.dueDate);
      return due && due >= t && due <= next7;
    }).length;
  })();

  return (
    <div className="min-h-svh bg-linear-to-b from-background to-muted/30">
      <Toaster richColors />

      {/* Desktop sidebar */}
      {!tokenMode && (
              <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[320px] lg:flex-col lg:py-6 lg:pl-6">
          <div className="h-full w-full overflow-hidden rounded-[28px] bg-[#8B419E] shadow-2x1 ring-1 ring-white/10">
            <AppSidebar
              currentView={currentView}
              setCurrentView={(v) => {
                setCurrentView(v)
                setSelectedConsultationId(null)
                setSubmitMessage("")
              }}
              canSeePortalViews={canSeePortalViews}
              onLogout={handleLogout}
            />
          </div>
        </aside>
      )}

      {/* Main */}
      <div className={cn("lg:pl-[344px]", tokenMode && "lg:pl-0")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto relative flex max-w-6xl items-center gap-3 px-4 py-3">
            {/* Mobile nav */}
            {!tokenMode && (
                          <div className="lg:hidden">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Open menu">
                                  <Menu className="h-5 w-5" />
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="left" className="p-0 w-80 bg-transparent">
                              <div className="h-full w-full overflow-hidden rounded-[28px] bg-[#8B419E] shadow-xl ring-1 ring-black/10">
                                <AppSidebar
                                  currentView={currentView}
                                  setCurrentView={(v) => {
                                    setCurrentView(v);
                                    setSelectedConsultationId(null);
                                    setSubmitMessage("");
                                  }}
                                  canSeePortalViews={canSeePortalViews}
                                  onLogout={handleLogout}
                                />
                                </div>
                              </SheetContent>
                            </Sheet>
                          </div>
            )}


            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="text-base font-semibold leading-tight">
                {todayLabel}
              </div>
            </div>
            {canSeePortalViews && portalSettingName && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 w-[60%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-2xl font-semibold hidden md:block">
                {portalSettingName}
              </div>
            )}
            {canSeePortalViews && !tokenMode && (
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {total} total
                </Badge>
                <Badge className="bg-emerald-600 text-white">
                  {dueSoon} due soon
                </Badge>
                <Badge className="bg-destructive text-destructive-foreground">
                  {overdue} overdue
                </Badge>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-40" />
              </CardContent>
            </Card>
          ) : showLogin ? (
            <Card className="mx-auto max-w-xl">
              <CardHeader>
                <CardTitle>SENAR School Portal Login</CardTitle>
                <CardDescription>
                  Enter your DfE number and login code to view outstanding
                  consultations.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handlePortalLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label>DfE Number</Label>
                    <Input
                      value={dfe}
                      onChange={(e) => setDfe(e.target.value)}
                      placeholder="e.g. 3301000"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Login Code</Label>
                    <Input
                      type="password"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value)}
                    />
                  </div>

                  {portalError && (
                    <Alert variant="destructive">
                      <AlertTitle>Login failed</AlertTitle>
                      <AlertDescription>{portalError}</AlertDescription>
                    </Alert>
                  )}

                  {(!dfe.trim() || !schoolCode.trim()) && (
                    <div className="text-sm text-muted-foreground">
                      Enter both fields to continue.
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canAttemptLogin}
                  >
                    {loggingIn ? "Logging in…" : "Log in"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* HOME */}
              {currentView === "home" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Welcome to the SENAR Portal</CardTitle>
                      <CardDescription>
                        Review outstanding consultations for your school and submit annual review documentation to SENAR. 
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 text-sm font-semibold text-muted-foreground">Consultations</div>
                      {total === 0 ? (
                        <div className="text-muted-foreground">
                          There are currently no outstanding consultations for
                          your school.
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Card className="shadow-none">
                            <CardHeader className="pb-2">
                              <CardDescription>Total</CardDescription>
                              <CardTitle className="text-2xl">
                                {total}
                              </CardTitle>
                            </CardHeader>
                          </Card>

                          <Card className="shadow-none">
                            <CardHeader className="pb-2">
                              <CardDescription>
                                Due in next 7 days
                              </CardDescription>
                              <CardTitle className="text-2xl">
                                {dueSoon}
                              </CardTitle>
                            </CardHeader>
                          </Card>

                          <Card className="shadow-none">
                            <CardHeader className="pb-2">
                              <CardDescription>Overdue</CardDescription>
                              <CardTitle className="text-2xl">
                                {overdue}
                              </CardTitle>
                            </CardHeader>
                          </Card>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* CONSULTATIONS LIST */}
              {currentView === "consultations" && !selectedConsultationId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Outstanding Consultations</CardTitle>
                    <CardDescription>
                      Select a consultation to respond. Your response will be
                      submitted to SENAR.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {consultations.length === 0 ? (
                      <div className="text-muted-foreground">
                        No outstanding consultations found.
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {consultations.map((c) => {
                          const badge = dueBadge(c.dueDate);
                          return (
                            <button
                              key={c.id}
                              className={cn(
                                "text-left rounded-xl border bg-card p-4 transition",
                                "hover:shadow-sm hover:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
                              )}
                              onClick={() => setSelectedConsultationId(c.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold">
                                    {c.impulseId}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {c.forename} {c.surname}
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    "rounded-md px-2 py-1 text-xs font-medium",
                                    badge.className,
                                  )}
                                >
                                  {badge.label}
                                </span>
                              </div>

                              <Separator className="my-3" />

                              <div className="text-sm">
                                <div className="text-muted-foreground">
                                  Due date
                                </div>
                                <div className="font-medium">
                                  {c.dueDate
                                    ? new Date(c.dueDate).toLocaleDateString()
                                    : "—"}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* CONSULTATION FORM */}
              {currentView === "consultations" && selectedConsultationId && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle>
                          Responding for {selectedConsultation?.forename}{" "}
                          {selectedConsultation?.surname}
                        </CardTitle>
                        <CardDescription>
                          Impulse ID: {selectedConsultation?.impulseId}
                          {selectedConsultation?.idConsult ? (
                            <>
                              {" • "}Consultation ID: {selectedConsultation.idConsult}
                            </>
                          ) : null}
                        </CardDescription>
                      </div>
                      {!tokenMode && (
                                              <Button
                                                variant="secondary"
                                                onClick={() => {
                                                  setSelectedConsultationId(null);
                                                  setSubmitMessage("");
                                                }}
                                              >
                                                ← Back to list
                                              </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <form
                      onSubmit={handleConsultationSubmit}
                      className="space-y-7 max-w-3xl"
                    >
                      {/* Q1 */}
                      <section className="space-y-3">
                        <div className="font-semibold">
                          Is your setting suitable for the child/young person?
                        </div>
                        <RadioGroup
                          value={suitableSetting}
                          onValueChange={setSuitableSetting}
                          className="flex gap-6"
                        >
                          <label className="flex items-center gap-2">
                            <RadioGroupItem value="Yes" />
                            Yes
                          </label>
                          <label className="flex items-center gap-2">
                            <RadioGroupItem value="No" />
                            No
                          </label>
                        </RadioGroup>

                        {suitableSetting === "No" && (
                          <div className="space-y-2">
                            <Label>Reasoning (required)</Label>
                            <Textarea
                              rows={4}
                              value={suitableReasoning}
                              onChange={(e) =>
                                setSuitableReasoning(e.target.value)
                              }
                              required
                            />
                          </div>
                        )}
                      </section>

                      <Separator />

                      {/* Q2 */}
                      <section className="space-y-3">
                        <div className="font-semibold">
                          Would attendance be incompatible with efficient
                          education of others?
                        </div>
                        <RadioGroup
                          value={attendanceIncompatible}
                          onValueChange={setAttendanceIncompatible}
                          className="flex gap-6"
                        >
                          <label className="flex items-center gap-2">
                            <RadioGroupItem value="Yes" />
                            Yes
                          </label>
                          <label className="flex items-center gap-2">
                            <RadioGroupItem value="No" />
                            No
                          </label>
                        </RadioGroup>

                        {attendanceIncompatible === "Yes" && (
                          <div className="space-y-2">
                            <Label>Reasoning (required)</Label>
                            <Textarea
                              rows={4}
                              value={attendanceReasoning}
                              onChange={(e) =>
                                setAttendanceReasoning(e.target.value)
                              }
                              required
                            />
                          </div>
                        )}
                      </section>

                      {/* Conditional placement */}
                      {suitableSetting === "Yes" &&
                        attendanceIncompatible === "No" && (
                          <>
                            <Separator />
                            <section className="grid gap-5 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Proposed Start Date</Label>
                                <Input
                                  type="date"
                                  value={proposedStartDate}
                                  onChange={(e) =>
                                    setProposedStartDate(e.target.value)
                                  }
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Banding / Funding Requested</Label>
                                <Input
                                  value={bandingOrFunding}
                                  onChange={(e) =>
                                    setBandingOrFunding(e.target.value)
                                  }
                                  required
                                />
                              </div>

                              <div className="space-y-2 sm:col-span-2">
                                <Label>Additional Info</Label>
                                <Input
                                  value={additionalInfo}
                                  onChange={(e) =>
                                    setAdditionalInfo(e.target.value)
                                  }
                                  placeholder="e.g. Course title, length"
                                  required
                                />
                              </div>
                            </section>
                          </>
                        )}

                      <Separator />

                      {/* Responder */}
                      <section className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Your Name</Label>
                          <Input
                            value={responderName}
                            onChange={(e) => setResponderName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Your Role</Label>
                          <Input
                            value={responderRole}
                            onChange={(e) => setResponderRole(e.target.value)}
                            required
                          />
                        </div>
                      </section>

                      {submitMessage && (
                        <Alert variant="destructive">
                          <AlertTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Submission error
                          </AlertTitle>
                          <AlertDescription>{submitMessage}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          disabled={submitting || !consultationVisibleValid}
                          className="min-w-44"
                        >
                          {submitting ? "Submitting…" : "Submit Response"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => resetConsultationForm()}
                          disabled={submitting}
                        >
                          Clear form
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* ANNUAL REVIEWS */}
              {currentView === "annual-reviews" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Annual Review Submission</CardTitle>
                    <CardDescription>
                      Upload the review documentation and submit in one go
                      (multi-file supported).
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <form
                      onSubmit={handleARSubmit}
                      className="space-y-6 max-w-3xl"
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Impulse ID</Label>
                          <Input
                            required
                            value={arData.impulseId}
                            onChange={(e) =>
                              setArData((p) => ({
                                ...p,
                                impulseId: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date of Birth</Label>
                          <Input
                            type="date"
                            required
                            value={arData.dob}
                            onChange={(e) =>
                              setArData((p) => ({ ...p, dob: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date of Annual Review</Label>
                          <Input
                            type="date"
                            required
                            value={arData.reviewDate}
                            onChange={(e) =>
                              setArData((p) => ({
                                ...p,
                                reviewDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Recommendation</Label>
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
                            required
                            value={arData.recommendation}
                            onChange={(e) =>
                              setArData((p) => ({
                                ...p,
                                recommendation: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select…</option>
                            <option value="No Change">No Change</option>
                            <option value="Notice of Amendment">
                              Notice of Amendment
                            </option>
                            <option value="Proposal to Cease">
                              Proposal to Cease
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Attachments</Label>
                        <FileDropzone
                          value={arData.attachments}
                          onChange={(files) =>
                            setArData((p) => ({ ...p, attachments: files }))
                          }
                          hint="Drag & drop annual review files here, or click to browse"
                        />
                      </div>

                      {submitMessage && (
                        <Alert variant="destructive">
                          <AlertTitle>Submission error</AlertTitle>
                          <AlertDescription>{submitMessage}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        disabled={submitting || !annualReviewVisibleValid}
                        className="min-w-56"
                      >
                        {submitting ? "Submitting…" : "Submit Annual Review"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* PHASE TRANSFER (placeholder) */}
              {currentView === "phase-transfer" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Phase Transfer</CardTitle>
                    <CardDescription>
                      This section is being prepared.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-muted-foreground">
                    Coming soon.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
