import { useRef, useState } from "react";
import { store, hashPassword } from "@/lib/store";
import { companyStore } from "@/lib/company-store";
import { storeCode, StoreExport } from "@/lib/store-code";
import { deviceStore } from "@/lib/device-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Store, Eye, EyeOff, Plus, LogIn,
  ArrowLeft, Monitor, CheckCircle2, Sparkles,
  Zap, ShieldCheck, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { emailService } from "@/lib/email-service";

// ─── Keyframe animations (injected once) ─────────────────────────────────────
const STYLES = `
@keyframes ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pulse-ring {
  0%,100% { box-shadow: 0 0 0 0 rgba(222,97,44,0.4); }
  50%     { box-shadow: 0 0 0 12px rgba(222,97,44,0); }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.ticker-track { animation: ticker 28s linear infinite; }
.ticker-track:hover { animation-play-state: paused; }
.fade-up  { animation: fadeUp 0.6s ease both; }
.fade-in  { animation: fadeIn 0.4s ease both; }
.btn-glow:hover { animation: pulse-ring 1.4s ease infinite; }
`;

const BUSINESSES = [
  "Spaza Shop","Butchery","Car Wash","Salon","Chemist","Bakery",
  "Kota Stand","Fast Food","Township Market","Hardware Store",
  "Delivery Service","Auto Mechanic","Internet Café","Laundry",
  "Barber Shop","Tuck Shop","Bottle Store","Clothing Boutique",
  "Phone Repair","Catering",
];

// ─── Module-level helpers & layout components ───────────────────────────────
const inputStyle = "h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50";
const labelStyle = "block text-sm font-medium text-white/70 mb-1.5";

