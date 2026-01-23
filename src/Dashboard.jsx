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
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import bccLogo from "@/assets/bcclogo.png";

// ===== Custom Imports =====
import { 
  fetchConsultationsForSchool, 
  asString 
} from "@/services/api";

import { 
  StatsSection, 
  ConsultationItem, 
} from "@/components/DashboardComponents";

import { ConsultationForm } from "@/components/ConsultationForm";
import { AnnualReviewForm } from "@/components/AnnualReviewForm";

// ===== Helpers =====
function startOfDay(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  x.setHours(0, 0, 0, 0);
  return x;
}

function getStats(list) {
  const total = list.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next7 = new Date(+today + 7 * 24 * 60 * 60 * 1000);

  const overdue = list.filter((c) => {
    const due = startOfDay(c.dueDate);
    return due && due < today;
  }).length;

  const dueSoon = list.filter((c) => {
    const due = startOfDay(c.dueDate);
    return due && due >= today && due <= next7;
  }).length;

  return { total, overdue, dueSoon };
}

// ===== Sidebar Component =====
function AppSidebar({ currentView, setCurrentView, canSeePortalViews, onLogout }) {
  const items = [
    { key: "home", label: "home", icon: Home, show: true },
    { key: "consultations", label: "consultations", icon: ClipboardList, show: canSeePortalViews },
    { key: "phase-transfer", label: "phase transfer", icon: RefreshCcw, show: canSeePortalViews },
    { key: "annual-reviews", label: "annual reviews", icon: FileText, show: canSeePortalViews },
  ].filter((x) => x.show);

  return (
    <div className="flex h-full flex-col text-white">
      <div className="px-5 pt-6 pb-4">
        <img src={bccLogo} alt="Birmingham City Council" className="w-full h-[180px] object-contain" />
        <div className="mt-3 text-center text-2xl font-semibold tracking-wide text-white/95">
          SENAR Portal
        </div>
      </div>
      <div className="mt-5 px-3">
        <div className="mb-2 px-2 text-xs font-medium text-white/70">Portal Menu</div>
        <div className="space-y-2">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => {
                setCurrentView(it.key);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cn(
                "glass-btn w-full flex items-center gap-2 px-3 py-2.5 text-left",
                "text-white/90 hover:text-white",
                currentView === it.key && "glass-btn--active",
              )}
            >
              <it.icon className="h-4 w-4 opacity-90" />
              <span className="font-medium capitalize">{it.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-auto p-4">
        {canSeePortalViews && (
          <button
            type="button"
            onClick={onLogout}
            className="glass-btn w-full flex items-center justify-center gap-2 px-3 py-2.5 text-white/95 hover:text-white"
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
  const requestedIdConsult = qs.get("idConsult") || qs.get("consultId") || qs.get("ConsultID") || qs.get("idConsultation");

  // --- State ---
  const [currentView, setCurrentView] = React.useState(tokenMode ? "consultations" : "home");
  const [consultations, setConsultations] = React.useState([]);
  const [selectedConsultationId, setSelectedConsultationId] = React.useState(null);
  
  // Auth State
  const [dfe, setDfe] = React.useState("");
  const [schoolCode, setSchoolCode] = React.useState("");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [portalError, setPortalError] = React.useState("");
  const [logonRequested, setLogonRequested] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [portalSettingName, setPortalSettingName] = React.useState("");

  const canAttemptLogin = dfe.trim().length > 0 && schoolCode.trim().length > 0 && !loggingIn;
  const hasToken = tokenMode;
  const canSeePortalViews = isLoggedIn || hasToken;
  const STORAGE_KEY = "senarPortalLogin";

  // --- Effects ---
  React.useEffect(() => {
    if (hasToken) return;
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.dfe && saved?.schoolCode) {
      setDfe(saved.dfe);
      setSchoolCode(saved.schoolCode);
      setLogonRequested(true);
    }
    setLoading(false);
  }, [hasToken]);

  React.useEffect(() => {
    async function load() {
      // 1. Token Mode
      if (tokenMode) {
        setLoading(true);
        try {
          const data = await fetchConsultationsForSchool("", "", location);
          const req = asString(requestedIdConsult).trim();
          const chosen = req ? data.find((c) => asString(c.idConsult).trim() === req) : data[0];
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

      // 2. Login Mode
      if (!logonRequested) {
        setLoading(false);
        return;
      }

      if (!dfe.trim() || !schoolCode.trim()) {
        setPortalError("Please enter both DfE number and login code.");
        setLoggingIn(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchConsultationsForSchool(dfe.trim(), schoolCode.trim(), location);
        setConsultations(data);
        setPortalSettingName(data?.[0]?.settingName ?? "");
        setIsLoggedIn(true);
        setPortalError("");
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ dfe: dfe.trim(), schoolCode: schoolCode.trim() }));
      } catch (e) {
        setPortalError(e.message);
        setIsLoggedIn(false);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setLoading(false);
        setLoggingIn(false);
      }
    }
    load();
  }, [logonRequested, location, dfe, schoolCode, tokenMode, requestedIdConsult]);

  // --- Handlers ---
  const handlePortalLogin = (e) => {
    e.preventDefault();
    setPortalError("");
    if (!dfe.trim() || !schoolCode.trim()) {
      toast.error("Enter both login fields.");
      return;
    }
    setLoggingIn(true);
    setLogonRequested(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsLoggedIn(false);
    setLogonRequested(false);
    setDfe("");
    setSchoolCode("");
    setSelectedConsultationId(null);
    setPortalSettingName("");
    setCurrentView("home");
    toast.success("Logged out.");
  };

  // --- Derived Data ---
  const selectedConsultation = consultations.find((c) => c.id === selectedConsultationId);

  const standardConsultations = React.useMemo(() => 
    consultations.filter((c) => !c.phaseId || c.phaseId.trim().length === 0), 
  [consultations]);

  const phaseConsultations = React.useMemo(() => 
    consultations.filter((c) => c.phaseId && c.phaseId.trim().length > 0), 
  [consultations]);

  const PHASE_ORDER = ["Reception", "Juniors", "Secondary", "Key Stage 5", "Post-19"];

  const groupedPhases = React.useMemo(() => {
    const groups = {};
    PHASE_ORDER.forEach(p => groups[p] = []);
    phaseConsultations.forEach(c => {
      const p = c.phaseId.trim();
      if (!groups[p]) groups[p] = [];
      groups[p].push(c);
    });
    return groups;
  }, [phaseConsultations]);

  const stdStats = getStats(standardConsultations);
  const phaseStats = getStats(phaseConsultations);
  const todayLabel = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

  const renderSidebar = () => (
    <AppSidebar
      currentView={currentView}
      setCurrentView={(v) => { setCurrentView(v); setSelectedConsultationId(null); }}
      canSeePortalViews={canSeePortalViews}
      onLogout={handleLogout}
    />
  );

  // --- Render ---
  return (
    <div className="min-h-svh bg-linear-to-b from-background to-muted/30">
      <Toaster richColors />

      {/* Desktop Sidebar */}
      {!tokenMode && (
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[320px] lg:flex-col lg:py-6 lg:pl-6">
          <div className="h-full w-full overflow-hidden rounded-[28px] bg-[#8B419E] shadow-2x1 ring-1 ring-white/10">
            {renderSidebar()}
          </div>
        </aside>
      )}

      <div className={cn("lg:pl-[344px]", tokenMode && "lg:pl-0")}>
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto relative flex max-w-6xl items-center gap-3 px-4 py-3">
            {/* Mobile Sidebar */}
            {!tokenMode && (
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-80 bg-transparent">
                    <div className="h-full w-full overflow-hidden rounded-[28px] bg-[#8B419E] shadow-xl ring-1 ring-black/10">
                      {renderSidebar()}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="text-base font-semibold leading-tight">{todayLabel}</div>
            </div>
            {canSeePortalViews && portalSettingName && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 w-[60%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-2xl font-semibold hidden md:block">
                {portalSettingName}
              </div>
            )}
            {canSeePortalViews && !tokenMode && (
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="gap-1"><Calendar className="h-3.5 w-3.5" />{stdStats.total} total</Badge>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <Card>
              <CardHeader><Skeleton className="h-6 w-56" /><Skeleton className="h-4 w-80" /></CardHeader>
              <CardContent className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
            </Card>
          ) : !hasToken && !isLoggedIn ? (
            <Card className="mx-auto max-w-xl">
              <CardHeader>
                <CardTitle>SENAR School Portal Login</CardTitle>
                <CardDescription>Enter your DfE number and login code to view outstanding consultations.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePortalLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label>DfE Number</Label>
                    <Input value={dfe} onChange={(e) => setDfe(e.target.value)} placeholder="e.g. 3301000" inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Login Code</Label>
                    <Input type="password" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} />
                  </div>
                  {portalError && <Alert variant="destructive"><AlertTitle>Login failed</AlertTitle><AlertDescription>{portalError}</AlertDescription></Alert>}
                  <Button type="submit" className="w-full" disabled={!canAttemptLogin}>{loggingIn ? "Logging in…" : "Log in"}</Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              
              {/* === VIEW: HOME === */}
              {currentView === "home" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome to the SENAR Portal</CardTitle>
                    <CardDescription>Review outstanding consultations and submit annual reviews.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <StatsSection title="Consultations" stats={stdStats} />
                    <StatsSection title="Phase Transfer Consultations" stats={phaseStats} />
                  </CardContent>
                </Card>
              )}

              {/* === VIEW: CONSULTATIONS (LIST) === */}
              {currentView === "consultations" && !selectedConsultationId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Outstanding Consultations</CardTitle>
                    <CardDescription>Select a consultation to respond.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {standardConsultations.length === 0 ? (
                      <div className="text-muted-foreground">No outstanding consultations found.</div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {standardConsultations.map((c) => (
                          <ConsultationItem key={c.id} item={c} onClick={() => setSelectedConsultationId(c.id)} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* === VIEW: PHASE TRANSFER (LIST) === */}
              {currentView === "phase-transfer" && !selectedConsultationId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Phase Transfer Consultations</CardTitle>
                    <CardDescription>Review outstanding consultations categorised by phase.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {phaseConsultations.length === 0 ? (
                      <div className="text-muted-foreground">No outstanding phase transfer consultations found.</div>
                    ) : (
                      Object.entries(groupedPhases).map(([phase, items]) => {
                        if (items.length === 0) return null;
                        return (
                          <div key={phase} className="space-y-3">
                            <h3 className="font-semibold text-lg border-b pb-2 text-foreground/80">{phase}</h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {items.map((c) => (
                                <ConsultationItem key={c.id} item={c} onClick={() => setSelectedConsultationId(c.id)} />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              )}

              {/* === SHARED FORM (Consultations & Phase Transfer) === */}
              {(currentView === "consultations" || currentView === "phase-transfer") && selectedConsultationId && (
                <ConsultationForm
                  consultation={selectedConsultation}
                  tokenMode={tokenMode}
                  onBack={() => setSelectedConsultationId(null)}
                  onSuccess={(id) => {
                    setConsultations((prev) => prev.filter((c) => c.id !== id));
                    setSelectedConsultationId(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}

              {/* === VIEW: ANNUAL REVIEWS (FORM) === */}
              {currentView === "annual-reviews" && (
                <AnnualReviewForm
                  onSuccess={() => {
                    setCurrentView("home");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}