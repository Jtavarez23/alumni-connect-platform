import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, CreditCard, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStripe } from "@/hooks/useStripe";

export default function SubscriptionSettings() {
  const { profile } = useAuth();
  const { createCheckoutSession, checkSubscription, openCustomerPortal, loading } = useStripe();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      loadSubscriptionData();
    }
  }, [profile]);

  const loadSubscriptionData = async () => {
    const data = await checkSubscription();
    setSubscriptionData(data);
  };

  const isPremium = profile?.subscription_status === "premium";

  const features = [
    "Unlimited schools",
    "Advanced search & filters",
    "Cross-year networking", 
    "Profile analytics",
    "Priority verification",
    "Unlimited messaging",
    "Group chat creation",
    "Export contact lists"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Badge variant={isPremium ? "default" : "secondary"} className="text-sm">
              {isPremium ? "Premium" : "Free"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPremium ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Premium Subscription Active</h3>
                <p className="text-sm text-muted-foreground">
                  You have access to all premium features including unlimited schools and advanced networking.
                </p>
                {subscriptionData?.is_manual_grant && (
                  <Badge variant="outline" className="mt-2">
                    Admin Grant
                  </Badge>
                )}
              </div>
              
              {!subscriptionData?.is_manual_grant && (
                <Button 
                  onClick={openCustomerPortal} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {loading ? "Loading..." : "Manage Billing"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Free Plan</h3>
                <p className="text-sm text-muted-foreground">
                  You're currently on the free plan with limited features.
                </p>
              </div>
              
              <Button 
                onClick={createCheckoutSession} 
                disabled={loading}
                className="w-full"
              >
                <Crown className="h-4 w-4 mr-2" />
                {loading ? "Processing..." : "Upgrade to Premium - $5/month"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Premium Features</CardTitle>
          <CardDescription>
            What you get with a premium subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}