function LeftPanel() {
  const doubled = [...BUSINESSES, ...BUSINESSES];
  return (
    <div
      className="hidden lg:flex flex-col justify-between relative overflow-hidden"
      style={{
        background: "linear-gradient(150deg, #0f1523 0%, #1a1f35 40%, #1C2237 70%, #0d1019 100%)",
        width: "45%",
        minHeight: "100vh",
        flexShrink: 0,
      }}
    >
      <div style={{ position:"absolute",top:"-80px",left:"-80px",width:"320px",height:"320px",borderRadius:"50%",background:"radial-gradient(circle, rgba(222,97,44,0.18) 0%, transparent 70%)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:"-60px",right:"-60px",width:"260px",height:"260px",borderRadius:"50%",background:"radial-gradient(circle, rgba(255,200,55,0.10) 0%, transparent 70%)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none" }} />

      <div className="relative z-10 p-10">
        <div className="flex items-center gap-3 fade-up" style={{ animationDelay:"0.1s" }}>
          <div style={{ width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#DE612C,#c44f1a)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(222,97,44,0.5)" }}>
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg tracking-tight leading-none">Kasi P.O.S</p>
            <p style={{ color:"rgba(255,255,255,0.45)",fontSize:11 }}>Point of Sale System</p>
          </div>
        </div>

        <div className="mt-12 fade-up" style={{ animationDelay:"0.25s" }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(222,97,44,0.15)",border:"1px solid rgba(222,97,44,0.3)",borderRadius:999,padding:"4px 12px",marginBottom:16 }}>
            <Zap className="w-3 h-3" style={{ color:"#FFC837" }} />
            <span style={{ color:"#FFC837",fontSize:11,fontWeight:600 }}>Built for South Africa</span>
          </div>
          <h2 className="text-white font-bold leading-tight" style={{ fontSize:"clamp(1.6rem,3vw,2.4rem)" }}>
            Powering<br />
            <span style={{ background:"linear-gradient(90deg,#DE612C,#FFC837)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
              local businesses
            </span><br />
            across Mzansi
          </h2>
          <p className="mt-3" style={{ color:"rgba(255,255,255,0.45)",fontSize:13,lineHeight:1.6,maxWidth:280 }}>
            From spaza shops to salons — manage your sales, stock, and staff from one simple app.
          </p>
        </div>

        <div className="flex gap-5 mt-8 fade-up" style={{ animationDelay:"0.4s" }}>
          {([["90","day free trial"],["R55","per month"],["∞","devices"]] as const).map(([val,label]) => (
            <div key={val}>
              <p className="text-white font-bold text-xl">{val}</p>
              <p style={{ color:"rgba(255,255,255,0.4)",fontSize:11 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 py-6 fade-in" style={{ animationDelay:"0.5s" }}>
        <p style={{ color:"rgba(255,255,255,0.3)",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:"uppercase",paddingLeft:40,marginBottom:12 }}>Perfect for</p>
        <div style={{ overflow:"hidden",maskImage:"linear-gradient(90deg,transparent 0%,black 8%,black 92%,transparent 100%)" }}>
          <div className="ticker-track flex gap-0 whitespace-nowrap">
            {doubled.map((b, i) => (
              <span key={i} style={{
                display:"inline-flex",alignItems:"center",padding:"6px 14px",margin:"0 4px",
                background: i%5===0 ? "rgba(222,97,44,0.2)" : i%5===2 ? "rgba(255,200,55,0.1)" : "rgba(255,255,255,0.06)",
                border: i%5===0 ? "1px solid rgba(222,97,44,0.35)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius:999,
                color: i%5===0 ? "#DE612C" : i%5===2 ? "#FFC837" : "rgba(255,255,255,0.55)",
                fontSize:12,fontWeight: i%3===0 ? 600 : 400,
              }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 p-10 fade-up" style={{ animationDelay:"0.6s" }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4" style={{ color:"#4CAF50" }} />
          <span style={{ color:"rgba(255,255,255,0.5)",fontSize:12 }}>Your data stays private — stored locally on your device</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color:"#FFC837" }} />
          <span style={{ color:"rgba(255,255,255,0.5)",fontSize:12 }}>No internet required to run your POS</span>
        </div>
      </div>
    </div>
  );
}

function RightPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-screen overflow-y-auto" style={{ background:"#0f1523" }}>
      <div className="w-full max-w-md">
        <div className="flex lg:hidden items-center gap-3 mb-8 fade-up">
          <div style={{ width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#DE612C,#c44f1a)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold">Kasi P.O.S</p>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:11 }}>Point of Sale System</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <LeftPanel />
      <RightPanel>{children}</RightPanel>
    </div>
  );
}

type View = 'choose' | 'create' | 'join-code' | 'join-device';

export default function Setup() {
  const [view, setView] = useState<View>('choose');

  // ── Create-new state ──────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({
    businessName: "", username: "", email: "", password: "", confirm: "",
  });
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [createError,    setCreateError]    = useState("");
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // ── Join-existing state ───────────────────────────────────────────────────
  const [rawCode,       setRawCode]       = useState("");
  const [adminPass,     setAdminPass]     = useState("");
  const [showJoinPass,  setShowJoinPass]  = useState(false);
  const [joinError,     setJoinError]     = useState("");
  const [parsedExport,  setParsedExport]  = useState<StoreExport | null>(null);
  const [deviceName,    setDeviceName]    = useState("");
  const [deviceLoc,     setDeviceLoc]     = useState("");

  // ── Handlers: Create ──────────────────────────────────────────────────────
  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    const uname = createForm.username.trim().toLowerCase();
    if (uname.length < 3)                             { setCreateError("Username must be at least 3 characters."); return; }
    if (createForm.password.length < 6)               { setCreateError("Password must be at least 6 characters."); return; }
    if (createForm.password !== createForm.confirm)   { setCreateError("Passwords do not match."); return; }

    if (submitBtnRef.current) submitBtnRef.current.disabled = true;

    const bname = createForm.businessName.trim();
    if (bname) {
      const p = companyStore.get();
      companyStore.set({ ...p, businessName: bname, tradingName: p.tradingName || bname });
    }

    const existing = store.getUsers();
    const id = existing.length > 0 ? Math.max(...existing.map(u => u.id)) + 1 : 1;
    store.setUsers([...existing, {
      id, username: uname, role: "admin" as const,
      created_at: new Date().toISOString(),
      password_hash: hashPassword(createForm.password),
    }]);

    deviceStore.registerPrimary(bname || "Primary Till");

    // Send welcome email (non-blocking)
    const email = createForm.email.trim();
    if (email) {
      const p = companyStore.get();
      companyStore.set({ ...p, email });
      const trialEnd = new Date(Date.now() + 90 * 86400000);
      emailService.sendWelcome({
        to: email,
        businessName: bname || 'My Store',
        adminUsername: uname,
        storeCode: storeCode.generate(uname),
        trialEndDate: trialEnd.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }),
      });
    }

    window.location.replace("/login");
  }

  // ── Handlers: Join — verify code ─────────────────────────────────────────
  function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");

    const result = storeCode.parse(rawCode);
    if (!result.ok) { setJoinError((result as { ok: false; error: string }).error); return; }

    if (!storeCode.verifyAdmin(result.data, adminPass)) {
      setJoinError("Incorrect admin password. Try again.");
      return;
    }

    setParsedExport(result.data);
    setView('join-device');
  }

  // ── Handlers: Join — activate device ─────────────────────────────────────
  function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!parsedExport) return;
    const name = deviceName.trim() || "Secondary Till";
    storeCode.apply(parsedExport, name, deviceLoc.trim());
    toast.success(`${name} activated — redirecting to login…`);
    window.location.replace("/login");
  }

  // ── VIEW: choose ──────────────────────────────────────────────────────────
  if (view === 'choose') {
    return (
      <Shell>
        <div className="fade-up">
          <p className="text-white font-bold text-2xl mb-1">Welcome back</p>
          <p style={{ color:"rgba(255,255,255,0.45)",fontSize:14,marginBottom:28 }}>
            How would you like to set up this device?
          </p>

          <div className="space-y-3">
            {/* Create card */}
            <button
              onClick={() => setView('create')}
              className="btn-glow group w-full text-left rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{ background:"rgba(222,97,44,0.12)",border:"1px solid rgba(222,97,44,0.25)",backdropFilter:"blur(8px)" }}
            >
              <div className="flex items-start gap-4">
                <div style={{ width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#DE612C,#c44f1a)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(222,97,44,0.4)" }}>
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-base mb-0.5">Create New Store</p>
                  <p style={{ color:"rgba(255,255,255,0.5)",fontSize:12,lineHeight:1.5 }}>
                    First time setting up this business. Generates a brand-new company account.
                  </p>
                  <p style={{ color:"#DE612C",fontSize:11,fontWeight:600,marginTop:6 }}>Use this for your first machine →</p>
                </div>
              </div>
            </button>

            {/* Join card */}
            <button
              onClick={() => setView('join-code')}
              className="group w-full text-left rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{ background:"rgba(99,179,237,0.08)",border:"1px solid rgba(99,179,237,0.2)",backdropFilter:"blur(8px)" }}
            >
              <div className="flex items-start gap-4">
                <div style={{ width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(59,130,246,0.35)" }}>
                  <LogIn className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-base mb-0.5">Join Existing Store</p>
                  <p style={{ color:"rgba(255,255,255,0.5)",fontSize:12,lineHeight:1.5 }}>
                    Adding another till or cashier machine to an already configured store.
                  </p>
                  <p style={{ color:"#60a5fa",fontSize:11,fontWeight:600,marginTop:6 }}>Use this for additional tills →</p>
                </div>
              </div>
            </button>
          </div>

          <p style={{ color:"rgba(255,255,255,0.2)",fontSize:11,textAlign:"center",marginTop:24 }}>
            Kasi P.O.S · Free 90-day trial · No credit card required
          </p>
        </div>
      </Shell>
    );
  }

  // ── VIEW: create ──────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <Shell>
        <div className="fade-up">
          <button onClick={() => setView('choose')} className="flex items-center gap-1.5 mb-6 transition-opacity hover:opacity-70" style={{ color:"rgba(255,255,255,0.4)",fontSize:13 }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="mb-6">
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(222,97,44,0.15)",border:"1px solid rgba(222,97,44,0.3)",borderRadius:999,padding:"4px 12px",marginBottom:12 }}>
              <ShieldCheck className="w-3 h-3" style={{ color:"#DE612C" }} />
              <span style={{ color:"#DE612C",fontSize:11,fontWeight:600 }}>First-Time Setup</span>
            </div>
            <p className="text-white font-bold text-2xl mb-1">Create your store</p>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:13 }}>Set up your owner account to get started</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className={labelStyle}>Business Name <span style={{ color:"rgba(255,255,255,0.3)",fontSize:11 }}>(optional)</span></label>
              <Input value={createForm.businessName} onChange={e => setCreateForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="e.g. Mama Thandi's Spaza" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Username</label>
              <Input value={createForm.username} onChange={e => { setCreateForm(f => ({ ...f, username: e.target.value })); setCreateError(""); }}
                placeholder="Choose a username (min 3 chars)" required autoComplete="username" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Email <span style={{ color:"rgba(255,255,255,0.3)",fontSize:11 }}>(for receipts & notifications)</span></label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="e.g. you@gmail.com" autoComplete="email" className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Password</label>
              <div className="relative">
                <Input type={showCreatePass ? "text" : "password"} value={createForm.password}
                  onChange={e => { setCreateForm(f => ({ ...f, password: e.target.value })); setCreateError(""); }}
                  placeholder="At least 6 characters" required autoComplete="new-password" className={cn(inputStyle, "pr-10")} />
                <button type="button" tabIndex={-1} onClick={() => setShowCreatePass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.3)" }}>
                  {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelStyle}>Confirm Password</label>
              <Input type="password" value={createForm.confirm}
                onChange={e => { setCreateForm(f => ({ ...f, confirm: e.target.value })); setCreateError(""); }}
                placeholder="Repeat your password" required autoComplete="new-password" className={inputStyle} />
            </div>

            {createError && (
              <div style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"8px 12px" }}>
                <p style={{ color:"#f87171",fontSize:13,fontWeight:500 }}>{createError}</p>
              </div>
            )}

            <Button ref={submitBtnRef} type="submit"
              className="w-full h-12 text-base font-semibold btn-glow"
              style={{ background:"linear-gradient(135deg,#DE612C,#c44f1a)",border:"none",boxShadow:"0 4px 20px rgba(222,97,44,0.4)" }}>
              Create Owner Account
            </Button>
            <p style={{ color:"rgba(255,255,255,0.25)",fontSize:11,textAlign:"center" }}>
              Add cashier accounts after logging in under <strong style={{ color:"rgba(255,255,255,0.4)" }}>Users</strong>.
            </p>
          </form>
        </div>
      </Shell>
    );
  }

  // ── VIEW: join-code ───────────────────────────────────────────────────────
  if (view === 'join-code') {
    return (
      <Shell>
        <div className="fade-up">
          <button onClick={() => { setView('choose'); setJoinError(""); }} className="flex items-center gap-1.5 mb-6 transition-opacity hover:opacity-70" style={{ color:"rgba(255,255,255,0.4)",fontSize:13 }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="mb-6">
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(59,130,246,0.12)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:999,padding:"4px 12px",marginBottom:12 }}>
              <LogIn className="w-3 h-3" style={{ color:"#60a5fa" }} />
              <span style={{ color:"#60a5fa",fontSize:11,fontWeight:600 }}>Join Existing Store</span>
            </div>
            <p className="text-white font-bold text-2xl mb-1">Connect this till</p>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:13 }}>Paste the Store Code from your primary machine</p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className={labelStyle}>
                Store Code
                <span style={{ color:"rgba(255,255,255,0.25)",fontSize:11,marginLeft:6 }}>(from Branding Settings)</span>
              </label>
              <Textarea value={rawCode} onChange={e => { setRawCode(e.target.value); setJoinError(""); }}
                placeholder="Paste your store code here…" required
                className={cn(inputStyle, "font-mono text-xs min-h-[90px] resize-none")} />
            </div>
            <div>
              <label className={labelStyle}>Admin Password</label>
              <p style={{ color:"rgba(255,255,255,0.3)",fontSize:12,marginBottom:8 }}>
                Verify your identity as the store owner.
              </p>
              <div className="relative">
                <Input type={showJoinPass ? "text" : "password"} value={adminPass}
                  onChange={e => { setAdminPass(e.target.value); setJoinError(""); }}
                  placeholder="Store admin password" required autoComplete="current-password"
                  className={cn(inputStyle, "pr-10")} />
                <button type="button" tabIndex={-1} onClick={() => setShowJoinPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.3)" }}>
                  {showJoinPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {joinError && (
              <div style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"8px 12px" }}>
                <p style={{ color:"#f87171",fontSize:13,fontWeight:500 }}>{joinError}</p>
              </div>
            )}

            <Button type="submit"
              className="w-full h-12 text-base font-semibold"
              style={{ background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",border:"none",boxShadow:"0 4px 20px rgba(59,130,246,0.35)" }}>
              Verify &amp; Continue
            </Button>
          </form>
        </div>
      </Shell>
    );
  }

  // ── VIEW: join-device ─────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)" }}>
          <div style={{ width:40,height:40,borderRadius:10,background:"rgba(34,197,94,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <CheckCircle2 className="w-5 h-5" style={{ color:"#22c55e" }} />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{parsedExport?.company.businessName || "Store"} verified</p>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:12 }}>
              {parsedExport?.users.length ?? 0} user{(parsedExport?.users.length ?? 0) !== 1 ? "s" : ""} ready to import
            </p>
          </div>
        </div>

        <p className="text-white font-bold text-2xl mb-1">Name this device</p>
        <p style={{ color:"rgba(255,255,255,0.4)",fontSize:13,marginBottom:24 }}>Give this till a name so you can identify it later</p>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className={labelStyle}>Device / Till Name</label>
            <div className="relative">
              <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"rgba(255,255,255,0.3)" }} />
              <Input value={deviceName} onChange={e => setDeviceName(e.target.value)}
                placeholder="e.g. Till 2, Front Counter, Laptop 1"
                className={cn(inputStyle, "pl-9")} autoFocus />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Location <span style={{ color:"rgba(255,255,255,0.25)",fontSize:11 }}>(optional)</span></label>
            <Input value={deviceLoc} onChange={e => setDeviceLoc(e.target.value)}
              placeholder="e.g. Front, Back Office, Storeroom"
              className={inputStyle} />
          </div>

          <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px 14px" }} className="space-y-1.5 text-xs">
            <p style={{ color:"rgba(255,255,255,0.6)",fontWeight:600,marginBottom:6 }}>What gets loaded on this device:</p>
            {["Business branding & logo","All staff accounts & passwords","Subscription status"].map(t => (
              <p key={t} style={{ color:"rgba(255,255,255,0.4)" }}>✓ {t}</p>
            ))}
            <p style={{ color:"#fbbf24",fontWeight:500,paddingTop:4 }}>⚠ Sales & inventory data is per-device — run on primary machine first.</p>
          </div>

          <Button type="submit"
            className="w-full h-12 text-base font-semibold btn-glow"
            style={{ background:"linear-gradient(135deg,#DE612C,#c44f1a)",border:"none",boxShadow:"0 4px 20px rgba(222,97,44,0.4)" }}>
            <Copy className="w-4 h-4 mr-2" /> Activate This Device
          </Button>
        </form>
      </div>
    </Shell>
  );
}
