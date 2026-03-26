import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, CheckCircle } from "lucide-react";

export default function Subscription() {
  const trialDaysLeft = 90;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Subscription</h1>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-lg font-bold">Free Trial Active</p>
              <p className="text-sm text-muted-foreground">{trialDaysLeft} days remaining</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">What's included:</p>
            {["Unlimited sales & transactions", "Full inventory management", "Multi-user support (Admin + Cashiers)", "Daily sales reports", "Barcode scanning"].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">R55<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            <p className="text-xs text-muted-foreground mt-1">After your free trial ends</p>
          </div>

          <Button
            className="w-full h-12"
            onClick={() => window.open('https://www.payfast.co.za', '_blank')}
          >
            <CreditCard className="w-4 h-4 mr-2" /> Upgrade Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
