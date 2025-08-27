import { useState, useEffect } from "react";
import { Users, BookOpen, MessageCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface ProfileStatsProps {
  userId: string;
}

interface Stats {
  connections: number;
  yearbooks: number;
  messages: number;
  memberSince: string;
}

const ProfileStats = ({ userId }: ProfileStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    connections: 0,
    yearbooks: 0,
    messages: 0,
    memberSince: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get connections count
        const { count: connectionsCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .eq('status', 'accepted');

        // Get yearbook appearances count
        const { count: yearbooksCount } = await supabase
          .from('yearbook_entries')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', userId);

        // Get messages count (sent)
        const { count: messagesCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userId);

        // Get member since date
        const { data: profileData } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', userId)
          .single();

        setStats({
          connections: connectionsCount || 0,
          yearbooks: yearbooksCount || 0,
          messages: messagesCount || 0,
          memberSince: profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          }) : "Unknown"
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const statItems = [
    {
      icon: Users,
      label: "Connections",
      value: stats.connections,
      color: "text-primary"
    },
    {
      icon: BookOpen,
      label: "Yearbooks",
      value: stats.yearbooks,
      color: "text-secondary"
    },
    {
      icon: MessageCircle,
      label: "Messages",
      value: stats.messages,
      color: "text-accent"
    },
    {
      icon: Calendar,
      label: "Member Since",
      value: stats.memberSince,
      color: "text-muted-foreground"
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 w-8 bg-muted rounded-full mx-auto mb-2 animate-pulse" />
                <div className="h-4 bg-muted rounded mx-auto mb-1 animate-pulse" />
                <div className="h-3 bg-muted rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item, index) => (
            <div key={index} className="text-center">
              <item.icon className={`h-8 w-8 mx-auto mb-2 ${item.color}`} />
              <div className="text-2xl font-bold text-foreground">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileStats;