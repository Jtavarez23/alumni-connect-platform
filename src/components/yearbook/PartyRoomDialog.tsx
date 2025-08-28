import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus } from "lucide-react";

interface YearbookEdition {
  id: string;
  title: string;
  year: number;
  school: {
    name: string;
  };
}

interface PartyRoomDialogProps {
  yearbooks: YearbookEdition[];
  onRoomCreated: (roomId: string) => void;
}

export function PartyRoomDialog({ yearbooks, onRoomCreated }: PartyRoomDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    yearbookId: "",
    maxParticipants: "10"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.yearbookId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("yearbook_party_rooms")
        .insert({
          name: formData.name,
          description: formData.description,
          host_id: user.id,
          yearbook_edition_id: formData.yearbookId,
          max_participants: parseInt(formData.maxParticipants)
        })
        .select()
        .single();

      if (error) throw error;

      // Join the room as host
      await supabase
        .from("yearbook_party_participants")
        .insert({
          room_id: data.id,
          user_id: user.id
        });

      toast.success("Party room created successfully!");
      setOpen(false);
      setFormData({ name: "", description: "", yearbookId: "", maxParticipants: "10" });
      onRoomCreated(data.id);
    } catch (error) {
      console.error("Error creating party room:", error);
      toast.error("Failed to create party room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Party
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Yearbook Party
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Party Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Class of 2023 Nostalgia Night"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearbook">Yearbook</Label>
            <Select
              value={formData.yearbookId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, yearbookId: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a yearbook" />
              </SelectTrigger>
              <SelectContent>
                {yearbooks.map((yearbook) => (
                  <SelectItem key={yearbook.id} value={yearbook.id}>
                    {yearbook.title} - {yearbook.school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Let's look through our old yearbook together and share memories!"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Max Participants</Label>
            <Select
              value={formData.maxParticipants}
              onValueChange={(value) => setFormData(prev => ({ ...prev, maxParticipants: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 people</SelectItem>
                <SelectItem value="10">10 people</SelectItem>
                <SelectItem value="15">15 people</SelectItem>
                <SelectItem value="20">20 people</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Party"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}