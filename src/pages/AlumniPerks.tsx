// Alumni Perks Page
// Browse and redeem exclusive alumni benefits and discounts
// Part of Sprint 6: Premium Features & Monetization

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Gift, ExternalLink, Clock, Users, Tag, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

interface AlumniPerk {
  id: string;
  title: string;
  description: string;
  perk_type: 'discount' | 'free_service' | 'exclusive_access' | 'bonus';
  value_type: 'percentage' | 'fixed_amount' | 'description_only';
  discount_value?: number;
  currency: string;
  redemption_code?: string;
  redemption_url?: string;
  terms_conditions?: string;
  valid_until?: string;
  usage_limit?: number;
  usage_count: number;
  is_featured: boolean;
  already_redeemed: boolean;
  business: {
    name: string;
    logo_url?: string;
    category: string;
  };
}

export function AlumniPerks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  // Fetch alumni perks
  const { data: perksData, isLoading } = useQuery({
    queryKey: ['alumni-perks', { featured: showFeaturedOnly }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_available_alumni_perks', {
        p_limit: 50,
        p_offset: 0,
        p_featured_only: showFeaturedOnly
      });

      if (error) throw error;
      return data?.[0] || { perks: [], total_count: 0, has_more: false };
    },
  });

  // Redeem perk mutation
  const redeemPerk = useMutation({
    mutationFn: async (perkId: string) => {
      const { data, error } = await supabase.rpc('redeem_alumni_perk', {
        p_perk_id: perkId,
        p_redemption_method: 'website'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, perkId) => {
      toast({
        title: "Perk Redeemed Successfully!",
        description: `You've redeemed: ${data.title}`,
        duration: 5000,
      });
      
      // Refresh perks data
      queryClient.invalidateQueries({ queryKey: ['alumni-perks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const perks: AlumniPerk[] = perksData?.perks || [];
  const filteredPerks = perks.filter(perk => 
    perk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    perk.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    perk.business.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPerkValueDisplay = (perk: AlumniPerk) => {
    if (perk.value_type === 'percentage' && perk.discount_value) {
      return `${perk.discount_value}% OFF`;
    } else if (perk.value_type === 'fixed_amount' && perk.discount_value) {
      return `$${perk.discount_value} OFF`;
    }
    return 'SPECIAL OFFER';
  };

  const getPerkTypeColor = (type: string) => {
    switch (type) {
      case 'discount': return 'bg-blue-100 text-blue-800';
      case 'free_service': return 'bg-green-100 text-green-800';
      case 'exclusive_access': return 'bg-purple-100 text-purple-800';
      case 'bonus': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRedeemPerk = (perk: AlumniPerk) => {
    if (perk.already_redeemed) {
      toast({
        title: "Already Redeemed",
        description: "You have already redeemed this perk.",
        variant: "destructive",
      });
      return;
    }

    if (perk.redemption_url) {
      // Open redemption URL
      window.open(perk.redemption_url, '_blank');
    }
    
    // Record the redemption
    redeemPerk.mutate(perk.id);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-300 rounded w-full"></div>
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="h-8 w-8 text-brand-600" />
            <h1 className="text-3xl font-bold">Alumni Perks</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Exclusive discounts and benefits from alumni-owned businesses and partners
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search perks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFeaturedOnly ? "default" : "outline"}
              onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              className="flex items-center gap-2"
            >
              <Star className="h-4 w-4" />
              Featured Only
            </Button>
          </div>
        </div>

        {/* Perks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPerks.map((perk) => (
            <Card key={perk.id} className="hover:shadow-lg transition-shadow relative overflow-hidden">
              {perk.is_featured && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-800 px-2 py-1 text-xs font-semibold">
                  <Star className="h-3 w-3 inline mr-1" />
                  FEATURED
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{perk.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span>{perk.business.name}</span>
                      <Badge variant="outline" className={getPerkTypeColor(perk.perk_type)}>
                        {perk.perk_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-brand-600">
                      {getPerkValueDisplay(perk)}
                    </div>
                  </div>
                  {perk.business.logo_url && (
                    <img
                      src={perk.business.logo_url}
                      alt={perk.business.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{perk.description}</p>

                {/* Usage Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {perk.usage_limit && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{perk.usage_count}/{perk.usage_limit} used</span>
                    </div>
                  )}
                  {perk.valid_until && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Until {new Date(perk.valid_until).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Redemption Code */}
                {perk.redemption_code && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Promo Code</div>
                    <div className="font-mono text-sm font-semibold">{perk.redemption_code}</div>
                  </div>
                )}

                {/* Terms */}
                {perk.terms_conditions && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Terms & Conditions
                    </summary>
                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                      {perk.terms_conditions}
                    </div>
                  </details>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => handleRedeemPerk(perk)}
                  disabled={perk.already_redeemed || redeemPerk.isPending}
                  className={`w-full ${perk.already_redeemed ? 'bg-green-600' : ''}`}
                  variant={perk.already_redeemed ? "default" : "default"}
                >
                  {perk.already_redeemed ? (
                    <>✓ Redeemed</>
                  ) : redeemPerk.isPending ? (
                    'Redeeming...'
                  ) : (
                    <>
                      Redeem Now
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPerks.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No perks found</h3>
            <p className="text-muted-foreground">
              {searchQuery || showFeaturedOnly 
                ? 'Try adjusting your search or filters'
                : 'Check back later for new alumni perks and benefits'
              }
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AlumniPerks;