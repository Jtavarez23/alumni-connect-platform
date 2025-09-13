import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { MessageDialog } from "@/components/messaging/MessageDialog";
import { ThreadView } from "@/components/messaging/ThreadView";
import { GroupConversationCreator } from "@/components/messaging/GroupConversationCreator";
import { MessagingLimitsWidget } from "@/components/messaging/MessagingRestrictions";
import { useOptimizedConversations } from "@/hooks/useOptimizedConversations";
import { useSubscription } from "@/hooks/useSubscription";
import { Search, MessageCircle, Clock, Users, ArrowLeft, Plus, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { conversations, loading, searchConversations } = useOptimizedConversations();
  const { isFreeTier } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);

  const filteredConversations = searchConversations(searchQuery);

  const handleConversationClick = (conversation: any) => {
    if (conversation.is_group) {
      navigate(`/messages/${conversation.id}`);
    } else {
      setSelectedUser(conversation.other_user);
      setIsMessageDialogOpen(true);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <AppLayout title="Messages">
      <div className="flex h-full bg-background">
        {/* Left Pane - Conversation List */}
        <div className={`${threadId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-col border-r bg-card`}>
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Messages</h1>
              <GroupConversationCreator>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </GroupConversationCreator>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* Free tier limits */}
            {isFreeTier && (
              <div className="mt-3">
                <MessagingLimitsWidget />
              </div>
            )}
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-sm">Loading...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-2">No conversations yet</p>
                <p className="text-xs mb-4">Start chatting with classmates</p>
                <GroupConversationCreator>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    New Group
                  </Button>
                </GroupConversationCreator>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-2 border-transparent ${
                      threadId === conversation.id ? 'bg-accent/30 border-l-brand-500' : ''
                    }`}
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={
                              conversation.is_group
                                ? undefined
                                : conversation.other_user?.avatar_url
                            }
                          />
                          <AvatarFallback className="text-sm">
                            {conversation.is_group
                              ? <Users className="h-5 w-5" />
                              : getInitials(
                                  conversation.other_user?.first_name || '',
                                  conversation.other_user?.last_name || ''
                                )
                            }
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 bg-brand-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium">
                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm truncate">
                              {conversation.is_group
                                ? conversation.title || 'Group Chat'
                                : `${conversation.other_user?.first_name} ${conversation.other_user?.last_name}`
                              }
                            </h3>
                            {conversation.is_group && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {conversation.participants?.length || 0} participants
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conversation.last_message_at), {
                              addSuffix: true,
                            }).replace('about ', '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Pane - Thread View or Empty State */}
        <div className="flex-1 flex flex-col">
          {threadId ? (
            <>
              {/* Mobile back button */}
              <div className="lg:hidden flex items-center gap-3 p-4 border-b bg-card">
                <Button variant="ghost" size="sm" onClick={() => navigate('/messages')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-medium">Back to conversations</h2>
              </div>
              <ThreadView />
            </>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground max-w-md">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-sm">
                  Choose from your existing conversations or start a new one to begin messaging.
                </p>
                <div className="mt-6">
                  <GroupConversationCreator>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Start New Group Chat
                    </Button>
                  </GroupConversationCreator>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Dialog for 1:1 conversations */}
        {selectedUser && (
          <MessageDialog
            isOpen={isMessageDialogOpen}
            onClose={() => setIsMessageDialogOpen(false)}
            otherUser={selectedUser}
          />
        )}
      </div>
    </AppLayout>
  );
}