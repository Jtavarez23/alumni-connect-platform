import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, MapPin, Search, AlertCircle, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface AddSchoolDialogProps {
  onSchoolAdded?: (school: any) => void;
}

const AddSchoolDialog = ({ onSchoolAdded }: AddSchoolDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [useManualCoords, setUseManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [graduated, setGraduated] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { toast } = useToast();
  const { canAddSchool, shouldShowUpgradePrompt, getSchoolsRemaining } = useSubscription();
  const { addSchoolHistory } = useSchoolHistory();

  // Get Mapbox token when dialog opens
  useEffect(() => {
    if (!open) return;

    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (data?.token && !error) {
          setMapboxToken(data.token);
          setMapError(null);
        } else {
          const storedToken = localStorage.getItem('mapbox_token');
          if (storedToken) {
            setMapboxToken(storedToken);
            setMapError(null);
          } else {
            setMapError('Mapbox token required. Please enter your token below or use manual coordinates.');
          }
        }
      } catch (err) {
        setMapError('Failed to get Mapbox token. Please enter your token or use manual coordinates.');
      }
    };

    getMapboxToken();
  }, [open]);

  // Initialize map when token is available
  useEffect(() => {
    if (open && mapContainer.current && mapboxToken && !map.current && !useManualCoords) {
      try {
        mapboxgl.accessToken = mapboxToken;
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-80.1918, 25.7617],
          zoom: 10
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
          setMapError(null);
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setMapError('Map failed to load. Please check your token or use manual coordinates.');
        });

        map.current.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          setCoordinates([lng, lat]);
          
          if (marker.current) {
            marker.current.remove();
          }
          
          marker.current = new mapboxgl.Marker()
            .setLngLat([lng, lat])
            .addTo(map.current!);
        });
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map. Please use manual coordinates.');
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
    };
  }, [open, mapboxToken, useManualCoords]);

  const searchAddress = async () => {
    if (!address.trim()) return;
    
    const token = mapboxToken || localStorage.getItem('mapbox_token');
    if (!token) {
      toast({
        title: "Token required",
        description: "Mapbox token required for address search",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setCoordinates([lng, lat]);
        
        if (map.current) {
          map.current.flyTo({ center: [lng, lat], zoom: 15 });
          
          if (marker.current) {
            marker.current.remove();
          }
          
          marker.current = new mapboxgl.Marker()
            .setLngLat([lng, lat])
            .addTo(map.current);
        }
      } else {
        toast({
          title: "Address not found",
          description: "Please try a different address or click on the map",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Unable to search for address",
        variant: "destructive"
      });
    }
  };

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox_token', mapboxToken);
      setMapError(null);
      toast({
        title: "Token saved",
        description: "Map will reload with your token"
      });
    }
  };

  const handleManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Invalid coordinates",
        description: "Please enter valid numbers",
        variant: "destructive"
      });
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Coordinates out of range",
        description: "Latitude must be -90 to 90, longitude -180 to 180",
        variant: "destructive"
      });
      return;
    }
    
    setCoordinates([lng, lat]);
    toast({
      title: "Coordinates set",
      description: "Location has been set successfully"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCoordinates = useManualCoords && manualLat && manualLng 
      ? [parseFloat(manualLng), parseFloat(manualLat)] as [number, number]
      : coordinates;
    
    if (!name.trim() || !type || !finalCoordinates || !startYear || !endYear) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields including years attended",
        variant: "destructive"
      });
      return;
    }

    const startYearNum = parseInt(startYear);
    const endYearNum = parseInt(endYear);
    
    if (startYearNum > endYearNum) {
      toast({
        title: "Invalid years",
        description: "Start year cannot be after end year",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // First create the school
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: name.trim(),
          type,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          location: {
            coordinates: finalCoordinates,
            address: address.trim() || null,
            city: null,
            state: null,
            country: null
          },
          user_submitted: true,
          submission_status: 'approved', // Auto-approve user submissions for now
          submitted_by: (await supabase.auth.getUser()).data.user?.id,
          verified: false
        })
        .select()
        .single();

      if (schoolError) throw schoolError;

      // Then add to user's school history
      await addSchoolHistory({
        school_id: schoolData.id,
        start_year: startYearNum,
        end_year: endYearNum,
        graduated,
        is_primary: isPrimary,
        role_type: 'student',
        grade_level: '',
        department: '',
        verification_status: 'pending',
        transfer_reason: '',
        achievements: [],
        activities: []
      });

      toast({
        title: "School added successfully",
        description: `${schoolData.name} has been added to your education history`
      });

      onSchoolAdded?.(schoolData);
      
      // Reset form
      setOpen(false);
      setName("");
      setType("");
      setAddress("");
      setStartYear("");
      setEndYear("");
      setGraduated(true);
      setIsPrimary(false);
      setCoordinates(null);
      setManualLat("");
      setManualLng("");
      setUseManualCoords(false);
      
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
    } catch (error: any) {
      console.error("Error adding school:", error);
      toast({
        title: "Failed to add school",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    if (!canAddSchool()) {
      return;
    }
    setOpen(true);
  };

  if (shouldShowUpgradePrompt()) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="w-full" disabled>
          <Crown className="h-4 w-4 mr-2" />
          Add New School (Premium Required)
        </Button>
        <UpgradePrompt feature="unlimited schools" compact />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add New School
          {!canAddSchool() && (
            <Badge variant="secondary" className="ml-2">
              {getSchoolsRemaining()} left
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Your School</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="school-name">School Name *</Label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter school name"
              required
            />
          </div>

          <div>
            <Label htmlFor="school-type">School Type *</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select school type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elementary_school">Elementary School</SelectItem>
                <SelectItem value="middle_school">Middle School / Junior High</SelectItem>
                <SelectItem value="high_school">High School</SelectItem>
                <SelectItem value="community_college">Community College</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="graduate_school">Graduate School</SelectItem>
                <SelectItem value="trade_school">Trade School / Vocational School</SelectItem>
                <SelectItem value="private_school">Private School</SelectItem>
                <SelectItem value="charter_school">Charter School</SelectItem>
                <SelectItem value="online_school">Online School</SelectItem>
                <SelectItem value="international_school">International School</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-year">Start Year *</Label>
              <Input
                id="start-year"
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                placeholder="2020"
                min="1900"
                max="2030"
                required
              />
            </div>
            <div>
              <Label htmlFor="end-year">End Year *</Label>
              <Input
                id="end-year"
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max="2030"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="graduated"
                checked={graduated}
                onChange={(e) => setGraduated(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="graduated">I graduated from this school</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-primary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="is-primary">This is my primary school</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address (Optional)</Label>
            <div className="flex space-x-2">
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter school address"
              />
              <Button 
                type="button" 
                onClick={searchAddress} 
                variant="outline" 
                size="icon"
                disabled={!mapboxToken && !localStorage.getItem('mapbox_token')}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {mapError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mapError}
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter your Mapbox public token"
                      value={mapboxToken}
                      onChange={(e) => setMapboxToken(e.target.value)}
                    />
                    <Button type="button" onClick={handleTokenSubmit} size="sm">
                      Save Token
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your free token at <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUseManualCoords(!useManualCoords)}
                  >
                    {useManualCoords ? 'Use Map' : 'Enter Coordinates Manually'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {useManualCoords ? (
            <div className="space-y-2">
              <Label>Manual Coordinates *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Latitude"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  type="number"
                  step="any"
                />
                <Input
                  placeholder="Longitude"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  type="number"
                  step="any"
                />
              </div>
              <Button type="button" onClick={handleManualCoords} size="sm">
                Set Coordinates
              </Button>
            </div>
          ) : (
            <div>
              <Label>Location on Map *</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Click on the map to pin your school's location
              </p>
              <div 
                ref={mapContainer} 
                className="w-full h-64 rounded-lg border"
              />
            </div>
          )}

          {(coordinates || (useManualCoords && manualLat && manualLng)) && (
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 mr-1" />
              {useManualCoords 
                ? `${manualLat}, ${manualLng}` 
                : `${coordinates![1].toFixed(6)}, ${coordinates![0].toFixed(6)}`
              }
            </div>
          )}

          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Badge variant="secondary">Pending Review</Badge>
            <span className="text-sm text-muted-foreground">
              Submitted schools are reviewed before appearing in search results
            </span>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (!coordinates && !(useManualCoords && manualLat && manualLng)) || !startYear || !endYear}
            >
              {loading ? "Adding..." : "Add School"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSchoolDialog;