import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, MapPin, Users, Building, GraduationCap, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type SchoolRow = Database['public']['Tables']['schools']['Row'];
type DistrictRow = Database['public']['Tables']['school_districts']['Row'];

interface EnhancedSchool extends SchoolRow {
  districts?: DistrictRow;
  student_count?: number;
  partnership_count?: number;
}

interface EnhancedSchoolDiscoveryProps {
  onSchoolSelect: (school: EnhancedSchool) => void;
  excludeSchoolIds?: string[];
}

export const EnhancedSchoolDiscovery: React.FC<EnhancedSchoolDiscoveryProps> = ({
  onSchoolSelect,
  excludeSchoolIds = []
}) => {
  const { toast } = useToast();
  const [schools, setSchools] = useState<EnhancedSchool[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          districts:school_districts(*)
        `)
        .eq('submission_status', 'approved')
        .order('name');

      if (error) throw error;
      setSchools((data || []) as EnhancedSchool[]);
    } catch (error: any) {
      toast({
        title: "Error loading schools",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('school_districts')
        .select('*')
        .order('name');

      if (error) throw error;
      setDistricts(data || []);
    } catch (error: any) {
      console.error('Error fetching districts:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSchools();
      fetchDistricts();
    }
  }, [isOpen]);

  const filteredSchools = schools.filter(school => {
    if (excludeSchoolIds.includes(school.id)) return false;
    
    const matchesSearch = !searchTerm || 
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.state?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDistrict = selectedDistrict === 'all' || school.district_id === selectedDistrict;
    const matchesState = selectedState === 'all' || school.state === selectedState;
    const matchesType = selectedType === 'all' || school.type === selectedType;
    
    return matchesSearch && matchesDistrict && matchesState && matchesType;
  });

  const getLocationDisplay = (school: EnhancedSchool) => {
    const parts = [school.city, school.state].filter(Boolean);
    return parts.join(', ');
  };

  const handleSchoolSelect = (school: EnhancedSchool) => {
    onSchoolSelect(school);
    setIsOpen(false);
  };

  const uniqueStates = Array.from(new Set(schools.map(s => s.state).filter(Boolean))).sort();
  const uniqueTypes = Array.from(new Set(schools.map(s => s.type))).sort();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Search className="h-4 w-4 mr-2" />
          Discover Schools
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Discover Schools</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger>
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map(district => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-96">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-2" />
                <p>No schools found matching your criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSchools.map(school => (
                  <Card key={school.id} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleSchoolSelect(school)}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm line-clamp-1">{school.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {school.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {getLocationDisplay(school) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{getLocationDisplay(school)}</span>
                          </div>
                        )}
                        
                        {school.districts && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{school.districts.name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          {school.founding_year && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="h-3 w-3" />
                              <span>Est. {school.founding_year}</span>
                            </div>
                          )}
                          
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {filteredSchools.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {filteredSchools.length} schools
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};