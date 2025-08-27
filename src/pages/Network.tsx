import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, UserX, ArrowLeft, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NetworkProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  graduation_year: number | null;
  verification_status: string;
  school_id: string;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  requester: NetworkProfile;
  addressee: NetworkProfile;
}

const Network = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchFriendships();
    }
  }, [profile]);

  const fetchFriendships = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey(
          id, first_name, last_name, avatar_url, graduation_year, verification_status, school_id
        ),
        addressee:profiles!friendships_addressee_id_fkey(
          id, first_name, last_name, avatar_url, graduation_year, verification_status, school_id
        )
      `)
      .or(`requester_id.eq.${user?.id},addressee_id.eq.${user?.id}`)
      .order('created_at', { ascending: false });
    
    if (data) setFriendships(data as Friendship[]);
    setIsLoading(false);
  };

  const handleFriendRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: action === 'accept' ? "Friend request accepted!" : "Friend request declined",
        description: action === 'accept' 
          ? "You are now connected with this person." 
          : "The request has been declined.",
      });

      await fetchFriendships();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "Connection removed",
        description: "You are no longer connected with this person.",
      });

      await fetchFriendships();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getOtherUser = (friendship: Friendship): NetworkProfile => {
    return friendship.requester_id === user?.id ? friendship.addressee : friendship.requester;
  };

  const connections = friendships.filter(f => f.status === 'accepted');
  const pendingRequests = friendships.filter(f => 
    f.status === 'pending' && f.addressee_id === user?.id
  );
  const sentRequests = friendships.filter(f => 
    f.status === 'pending' && f.requester_id === user?.id
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile?.school_id) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              My Network
            </h1>
            <p className="text-muted-foreground">
              Manage your connections and friend requests
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{connections.length}</p>
                  <p className="text-sm text-muted-foreground">Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <UserCheck className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <UserX className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sentRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Sent Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Network Tabs */}
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">
              Connections ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-6">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-muted rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start building your network by finding and connecting with alumni.
                  </p>
                  <Button onClick={() => window.location.href = '/alumni'}>
                    Find Alumni
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {connections.map(friendship => {
                  const otherUser = getOtherUser(friendship);
                  
                  return (
                    <Card key={friendship.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={otherUser.avatar_url || ""} />
                            <AvatarFallback>
                              {getInitials(otherUser.first_name, otherUser.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {otherUser.first_name} {otherUser.last_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {otherUser.graduation_year && (
                                <Badge variant="outline" className="text-xs">
                                  Class of {otherUser.graduation_year}
                                </Badge>
                              )}
                              <Badge 
                                variant={otherUser.verification_status === 'verified' ? 'default' : 'secondary'}
                                className="text-xs capitalize"
                              >
                                {otherUser.verification_status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeFriend(friendship.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    You'll see friend requests from other alumni here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pendingRequests.map(friendship => {
                  const requester = friendship.requester;
                  
                  return (
                    <Card key={friendship.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={requester.avatar_url || ""} />
                            <AvatarFallback>
                              {getInitials(requester.first_name, requester.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {requester.first_name} {requester.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Wants to connect with you
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {requester.graduation_year && (
                                <Badge variant="outline" className="text-xs">
                                  Class of {requester.graduation_year}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => handleFriendRequest(friendship.id, 'accept')}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleFriendRequest(friendship.id, 'reject')}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            {sentRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sent requests</h3>
                  <p className="text-muted-foreground">
                    Friend requests you send will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {sentRequests.map(friendship => {
                  const addressee = friendship.addressee;
                  
                  return (
                    <Card key={friendship.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={addressee.avatar_url || ""} />
                            <AvatarFallback>
                              {getInitials(addressee.first_name, addressee.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {addressee.first_name} {addressee.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Request pending
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {addressee.graduation_year && (
                                <Badge variant="outline" className="text-xs">
                                  Class of {addressee.graduation_year}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Network;