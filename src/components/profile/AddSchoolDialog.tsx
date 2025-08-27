import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface AddSchoolDialogProps {
  onSchoolAdded: (school: any) => void;
}

const MAPBOX_TOKEN = "pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTYzcGQyeDgwNGg1MnFyN3RnOWV1bXl0In0.Y4nVQm1xEJR2mRJD_6qjSA";

const AddSchoolDialog = ({ onSchoolAdded }: AddSchoolDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && mapContainer.current && !map.current) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-80.1918, 25.7617], // Miami area default
        zoom: 10
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
    }
  }, [open]);

  const searchAddress = async () => {
    if (!address.trim()) return;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !type || !coordinates) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a location on the map",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('schools')
        .insert({
          name: name.trim(),
          type,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          location: {
            coordinates,
            address: address.trim() || null,
            city: null,
            state: null,
            country: null
          },
          user_submitted: true,
          submission_status: 'pending',
          submitted_by: (await supabase.auth.getUser()).data.user?.id,
          verified: false
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "School submitted successfully",
        description: "Your school is pending review and will be available soon"
      });

      onSchoolAdded(data);
      setOpen(false);
      setName("");
      setType("");
      setAddress("");
      setCoordinates(null);
      
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
    } catch (error: any) {
      toast({
        title: "Failed to submit school",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add New School
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
                <SelectItem value="high_school">High School</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="university">University</SelectItem>
              </SelectContent>
            </Select>
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
              <Button type="button" onClick={searchAddress} variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Location on Map *</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Click on the map to pin your school's location
            </p>
            <div 
              ref={mapContainer} 
              className="w-full h-64 rounded-lg border"
            />
            {coordinates && (
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
              </div>
            )}
          </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit School"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSchoolDialog;