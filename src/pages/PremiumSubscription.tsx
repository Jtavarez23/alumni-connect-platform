// Premium Subscription Management
// Comprehensive subscription plans and billing management
// Part of Sprint 6: Premium Features & Monetization

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, Check, Star, Zap, Users, Calendar, Gift, CreditCard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  is_popular: boolean;
  max_premium_groups?: number;
  max_monthly_events?: number;
}

interface UserSubscription {
  id: string;
  tier_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  tier: SubscriptionTier;
}

export function PremiumSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [showBillingDialog, setShowBillingDialog] = useState(false);

  // Fetch subscription tiers
  const { data: tiersData, isLoading: tiersLoading } = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_subscription_tiers');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's current subscription
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_subscription');
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // Create checkout session mutation
  const createCheckout = useMutation({
    mutationFn: async ({ tierId, billingCycle }: { tierId: string; billingCycle: 'monthly' | 'yearly' }) => {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          tier_id: tierId,
          billing_cycle: billingCycle,
          success_url: `${window.location.origin}/subscription?success=true`,
          cancel_url: `${window.location.origin}/subscription`
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cancel_user_subscription');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will remain active until the end of your current billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const tiers: SubscriptionTier[] = tiersData || [];
  const currentSubscription: UserSubscription | null = userSubscription;

  const handleUpgrade = (tierId: string) => {
    createCheckout.mutate({ tierId, billingCycle });
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes('group')) return <Users className="h-4 w-4" />;
    if (feature.toLowerCase().includes('event')) return <Calendar className="h-4 w-4" />;
    if (feature.toLowerCase().includes('perk')) return <Gift className="h-4 w-4" />;
    if (feature.toLowerCase().includes('support')) return <Settings className="h-4 w-4" />;
    return <Star className="h-4 w-4" />;
  };

  const getTierColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'basic': return 'from-blue-500 to-blue-600';
      case 'premium': return 'from-purple-500 to-purple-600';
      case 'enterprise': return 'from-gold-500 to-yellow-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (tiersLoading || subscriptionLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold">Premium Subscription</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Unlock exclusive features and connect with your alumni network like never before
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={billingCycle === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>Monthly</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative"
            >
              <div className={`absolute inset-0 w-1/2 bg-brand-600 rounded transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-full' : 'translate-x-0'
              }`}></div>
              <span className="relative z-10 text-white">Toggle</span>
            </Button>
            <span className={billingCycle === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}>
              Yearly <Badge variant="secondary" className="ml-1">Save 20%</Badge>
            </span>
          </div>
        </div>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="billing">Billing Management</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            {/* Current Subscription Status */}
            {currentSubscription && (
              <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Check className="h-5 w-5" />
                    Current Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-green-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{currentSubscription.tier.name}</p>
                      <p className="text-sm">
                        ${billingCycle === 'yearly' ? currentSubscription.tier.price_yearly : currentSubscription.tier.price_monthly} 
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </p>
                      <p className="text-xs">
                        Active until {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {currentSubscription.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subscription Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier) => {
                const isCurrentTier = currentSubscription?.tier_id === tier.id;
                const price = billingCycle === 'yearly' ? tier.price_yearly : tier.price_monthly;
                const yearlyPrice = tier.price_yearly;
                const monthlyPrice = tier.price_monthly;
                const savings = billingCycle === 'yearly' ? Math.round(((monthlyPrice * 12) - yearlyPrice) / (monthlyPrice * 12) * 100) : 0;

                return (
                  <Card 
                    key={tier.id} 
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      tier.is_popular ? 'ring-2 ring-brand-500 scale-105' : ''
                    } ${isCurrentTier ? 'bg-gradient-to-b from-green-50 to-green-100 border-green-300' : ''}`}
                  >
                    {tier.is_popular && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-center py-2 text-sm font-semibold">
                        <Star className="h-4 w-4 inline mr-1" />
                        Most Popular
                      </div>
                    )}

                    <CardHeader className={tier.is_popular ? 'pt-12' : ''}>
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getTierColor(tier.name)} flex items-center justify-center mb-4`}>
                        {tier.name.toLowerCase() === 'basic' && <Zap className="h-6 w-6 text-white" />}
                        {tier.name.toLowerCase() === 'premium' && <Crown className="h-6 w-6 text-white" />}
                        {tier.name.toLowerCase() === 'enterprise' && <Star className="h-6 w-6 text-white" />}
                      </div>
                      
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                      <p className="text-muted-foreground text-sm">{tier.description}</p>
                      
                      <div className="py-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">${price}</span>
                          <span className="text-muted-foreground">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                        </div>
                        {billingCycle === 'yearly' && savings > 0 && (
                          <p className="text-green-600 text-sm font-semibold">Save {savings}%</p>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3 mb-6">
                        {tier.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {getFeatureIcon(feature)}
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button 
                        className="w-full" 
                        variant={isCurrentTier ? "outline" : (tier.is_popular ? "default" : "outline")}
                        disabled={isCurrentTier || createCheckout.isPending}
                        onClick={() => !isCurrentTier && handleUpgrade(tier.id)}
                      >
                        {isCurrentTier ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Current Plan
                          </>
                        ) : createCheckout.isPending ? (
                          'Processing...'
                        ) : (
                          `Upgrade to ${tier.name}`
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="max-w-2xl mx-auto">
              {currentSubscription ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Billing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <h3 className="font-semibold">{currentSubscription.tier.name} Plan</h3>
                        <p className="text-sm text-muted-foreground">
                          ${billingCycle === 'yearly' ? currentSubscription.tier.price_yearly : currentSubscription.tier.price_monthly}
                          /{currentSubscription.billing_cycle}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {currentSubscription.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Current Period Start</label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(currentSubscription.current_period_start).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Current Period End</label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {!currentSubscription.cancel_at_period_end && (
                      <div className="pt-4 border-t">
                        <Button 
                          variant="destructive" 
                          onClick={() => setShowBillingDialog(true)}
                          disabled={cancelSubscription.isPending}
                        >
                          {cancelSubscription.isPending ? 'Canceling...' : 'Cancel Subscription'}
                        </Button>
                      </div>
                    )}

                    {currentSubscription.cancel_at_period_end && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Your subscription will be canceled at the end of the current billing period 
                          ({new Date(currentSubscription.current_period_end).toLocaleDateString()}).
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Active Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      You don't have an active subscription. Choose a plan to get started with premium features.
                    </p>
                    <Button onClick={() => document.querySelector('[value="plans"]')?.click()}>
                      View Plans
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Cancel Subscription Dialog */}
        <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to cancel your subscription? You'll continue to have access to premium features 
                until the end of your current billing period.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowBillingDialog(false)}>
                  Keep Subscription
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    cancelSubscription.mutate();
                    setShowBillingDialog(false);
                  }}
                  disabled={cancelSubscription.isPending}
                >
                  {cancelSubscription.isPending ? 'Canceling...' : 'Cancel Subscription'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default PremiumSubscription;