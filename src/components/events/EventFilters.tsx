// Event Filters Component
// Advanced filtering interface for events discovery

import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Users, Globe, School, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { EventFilters as EventFiltersType } from '@/types/events';
import type { DateRange } from 'react-day-picker';

interface EventFiltersProps {
  filters: EventFiltersType;
  onChange: (filters: EventFiltersType) => void;
  onClose: () => void;
}

export function EventFilters({ filters, onChange, onClose }: EventFiltersProps) {
  const [localFilters, setLocalFilters] = useState<EventFiltersType>(filters);
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Load schools for filter dropdown
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name')
          .order('name')
          .limit(100);

        if (!error && data) {
          setSchools(data);
        }
      } catch (error) {
        console.error('Error loading schools:', error);
      }
    };

    loadSchools();
  }, []);

  // Initialize date range from filters
  useEffect(() => {
    if (filters.start_date || filters.end_date) {
      setDateRange({
        from: filters.start_date ? new Date(filters.start_date) : undefined,
        to: filters.end_date ? new Date(filters.end_date) : undefined
      });
    }
  }, [filters.start_date, filters.end_date]);

  const updateFilter = (key: keyof EventFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    updateFilter('start_date', range?.from?.toISOString());
    updateFilter('end_date', range?.to?.toISOString());
  };

  const applyFilters = () => {
    onChange(localFilters);
  };

  const clearFilters = () => {
    const emptyFilters: EventFiltersType = {};
    setLocalFilters(emptyFilters);
    setDateRange(undefined);
    onChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Filter Events</h3>
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
        {/* Date Range */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Range
          </Label>
          <DatePickerWithRange
            date={dateRange}
            onDateChange={handleDateRangeChange}
            className="w-full"
          />
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

        {/* School */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <School className="w-4 h-4" />
            School
          </Label>
          <Select
            value={localFilters.school_id || ''}
            onValueChange={(value) => updateFilter('school_id', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All schools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All schools</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Event Type */}
        <div className="space-y-3">
          <Label>Event Type</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="virtual"
                checked={localFilters.is_virtual === true}
                onCheckedChange={(checked) =>
                  updateFilter('is_virtual', checked ? true : undefined)
                }
              />
              <Label htmlFor="virtual" className="text-sm">
                Virtual events only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="in-person"
                checked={localFilters.is_virtual === false}
                onCheckedChange={(checked) =>
                  updateFilter('is_virtual', checked ? false : undefined)
                }
              />
              <Label htmlFor="in-person" className="text-sm">
                In-person events only
              </Label>
            </div>
          </div>
        </div>

        {/* Quick Date Filters */}
        <div className="space-y-3">
          <Label>Quick Filters</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                handleDateRangeChange({ from: today, to: nextWeek });
              }}
            >
              Next Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const nextMonth = new Date(today);
                nextMonth.setMonth(today.getMonth() + 1);
                handleDateRangeChange({ from: today, to: nextMonth });
              }}
            >
              Next Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                handleDateRangeChange({ from: today, to: tomorrow });
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekend = new Date(today);
                // Find next Saturday
                const daysUntilSaturday = (6 - today.getDay()) % 7;
                weekend.setDate(today.getDate() + daysUntilSaturday);
                const sunday = new Date(weekend);
                sunday.setDate(weekend.getDate() + 1);
                handleDateRangeChange({ from: weekend, to: sunday });
              }}
            >
              This Weekend
            </Button>
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
            {localFilters.school_id && (
              <Badge variant="secondary" className="gap-1">
                <School className="w-3 h-3" />
                {schools.find(s => s.id === localFilters.school_id)?.name || 'School'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilter('school_id', undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {localFilters.is_virtual !== undefined && (
              <Badge variant="secondary" className="gap-1">
                {localFilters.is_virtual ? 'Virtual' : 'In-person'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => updateFilter('is_virtual', undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
            {dateRange && (
              <Badge variant="secondary" className="gap-1">
                <Calendar className="w-3 h-3" />
                Date Range
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleDateRangeChange(undefined)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}