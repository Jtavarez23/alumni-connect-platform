import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Camera, 
  Calendar,
  MapPin,
  Users,
  Sparkles,
  BookOpen,
  Clock,
  Trophy,
  Star,
  Gift,
  Music
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Memory {
  id: string;
  content: string;
  photo_url?: string;
  created_at: string;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  reactions: any[];
  mentions: string[];
  page_references: number[];
}

interface ReunionEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  attendees_count: number;
  is_attending: boolean;
}

interface YearbookSocialHubProps {
  yearbookId: string;
  yearbook: {
    title: string;
    year: number;
    schools: { name: string };
  };
}

export function YearbookSocialHub({ yearbookId, yearbook }: YearbookSocialHubProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [reunionEvents, setReunionEvents] = useState<ReunionEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'memories' | 'events' | 'stats' | 'superlatives'>('memories');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    loadSocialContent();
  }, [yearbookId]);

  const loadSocialContent = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMemories(),
        loadReunionEvents(),
      ]);
    } catch (error) {
      console.error('Error loading social content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemories = async () => {
    const { data, error } = await supabase
      .from('yearbook_memories')
      .select(`
        *,
        author:profiles(id, display_name, avatar_url),
        reactions:memory_reactions(reaction_type, user_id)
      `)
      .eq('yearbook_id', yearbookId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading memories:', error);
      return;
    }

    setMemories(data || []);
  };

  const loadReunionEvents = async () => {
    const { data, error } = await supabase
      .from('reunion_events')
      .select(`
        *,
        attendees:event_attendees(user_id)
      `)
      .eq('yearbook_id', yearbookId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error loading reunion events:', error);
      return;
    }

    const eventsWithAttendance = data?.map(event => ({
      ...event,
      attendees_count: event.attendees?.length || 0,
      is_attending: event.attendees?.some((a: any) => a.user_id === user?.id) || false
    })) || [];

    setReunionEvents(eventsWithAttendance);
  };

  const shareMemory = async () => {
    if (!newMemory.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('yearbook_memories')
        .insert({
          yearbook_id: yearbookId,
          author_id: user.id,
          content: newMemory,
          mentions: [], // Could parse @mentions from content
          page_references: [] // Could parse page references
        });

      if (error) throw error;

      setNewMemory("");
      setShowMemoryForm(false);
      toast.success("Memory shared!");
      loadMemories();
    } catch (error) {
      console.error('Error sharing memory:', error);
      toast.error("Failed to share memory");
    }
  };

  const toggleReaction = async (memoryId: string, reactionType: string) => {
    if (!user) return;

    try {
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('memory_reactions')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .single();

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('memory_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add reaction
        await supabase
          .from('memory_reactions')
          .insert({
            memory_id: memoryId,
            user_id: user.id,
            reaction_type: reactionType
          });
      }

      loadMemories(); // Refresh to show updated reactions
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const joinEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id
        });

      if (error) throw error;
      
      toast.success("Added to your calendar!");
      loadReunionEvents();
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error("Failed to join event");
    }
  };

  const MemoriesTab = () => (
    <div className="space-y-6">
      {/* Share Memory Form */}
      <Card>
        <CardContent className="p-4">
          {!showMemoryForm ? (
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowMemoryForm(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Share a memory from {yearbook.year}...
            </Button>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Share a favorite memory, story, or moment from your school days..."
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  Add photos • @ mention friends • # reference pages
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowMemoryForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={shareMemory} disabled={!newMemory.trim()}>
                    Share Memory
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memory Feed */}
      {memories.map((memory) => (
        <Card key={memory.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar>
                <AvatarImage src={memory.author.avatar_url} />
                <AvatarFallback>
                  {memory.author.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold text-sm">{memory.author.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(memory.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <p className="text-sm mb-3 leading-relaxed">{memory.content}</p>
                
                {memory.photo_url && (
                  <div className="mb-3">
                    <img 
                      src={memory.photo_url} 
                      alt="Memory photo" 
                      className="rounded-lg max-w-full h-auto"
                    />
                  </div>
                )}
                
                {memory.page_references.length > 0 && (
                  <div className="flex gap-1 mb-3">
                    {memory.page_references.map((page) => (
                      <Badge key={page} variant="secondary" className="text-xs">
                        Page {page}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReaction(memory.id, 'heart')}
                    className="h-8 px-2"
                  >
                    <Heart className="w-4 h-4 mr-1" />
                    {memory.reactions.filter(r => r.reaction_type === 'heart').length}
                  </Button>
                  
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                  
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EventsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Class Reunions & Events</h3>
        <Button size="sm">
          <Calendar className="w-4 h-4 mr-2" />
          Plan Event
        </Button>
      </div>
      
      {reunionEvents.map((event) => (
        <Card key={event.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold mb-1">{event.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {event.attendees_count} attending
                  </div>
                </div>
              </div>
              
              <Button 
                size="sm" 
                variant={event.is_attending ? "default" : "outline"}
                onClick={() => joinEvent(event.id)}
                disabled={event.is_attending}
              >
                {event.is_attending ? "Attending" : "Join"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const StatsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Class Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Class Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">127</div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">89</div>
              <div className="text-sm text-muted-foreground">On Platform</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">42</div>
              <div className="text-sm text-muted-foreground">Active Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">23</div>
              <div className="text-sm text-muted-foreground">Recent Connections</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popular Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5" />
            Most Popular Activities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Drama Club</span>
            <Badge>32 members</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Basketball Team</span>
            <Badge>28 members</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Student Council</span>
            <Badge>24 members</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Yearbook Committee</span>
            <Badge>19 members</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SuperlativesTab = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Class Superlatives</h3>
        <p className="text-sm text-muted-foreground">Vote for your classmates in fun categories!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Most Likely to Succeed", icon: Trophy, color: "text-yellow-600" },
          { title: "Best Dressed", icon: Star, color: "text-pink-600" },
          { title: "Class Clown", icon: Gift, color: "text-purple-600" },
          { title: "Most Athletic", icon: Users, color: "text-blue-600" },
          { title: "Most Artistic", icon: Music, color: "text-green-600" },
          { title: "Friendliest", icon: Heart, color: "text-red-600" },
        ].map((category, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <category.icon className={`w-6 h-6 ${category.color}`} />
                <h4 className="font-semibold">{category.title}</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sarah Johnson</span>
                  <Badge variant="secondary">24 votes</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mike Chen</span>
                  <Badge variant="secondary">18 votes</Badge>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full mt-3">
                Vote Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {yearbook.schools.name} Social Hub
              </h2>
              <p className="text-muted-foreground">
                Connect with classmates from the Class of {yearbook.year}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                89 classmates
              </Badge>
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Active now
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'memories', label: 'Memories', icon: Sparkles },
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'stats', label: 'Stats', icon: Trophy },
          { id: 'superlatives', label: 'Superlatives', icon: Star },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="flex-1"
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'memories' && <MemoriesTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'superlatives' && <SuperlativesTab />}
      </div>
    </div>
  );
}