import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Hash, BookOpen, Calendar, Users, Trophy, Gamepad2 } from 'lucide-react';
import { ClassChannel } from '@/hooks/useClassChannels';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    description?: string;
    channel_type: ClassChannel['channel_type'];
    is_private?: boolean;
  }) => Promise<any>;
}

const channelTypes = [
  { value: 'general', label: 'General', icon: Hash, description: 'General discussion' },
  { value: 'memories', label: 'Memories', icon: BookOpen, description: 'Share memories and photos' },
  { value: 'events', label: 'Events', icon: Calendar, description: 'Plan reunions and meetups' },
  { value: 'study_groups', label: 'Study Groups', icon: Users, description: 'Academic discussions' },
  { value: 'sports', label: 'Sports', icon: Trophy, description: 'Sports teams and activities' },
  { value: 'clubs', label: 'Clubs', icon: Gamepad2, description: 'Clubs and hobbies' },
];

export function CreateChannelDialog({ open, onOpenChange, onCreate }: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<ClassChannel['channel_type']>('general');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        channel_type: channelType,
        is_private: isPrivate,
      });
      
      // Reset form
      setName('');
      setDescription('');
      setChannelType('general');
      setIsPrivate(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = channelTypes.find(t => t.value === channelType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new channel for your class to discuss specific topics.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-type">Channel Type</Label>
            <Select value={channelType} onValueChange={(value: ClassChannel['channel_type']) => setChannelType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channelTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <div className="flex items-center gap-2">
              {selectedType && <selectedType.icon className="h-4 w-4 text-muted-foreground" />}
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter channel name..."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (Optional)</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="private-channel">Private Channel</Label>
              <div className="text-sm text-muted-foreground">
                Only invited members can join
              </div>
            </div>
            <Switch
              id="private-channel"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}