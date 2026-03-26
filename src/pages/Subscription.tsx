import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, CheckCircle, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import { store } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Subscription() {
  const trialDaysLeft = store.getTrialDaysLeft();
  const subscribed = store.isSubscribed();
  const expired = trialDaysLeft <= 0 && !subscribed;
  const [showUpgrade, setShowUpgrade] = useState(false);

  const trialPercent = Math.max(0, ((90 - trialDaysLeft) / 90) * 100);

  const handleActivate = () => {
    store.setSubscribed(true);
    toast.success("Subscription activated! Full access restored.");
    setShowUpgrade(false);
    // Force re-render
    window.location.reload();
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Subscription</h1>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${expired ? 'from-destructive to-destructive/60' : subscribed ? 'from-accent to-accent/60' : 'from-primary via-secondary to-accent'}`} />
        <CardContent className="p-6 space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              subscribed ? 'bg-accent/20' : expired ? 'bg-destructive/20' : 'bg-secondary/20'
            }`}>
              {subscribed ? <ShieldCheck className="w-6 h-6 text-accent" /> :
               expired ? <AlertTriangle className="w-6 h-6 text-destructive" /> :
               <Clock className="w-6 h-6 text-secondary" />}
            </div>
            <div>
              <p className="text-lg font-bold">
                {subscribed ? 'Pro Subscriber' : expired ? 'Trial Expired' : 'Free Trial Active'}
              </p>
              <p className="text-sm text-muted-foreground">
                {subscribed ? 'Full access — thank you!' :
                 expired ? 'Upgrade to continue using Kasi P.O.S' :
                 `${trialDaysLeft} days remaining`}
              </p>
            </div>
          </div>

          {/* Progress bar (trial only) */}
          {!subscribed && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Trial usage</span>
                <span>{90 - trialDaysLeft} / 90 days</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${expired ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${trialPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Features list */}
          <div className="space-y-3">
            <p className="text-sm font-medium">What's included:</p>
            {[
              "Unlimited sales & transactions",
              "Full inventory management",
              "Multi-user support (Admin + Cashiers)",
              "Daily sales reports",
              "Barcode scanning",
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {/* After trial limits */}
          {expired && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">Trial limitations active:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Maximum 5 sales per day</li>
                <li>Cannot add new products</li>
                <li>Cannot add new users</li>
              </ul>
            </div>
          )}

          {/* Price card */}
          {!subscribed && (
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                R55<span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {expired ? 'Subscribe to unlock full access' : 'After your free trial ends'}
              </p>
            </div>
          )}

          {/* CTA */}
          {!subscribed && (
            <Button className="w-full h-12" variant={expired ? "destructive" : "default"} onClick={() => setShowUpgrade(true)}>
              <CreditCard className="w-4 h-4 mr-2" />
              {expired ? 'Subscribe Now — R55/month' : 'Upgrade Now'}
            </Button>
          )}

          {subscribed && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-accent">✅ Active subscription — R55/month</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Choose Payment Method
            </DialogTitle>
            <DialogDescription>
              Subscribe to Kasi P.O.S Pro for R55/month. Select your preferred payment gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full h-14 justify-between text-left"
              onClick={() => window.open('https://www.payfast.co.za', '_blank')}
            >
              <div>
                <p className="font-semibold">PayFast</p>
                <p className="text-xs text-muted-foreground">Cards, EFT, SnapScan, Mobicred</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 justify-between text-left"
              onClick={() => window.open('https://www.yoco.com', '_blank')}
            >
              <div>
                <p className="font-semibold">Yoco</p>
                <p className="text-xs text-muted-foreground">Cards, QR code payments</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or simulate for testing</span></div>
            </div>

            <Button className="w-full h-12" onClick={handleActivate}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Activate Subscription (Demo)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
