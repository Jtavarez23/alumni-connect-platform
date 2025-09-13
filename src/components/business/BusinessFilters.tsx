// Business Filters Component
// Advanced filtering interface for business directory

import React, { useState, useEffect } from 'react';
import { X, MapPin, Tag, Award, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_CATEGORIES } from '@/types/business';
import type { BusinessFilters as BusinessFiltersType } from '@/types/business';

interface BusinessFiltersProps {
  filters: BusinessFiltersType;
  onChange: (filters: BusinessFiltersType) => void;
  onClose: () => void;
}

export function BusinessFilters({ filters, onChange, onClose }: BusinessFiltersProps) {
  const [localFilters, setLocalFilters] = useState<BusinessFiltersType>(filters);

  const updateFilter = (key: keyof BusinessFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onChange(localFilters);
  };

  const clearFilters = () => {
    const emptyFilters: BusinessFiltersType = {};
    setLocalFilters(emptyFilters);
    onChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== null && value !== '' && value !== false
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Filter Businesses</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Category */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Category
          </Label>
          <Select
            value={localFilters.category || ''}
            onValueChange={(value) => updateFilter('category', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {BUSINESS_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input
            placeholder="Enter city or location"
            value={localFilters.location || ''}
            onChange={(e) => updateFilter('location', e.target.value)}
          />
        </div>

        {/* Business Type Filters */}
        <div className="space-y-3">
          <Label>Business Type</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={localFilters.verified_only === true}
                onCheckedChange={(checked) =>
                  updateFilter('verified_only', checked ? true : undefined)
                }
              />
              <Label htmlFor="verified" className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4" />
                Verified businesses only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="with-perks"
                checked={localFilters.with_perks === true}
                onCheckedChange={(checked) =>
                  updateFilter('with_perks', checked ? true : undefined)
                }
              />
              <Label htmlFor="with-perks" className="text-sm flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Alumni perks available
              </Label>
            </div>
          </div>
        </div>

        {/* Popular Categories */}
        <div className="space-y-3">
          <Label>Popular Categories</Label>
          <div className="grid grid-cols-2 gap-2">
            {['Restaurant', 'Healthcare', 'Technology', 'Professional Services', 'Retail', 'Real Estate'].map((category) => (
              <Button
                key={category}
                variant={localFilters.category === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('category', localFilters.category === category ? undefined : category)}
                className="text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Popular Locations */}
        <div className="space-y-3">
          <Label>Popular Locations</Label>
          <div className="grid grid-cols-1 gap-2">
            {['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Miami, FL'].map((location) => (
              <Button
                key={location}
                variant={localFilters.location === location ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('location', localFilters.location === location ? undefined : location)}
                className="text-xs justify-start"
              >
                <MapPin className="w-3 h-3 mr-2" />
                {location}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button variant="outline" onClick={clearFilters} disabled={getActiveFilterCount() === 0}>
          Clear All Filters
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={applyFilters}>
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Active Filters:</Label>
          <div className="flex flex-wrap gap-2">
            {localFilters.category && (
              <Badge variant="secondary" className="gap-1">
                <Tag className="w-3 h-3" />
                {localFilters.category}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilter('category', undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {localFilters.location && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="w-3 h-3" />
                {localFilters.location}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilter('location', undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {localFilters.verified_only && (
              <Badge variant="secondary" className="gap-1">
                <Award className="w-3 h-3" />
                Verified Only
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilter('verified_only', undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {localFilters.with_perks && (
              <Badge variant="secondary" className="gap-1">
                <Gift className="w-3 h-3" />
                With Perks
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilter('with_perks', undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Filter Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Use verified filter to find authenticated alumni businesses</li>
          <li>• Filter by perks to discover exclusive alumni discounts</li>
          <li>• Search by location to find businesses in your area</li>
        </ul>
      </div>
    </div>
  );
}