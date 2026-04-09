import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscriptionStore } from "@/lib/subscription-store";

export function SubscriptionBanner() {
  const [sub, setSub]   = useState(() => subscriptionStore.get());
  const navigate        = useNavigate();

  // Refresh status whenever the window regains focus (user returns from Paystack)
  useEffect(() => {
    const refresh = () => setSub(subscriptionStore.get());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const status       = sub.subscription_status;
  const daysLeft     = subscriptionStore.getTrialDaysLeft();
  const graceDaysLeft = subscriptionStore.getGraceDaysLeft();

  // Hide banner for healthy states or when trial has plenty of time left
  if (status === "active" || status === "pending") return null;
  if (status === "trial" && daysLeft > 14) return null;

  type Cfg = { bg: string; border: string; text: string; icon: React.ReactNode; message: string; btn: string; btnCls: string };

  let cfg: Cfg;

  if (status === "trial" && daysLeft <= 14) {
    cfg = {
      bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900",
      icon: <Clock className="w-4 h-4 text-amber-600 shrink-0" />,
      message: `Free trial: ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining — subscribe before it expires`,
      btn: "Subscribe Now", btnCls: "bg-amber-600 hover:bg-amber-700 text-white border-0",
    };
  } else if (status === "trial_expired") {
    cfg = {
      bg: "bg-red-50", border: "border-red-200", text: "text-red-900",
      icon: <XCircle className="w-4 h-4 text-red-600 shrink-0" />,
      message: "Your free trial has expired — sales, inventory and airtime are locked.",
      btn: "Subscribe Now", btnCls: "bg-red-600 hover:bg-red-700 text-white border-0",
    };
  } else if (status === "grace_period") {
    cfg = {
      bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900",
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
      message: `Payment failed — ${graceDaysLeft} day${graceDaysLeft !== 1 ? "s" : ""} left before suspension. Please renew your subscription.`,
      btn: "Renew Now", btnCls: "bg-amber-600 hover:bg-amber-700 text-white border-0",
    };
  } else {
    cfg = {
      bg: "bg-red-50", border: "border-red-200", text: "text-red-900",
      icon: <XCircle className="w-4 h-4 text-red-600 shrink-0" />,
      message: "Subscription suspended — sales, inventory and airtime are locked.",
      btn: "Renew Now", btnCls: "bg-red-600 hover:bg-red-700 text-white border-0",
    };
  }

  return (
    <div className={`${cfg.bg} ${cfg.border} border-b px-4 py-2 flex items-center justify-between gap-4 shrink-0`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${cfg.text}`}>
        {cfg.icon}
        <span>{cfg.message}</span>
      </div>
      <Button
        size="sm"
        className={`shrink-0 h-7 text-xs px-3 ${cfg.btnCls}`}
        onClick={() => navigate("/subscription")}
      >
        {cfg.btn}
      </Button>
    </div>
  );
}
