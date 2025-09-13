// Business Card Component
// Displays business information in card format using BaseCard

import React, { useMemo, useCallback } from 'react';
import {
  MapPin,
  ExternalLink,
  Gift,
  Star,
  Award,
  Phone,
  Mail,
  Globe,
  Clock,
  User
} from 'lucide-react';
import { BaseCard } from '@/components/common/BaseCard';
import type { BaseCardAction, BaseCardBadge, BaseCardInfo } from '@/components/common/BaseCard';
import { useClaimBusiness } from '@/hooks/useBusiness';
import type { Business } from '@/types/business';

interface BusinessCardProps {
  business: Business;
  variant?: 'card' | 'list' | 'compact';
  className?: string;
}

export const BusinessCard = React.memo<BusinessCardProps>(({ business, variant = 'card', className = '' }) => {
  const claimMutation = useClaimBusiness();

  const handleClaim = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // This would open a claim dialog - for now just show a simple claim
    try {
      await claimMutation.mutateAsync({
        business_id: business.id,
        evidence_type: 'email',
        evidence_data: { note: 'Claiming ownership of this business' }
      });
    } catch (error) {
      console.error('Claim failed:', error);
    }
  }, [claimMutation, business.id]);

  const handleVisitWebsite = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (business.website) {
      const url = business.website.startsWith('http') ? business.website : `https://${business.website}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [business.website]);

  const handleRedeemPerk = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (business.perk_url) {
      const url = business.perk_url.startsWith('http') ? business.perk_url : `https://${business.perk_url}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [business.perk_url]);

  const badges: BaseCardBadge[] = useMemo(() => {
    const result: BaseCardBadge[] = [];

    if (business.is_premium) {
      result.push({
        label: 'Premium',
        variant: 'default',
        icon: <Star className="w-3 h-3" />
      });
    }

    if (business.verified) {
      result.push({
        label: 'Verified',
        variant: 'secondary',
        icon: <Award className="w-3 h-3" />
      });
    }

    return result;
  }, [business.is_premium, business.verified]);

  const infoItems: BaseCardInfo[] = useMemo(() => {
    const items: BaseCardInfo[] = [];

    if (business.location) {
      items.push({
        icon: <MapPin className="w-4 h-4" />,
        label: 'Location',
        value: business.location
      });
    }

    if (business.phone) {
      items.push({
        icon: <Phone className="w-4 h-4" />,
        label: 'Phone',
        value: business.phone
      });
    }

    if (business.email) {
      items.push({
        icon: <Mail className="w-4 h-4" />,
        label: 'Email',
        value: business.email
      });
    }

    if (business.owner_name) {
      items.push({
        icon: <User className="w-4 h-4" />,
        label: 'Owner',
        value: business.owner_name
      });
    }

    if (business.hours) {
      items.push({
        icon: <Clock className="w-4 h-4" />,
        label: 'Hours',
        value: 'Business hours available'
      });
    }

    return items;
  }, [business.location, business.phone, business.email, business.owner_name, business.hours]);

  const actions: BaseCardAction[] = useMemo(() => {
    const result: BaseCardAction[] = [];

    if (business.website) {
      result.push({
        label: variant === 'list' ? 'Visit Website' : 'Website',
        onClick: handleVisitWebsite,
        variant: 'outline',
        icon: variant === 'list' ? <Globe className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />
      });
    }

    if (business.perk) {
      result.push({
        label: variant === 'list' ? 'Get Perk' : 'Get Perk',
        onClick: handleRedeemPerk,
        variant: 'default',
        icon: <Gift className="w-4 h-4" />
      });
    } else if (!business.is_owner && !business.has_claimed) {
      result.push({
        label: 'Claim Business',
        onClick: handleClaim,
        variant: 'outline',
        disabled: claimMutation.isPending,
        loading: claimMutation.isPending
      });
    }

    return result;
  }, [
    business.website,
    business.perk,
    business.is_owner,
    business.has_claimed,
    variant,
    handleVisitWebsite,
    handleRedeemPerk,
    handleClaim,
    claimMutation.isPending
  ]);

  const highlight = useMemo(() => {
    if (!business.perk) return undefined;

    return {
      content: (
        <div className="flex items-start gap-2">
          <Gift className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 mb-1">Alumni Perk</p>
            <p className="text-sm text-green-700 line-clamp-2">
              {business.perk}
            </p>
          </div>
        </div>
      ),
      className: variant === 'list'
        ? 'bg-green-50 border-green-200'
        : 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'
    };
  }, [business.perk, variant]);

  return (
    <BaseCard
      id={business.id}
      title={business.name}
      subtitle={business.category}
      description={business.description}
      avatar={{
        src: business.logo_url,
        fallback: business.name.charAt(0).toUpperCase(),
        size: variant === 'list' ? 'lg' : 'md'
      }}
      variant={variant}
      href={`/businesses/${business.id}`}
      className={className}
      badges={badges}
      infoItems={infoItems}
      actions={actions}
      highlight={highlight}
    />
  );
});

BusinessCard.displayName = 'BusinessCard';