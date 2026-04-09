import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store } from "lucide-react";

interface WordDef {
  text: string;
  family: string;
  size: string;
  weight: number;
  opacity: number;
}

const ROW1: WordDef[] = [
  { text: "Spaza Shop",      family: "'Montserrat'",  size: "2.3rem",  weight: 800, opacity: 0.17 },
  { text: "Butchery",        family: "'Sora'",        size: "1.65rem", weight: 600, opacity: 0.13 },
  { text: "Chemist",         family: "'Outfit'",      size: "2rem",    weight: 700, opacity: 0.15 },
  { text: "Carwash",         family: "'Manrope'",     size: "1.5rem",  weight: 500, opacity: 0.11 },
  { text: "Shop",            family: "'Nunito Sans'", size: "2.8rem",  weight: 900, opacity: 0.09 },
  { text: "Delivery",        family: "'Montserrat'",  size: "1.75rem", weight: 700, opacity: 0.13 },
  { text: "Magwinga",        family: "'Outfit'",      size: "2.5rem",  weight: 800, opacity: 0.19 },
  { text: "Cakes",           family: "'Sora'",        size: "1.9rem",  weight: 600, opacity: 0.14 },
  { text: "Market",          family: "'Manrope'",     size: "2.1rem",  weight: 700, opacity: 0.16 },
  { text: "Food",            family: "'Nunito Sans'", size: "3rem",    weight: 900, opacity: 0.09 },
  { text: "Food Stalls",     family: "'Montserrat'",  size: "1.65rem", weight: 600, opacity: 0.13 },
  { text: "Motor Mechanic",  family: "'Outfit'",      size: "1.45rem", weight: 500, opacity: 0.10 },
  { text: "Hair Salon",      family: "'Sora'",        size: "2rem",    weight: 700, opacity: 0.15 },
  { text: "Salon",           family: "'Manrope'",     size: "2.4rem",  weight: 800, opacity: 0.17 },
];

const ROW2: WordDef[] = [
  { text: "Tuckshop",        family: "'Outfit'",      size: "2.2rem",  weight: 700, opacity: 0.15 },
  { text: "Bakery",          family: "'Montserrat'",  size: "2.6rem",  weight: 800, opacity: 0.18 },
  { text: "Stationery",      family: "'Sora'",        size: "1.65rem", weight: 600, opacity: 0.12 },
  { text: "Salon Products",  family: "'Manrope'",     size: "1.5rem",  weight: 500, opacity: 0.10 },
  { text: "Groceries",       family: "'Nunito Sans'", size: "2rem",    weight: 700, opacity: 0.14 },
  { text: "Printing",        family: "'Outfit'",      size: "2.3rem",  weight: 800, opacity: 0.16 },
  { text: "Internet Cafe",   family: "'Montserrat'",  size: "1.55rem", weight: 600, opacity: 0.11 },
  { text: "Hardware",        family: "'Sora'",        size: "2.1rem",  weight: 700, opacity: 0.15 },
  { text: "Clothing",        family: "'Manrope'",     size: "2.5rem",  weight: 800, opacity: 0.18 },
  { text: "Bottle Store",    family: "'Nunito Sans'", size: "1.8rem",  weight: 600, opacity: 0.13 },
  { text: "Flea Market",     family: "'Outfit'",      size: "2rem",    weight: 700, opacity: 0.15 },
  { text: "Salon Barbers",   family: "'Montserrat'",  size: "1.55rem", weight: 600, opacity: 0.11 },
  { text: "Fruit & Veg",     family: "'Sora'",        size: "2.2rem",  weight: 800, opacity: 0.16 },
  { text: "Street Food",     family: "'Manrope'",     size: "1.9rem",  weight: 700, opacity: 0.14 },
  { text: "Fuel Station",    family: "'Nunito Sans'", size: "2.4rem",  weight: 900, opacity: 0.17 },
];

const EDGE_MASK: React.CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
  maskImage:       "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
};

function WordStrip({ words, reverse = false }: { words: WordDef[]; reverse?: boolean }) {
  const doubled = [...words, ...words];
  return (
    <div className="overflow-hidden w-full py-3" style={EDGE_MASK}>
      <div
        className={reverse ? "animate-marquee-reverse" : "animate-marquee"}
        style={{ display: "flex", gap: "3.5rem", width: "max-content", alignItems: "center" }}
      >
        {doubled.map((w, i) => (
          <span
            key={i}
            style={{
              fontFamily: `${w.family}, sans-serif`,
              fontSize: w.size,
              fontWeight: w.weight,
              opacity: w.opacity,
              color: "white",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (login(username, password)) {
      navigate("/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-navy p-4">

      {/* Depth gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(8,12,28,0.6) 0%, transparent 50%, rgba(10,15,30,0.55) 100%)" }}
      />

      {/* Animated word strips — upper and lower thirds */}
      <div
        className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none"
        style={{
          padding: "9% 0",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          maskImage:       "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <WordStrip words={ROW1} />
        <WordStrip words={ROW2} reverse />
      </div>

      {/* Radial spotlight — softens the center behind the card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 72% 58% at 50% 50%, rgba(18,24,44,0.93) 0%, rgba(18,24,44,0.62) 52%, transparent 100%)",
        }}
      />

      {/* Login content */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/40 ring-2 ring-white/10">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-[2rem] font-bold text-navy-foreground tracking-tight leading-none">
            Kasi P.O.S
          </h1>
          <p className="text-navy-foreground/60 mt-2 text-sm font-medium">
            Point of Sale System
          </p>
          <p className="text-navy-foreground/35 mt-1.5 text-[0.68rem] tracking-[0.2em] uppercase font-semibold">
            Built for South African small businesses
          </p>
        </div>

        {/* Login Card — behaviour and fields unchanged */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl p-8 shadow-2xl shadow-black/50 space-y-5 ring-1 ring-white/5"
        >
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Button type="submit" className="w-full h-11 text-base font-semibold">
            Login
          </Button>

        </form>
      </div>
    </div>
  );
}
