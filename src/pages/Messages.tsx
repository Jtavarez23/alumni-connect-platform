import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { MessageDialog } from "@/components/messaging/MessageDialog";
import { useConversations } from "@/hooks/useConversations";
import { Search, MessageCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { conversations, loading } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);

  const filteredConversations = conversations.filter(conv =>
    `${conv.other_user.first_name} ${conv.other_user.last_name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = (conversation: any) => {
    setSelectedUser(conversation.other_user);
    setIsMessageDialogOpen(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <AppLayout title="Messages">
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Messages</h1>
          <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {conversations.length === 0 ? (
                  <div>
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start chatting with classmates from the Network page</p>
                  </div>
                ) : (
                  <p>No conversations match your search</p>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors active:bg-accent/70"
                  onClick={() => handleConversationClick(conversation)}
                >
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarImage src={conversation.other_user.avatar_url} />
                    <AvatarFallback className="text-xs sm:text-sm">
                      {getInitials(conversation.other_user.first_name, conversation.other_user.last_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-sm sm:text-base truncate">
                        {conversation.other_user.first_name} {conversation.other_user.last_name}
                      </h3>
                      {conversation.last_message_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </span>
                          <span className="sm:hidden">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        <span className="hidden sm:inline">Click to open conversation</span>
                        <span className="sm:hidden">Tap to chat</span>
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="h-4 min-w-4 sm:h-5 sm:min-w-5 text-xs px-1 sm:px-1.5 flex-shrink-0">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Message Dialog */}
        {selectedUser && (
          <MessageDialog
            isOpen={isMessageDialogOpen}
            onClose={() => {
              setIsMessageDialogOpen(false);
              setSelectedUser(null);
            }}
            otherUser={selectedUser}
          />
        )}
      </div>
    </AppLayout>
  );
}