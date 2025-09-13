import { Card, CardContent } from "@/components/ui/card";
import { SearchQuotaWidget } from "./SearchQuotaWidget";
import { useSubscription } from "@/hooks/useSubscription";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface AlumniSearchIntegrationProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedSchoolId: string;
  onSchoolChange: (schoolId: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  schools: Array<{ id: string; name: string }>;
  graduationYears: number[];
  isFreeTier: boolean;
  yearRange?: { minYear: number; maxYear: number } | null;
}

export const AlumniSearchIntegration = ({
  searchTerm,
  onSearchChange,
  selectedSchoolId,
  onSchoolChange,
  selectedYear,
  onYearChange,
  schools,
  graduationYears,
  isFreeTier,
  yearRange
}: AlumniSearchIntegrationProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      {/* Search and Filters */}
      <div className="lg:col-span-3">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={selectedSchoolId} onValueChange={onSchoolChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={onYearChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by graduation year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {graduationYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                        {isFreeTier && yearRange && year === yearRange.minYear && (
                          <Badge variant="secondary" className="ml-2">Your Year</Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Search Quota Widget */}
      <div className="lg:col-span-1">
        <SearchQuotaWidget compact={false} showUpgradeDialog={true} />
      </div>
    </div>
  );
};