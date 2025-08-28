import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Hash, Users, MessageCircle, Calendar, Trophy, BookOpen, Gamepad2 } from 'lucide-react';
import { useClassChannels } from '@/hooks/useClassChannels';
import { CreateChannelDialog } from './CreateChannelDialog';
import { ChannelChat } from './ChannelChat';
import { cn } from '@/lib/utils';

const channelIcons = {
  general: Hash,
  memories: BookOpen,
  events: Calendar,
  study_groups: Users,
  sports: Trophy,
  clubs: Gamepad2,
};

export function ClassChannels() {
  const { channels, loading, createChannel, joinChannel } = useClassChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannelId(channelId);
    
    // Auto-join channel if not already a member
    try {
      await joinChannel(channelId);
    } catch (error) {
      // Already a member, ignore error
    }
  };

  if (loading) {
    return (
      <Card className="h-[600px]">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-[600px]">
      {/* Channels Sidebar */}
      <Card className="col-span-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Class Channels</CardTitle>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[480px]">
            <div className="space-y-1 p-3">
              {channels.map((channel) => {
                const Icon = channelIcons[channel.channel_type];
                const isSelected = selectedChannelId === channel.id;
                
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      isSelected 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{channel.name}</span>
                        {channel.is_private && (
                          <Badge variant="secondary" className="text-xs">Private</Badge>
                        )}
                      </div>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {channel.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">
                          {channel.member_count} members
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {channels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No channels yet</p>
                  <p className="text-xs">Create the first channel for your class!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="col-span-8">
        {selectedChannel ? (
          <ChannelChat channel={selectedChannel} />
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Welcome to Class Channels</h3>
              <p className="text-sm max-w-md mx-auto">
                Connect with your classmates in topic-based channels. 
                Select a channel from the sidebar to start chatting!
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <CreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={createChannel}
      />
    </div>
  );
}