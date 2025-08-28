import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";
import { MessageDialog } from "@/components/messaging/MessageDialog";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import SchoolSwitcher from "@/components/dashboard/SchoolSwitcher";
import { 
  ArrowLeft, 
  MessageCircle, 
  Check, 
  X, 
  Clock, 
  Users, 
  UserPlus,
  MapPin,
  Calendar,
  GraduationCap,
  Shield,
  Crown
} from "lucide-react";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  school_id?: string;
  graduation_year?: number;
  verification_status: string;
  schools?: {
    name: string;
    type: string;
    location: any;
  };
  school_history?: Array<{
    school_id: string;
    start_year: number;
    end_year?: number;
    school?: {
      name: string;
      type: string;
      location: any;
    };
  }>;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  verification_method?: string;
  requester?: Profile;
  addressee?: Profile;
}

const Network = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { schoolHistory } = useSchoolHistory();
  const { isFreeTier, isPremium, canNetworkWithUser, getNetworkableSchools } = useSubscription();
  const [connections, setConnections] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [contextSchool, setContextSchool] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadFriendships();
    }
  }, [user]);

  const loadFriendships = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(
            id, first_name, last_name, email, avatar_url, school_id, graduation_year, verification_status,
            schools(name, type, location),
            school_history(
              school_id,
              start_year,
              end_year,
              school:schools(name, type, location)
            )
          ),
          addressee:profiles!friendships_addressee_id_fkey(
            id, first_name, last_name, email, avatar_url, school_id, graduation_year, verification_status,
            schools(name, type, location),
            school_history(
              school_id,
              start_year,
              end_year,
              school:schools(name, type, location)
            )
          )
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter friendships based on subscription restrictions
      const filteredData = data.filter(friendship => {
        const otherProfile = getOtherProfile(friendship);
        if (!otherProfile) return false;
        
        // For free users, only show connections they can actually network with
        if (isFreeTier) {
          return canNetworkWithUser(otherProfile);
        }
        
        return true;
      });

      const accepted = filteredData.filter(f => f.status === 'accepted');
      const pending = filteredData.filter(f => f.status === 'pending' && f.addressee_id === user.id);
      const sent = filteredData.filter(f => f.status === 'pending' && f.requester_id === user.id);

      setConnections(accepted);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (error) {
      console.error('Error loading friendships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string, requesterId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;

      // Send notification to requester
      await createNotification({
        user_id: requesterId,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${profile?.first_name} ${profile?.last_name} accepted your friend request`,
        related_user_id: user?.id
      });

      await loadFriendships();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;
      await loadFriendships();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getOtherProfile = (friendship: Friendship): Profile | null => {
    if (!user) return null;
    
    if (friendship.requester_id === user.id) {
      return friendship.addressee || null;
    } else {
      return friendship.requester || null;
    }
  };

  const handleOpenMessage = (profile: Profile) => {
    setSelectedUser(profile);
    setMessageDialogOpen(true);
  };

  const renderConnectionCard = (friendship: Friendship) => {
    const otherProfile = getOtherProfile(friendship);
    if (!otherProfile) return null;

    return (
      <Card key={friendship.id} className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={otherProfile.avatar_url} />
            <AvatarFallback>
              {getInitials(otherProfile.first_name, otherProfile.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">
              {otherProfile.first_name} {otherProfile.last_name}
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {otherProfile.schools && (
                <>
                  <GraduationCap className="h-3 w-3" />
                  <span className="truncate">{otherProfile.schools.name}</span>
                </>
              )}
              {otherProfile.graduation_year && (
                <>
                  <Calendar className="h-3 w-3 ml-2" />
                  <span>{otherProfile.graduation_year}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={otherProfile.verification_status === 'verified' ? 'default' : 'secondary'}>
              {otherProfile.verification_status === 'verified' && <Shield className="h-3 w-3 mr-1" />}
              {otherProfile.verification_status}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleOpenMessage(otherProfile)}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const renderRequestCard = (friendship: Friendship, showActions: boolean = false) => {
    const otherProfile = getOtherProfile(friendship);
    if (!otherProfile) return null;

    return (
      <Card key={friendship.id} className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={otherProfile.avatar_url} />
            <AvatarFallback>
              {getInitials(otherProfile.first_name, otherProfile.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">
              {otherProfile.first_name} {otherProfile.last_name}
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {otherProfile.schools && (
                <>
                  <GraduationCap className="h-3 w-3" />
                  <span className="truncate">{otherProfile.schools.name}</span>
                </>
              )}
              {otherProfile.graduation_year && (
                <>
                  <Calendar className="h-3 w-3 ml-2" />
                  <span>{otherProfile.graduation_year}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showActions ? (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleAcceptRequest(friendship.id, friendship.requester_id)}
                  className="bg-success hover:bg-success/90"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRejectRequest(friendship.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Pending</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <AppLayout title="My Network">
      <div className="p-6">
        {/* Subscription Status Banner */}
        {isFreeTier && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-full">
                    <Crown className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warning-foreground">Free Tier Network</h3>
                    <p className="text-sm text-muted-foreground">
                      Your network is limited to alumni from your graduation year. Upgrade to connect with alumni from all years.
                    </p>
                  </div>
                </div>
                <UpgradePrompt compact onUpgrade={() => navigate('/settings')} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* School Context Switcher */}
        <div className="mb-6">
          <SchoolSwitcher 
            selectedSchool={contextSchool}
            onSchoolSelect={setContextSchool}
          />
        </div>

        {/* Network Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{connections.length}</p>
                  <p className="text-sm text-muted-foreground">Connections</p>
                  {isFreeTier && (
                    <p className="text-xs text-warning">Same year only</p>
                  )}
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
                <UserPlus className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{sentRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Sent Requests</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
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
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isFreeTier 
                    ? "Start connecting with alumni from your graduation year"
                    : "Start connecting with alumni from your school"
                  }
                </p>
                <Button onClick={() => navigate('/alumni')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Find Alumni
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map(renderConnectionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground">
                  You don't have any friend requests at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(friendship => renderRequestCard(friendship, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sent requests</h3>
                <p className="text-muted-foreground">
                  You haven't sent any friend requests yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map(friendship => renderRequestCard(friendship, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Premium Upgrade Prompt */}
        {isFreeTier && (connections.length > 0 || pendingRequests.length > 0 || sentRequests.length > 0) && (
          <div className="mt-8">
            <UpgradePrompt 
              feature="unlimited cross-year networking"
              onUpgrade={() => navigate('/settings')}
            />
          </div>
        )}
      </div>

      {/* Message Dialog */}
      {selectedUser && (
        <MessageDialog
          isOpen={messageDialogOpen}
          onClose={() => {
            setMessageDialogOpen(false);
            setSelectedUser(null);
          }}
          otherUser={selectedUser}
        />
      )}
    </AppLayout>
  );
};

export default Network;