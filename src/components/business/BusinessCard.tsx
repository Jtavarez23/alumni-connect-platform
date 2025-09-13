// Business Card Component
// Displays business information in card format

import React from 'react';
import { Link } from 'react-router-dom';
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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClaimBusiness } from '@/hooks/useBusiness';
import { cn } from '@/lib/utils';
import type { Business } from '@/types/business';

interface BusinessCardProps {
  business: Business;
  variant?: 'card' | 'list' | 'compact';
  className?: string;
}

export function BusinessCard({ business, variant = 'card', className = '' }: BusinessCardProps) {
  const claimMutation = useClaimBusiness();

  const handleClaim = async (e: React.MouseEvent) => {
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
  };

  const handleVisitWebsite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (business.website) {
      const url = business.website.startsWith('http') ? business.website : `https://${business.website}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRedeemPerk = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (business.perk_url) {
      const url = business.perk_url.startsWith('http') ? business.perk_url : `https://${business.perk_url}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (variant === 'list') {
    return (
      <Link to={`/businesses/${business.id}`}>
        <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={business.logo_url} />
                  <AvatarFallback className="text-lg font-semibold">
                    {business.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">
                      {business.name}
                    </h3>
                    {business.category && (
                      <p className="text-sm text-muted-foreground">
                        {business.category}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {business.is_premium && (
                      <Badge variant="default" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                    {business.verified && (
                      <Badge variant="secondary" className="text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                {business.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {business.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {business.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{business.location}</span>
                    </div>
                  )}
                  {business.owner_name && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>Owner: {business.owner_name}</span>
                    </div>
                  )}
                </div>

                {business.perk && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                    <Gift className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 line-clamp-1">
                      Alumni Perk: {business.perk}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 self-center">
                <div className="flex flex-col gap-2">
                  {business.website && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleVisitWebsite}
                      className="w-full sm:w-auto"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                  {business.perk && (
                    <Button
                      size="sm"
                      onClick={handleRedeemPerk}
                      className="w-full sm:w-auto"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Get Perk
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Card variant (default)
  return (
    <Link to={`/businesses/${business.id}`}>
      <Card className={cn('hover:shadow-lg transition-shadow cursor-pointer h-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="w-12 h-12">
                <AvatarImage src={business.logo_url} />
                <AvatarFallback className="text-lg font-semibold">
                  {business.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg leading-tight line-clamp-1">
                  {business.name}
                </h3>
                {business.category && (
                  <p className="text-sm text-muted-foreground">
                    {business.category}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {business.is_premium && (
                <Badge variant="default" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}
              {business.verified && (
                <Badge variant="secondary" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4 space-y-3">
          {business.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {business.description}
            </p>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            {business.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{business.location}</span>
              </div>
            )}
            
            {business.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{business.phone}</span>
              </div>
            )}

            {business.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{business.email}</span>
              </div>
            )}

            {business.owner_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 flex-shrink-0" />
                <span>Owner: {business.owner_name}</span>
              </div>
            )}
          </div>

          {/* Alumni Perk Highlight */}
          {business.perk && (
            <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2">
                <Gift className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">Alumni Perk</p>
                  <p className="text-sm text-green-700 line-clamp-2">
                    {business.perk}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hours (if available) */}
          {business.hours && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Business hours available</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 flex gap-2">
          {business.website && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVisitWebsite}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Website
            </Button>
          )}
          
          {business.perk ? (
            <Button
              size="sm"
              onClick={handleRedeemPerk}
              className="flex-1"
            >
              <Gift className="w-4 h-4 mr-2" />
              Get Perk
            </Button>
          ) : !business.is_owner && !business.has_claimed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClaim}
              disabled={claimMutation.isPending}
              className="flex-1"
            >
              Claim Business
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}