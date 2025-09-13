import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MessageSquare, 
  Crown, 
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessagingRestrictionsProps {
  recipientId?: string;
  recipientName?: string;
  onCanMessage?: (canMessage: boolean) => void;
}

interface MessagePermission {
  can_message: boolean;
  reason: string;
  expires_at?: string;
}

export const MessagingRestrictions = ({ 
  recipientId, 
  recipientName,
  onCanMessage 
}: MessagingRestrictionsProps) => {
  const { isFreeTier, isPremium, canSendMessage } = useSubscription();
  const { user } = useAuth();
  const [messagePermission, setMessagePermission] = useState<MessagePermission | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (recipientId && user) {
      checkMessagingPermission();
    }
    if (isFreeTier) {
      fetchPendingRequests();
    }
  }, [recipientId, user, isFreeTier]);

  const checkMessagingPermission = async () => {
    if (!recipientId || !user) return;
    
    setLoading(true);
    try {
      const canMessage = await canSendMessage(recipientId);
      
      // Get detailed permission info
      const { data: permissionData } = await supabase
        .from('messaging_permissions')
        .select('*')
        .eq('sender_id', user.id)
        .eq('recipient_id', recipientId)
        .single();

      const permission: MessagePermission = {
        can_message: canMessage,
        reason: permissionData?.reason || (canMessage ? 'allowed' : 'restricted'),
        expires_at: permissionData?.expires_at
      };

      setMessagePermission(permission);
      onCanMessage?.(canMessage);
    } catch (error) {
      console.error('Error checking messaging permission:', error);
      setMessagePermission({
        can_message: false,
        reason: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      // Count recent message requests that haven't been replied to
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .is('reply_to_id', null); // Initial messages, not replies

      setPendingRequests(count || 0);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const requestConnection = async () => {
    if (!recipientId || !user) return;

    try {
      // Create a connection request
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: recipientId,
          status: 'pending',
          verification_method: 'peer'
        });

      if (error) throw error;

      toast.success("Connection request sent!", {
        description: "You'll be able to message them if they accept your request."
      });

      // Refresh permissions
      checkMessagingPermission();
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        toast.info("Request already sent", {
          description: "You've already sent a connection request to this person."
        });
      } else {
        toast.error("Failed to send connection request");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Premium users - no restrictions
  if (isPremium) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-green-800">You can message anyone with Premium</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Premium
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  // Show restrictions for free users
  if (!messagePermission?.can_message) {
    return (
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messaging Restrictions
            </div>
            <Badge variant="outline">Free Tier</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {getRestrictionMessage(messagePermission?.reason)}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="text-sm font-medium">Ways to message {recipientName}:</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <UserPlus className="h-3 w-3" />
                <span>Send a connection request</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-3 w-3" />
                <span>Upgrade to Premium</span>
              </div>
            </div>
          </div>

          {isFreeTier && pendingRequests >= 5 && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You have {pendingRequests} pending message requests. 
                Wait for replies or upgrade for unlimited messaging.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={requestConnection} 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Send Connection Request
            </Button>
            <Button size="sm" className="flex-1 text-xs">
              <Crown className="h-4 w-4 mr-1" />
              <span className="truncate">Upgrade to Premium</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User can message - show permission reason
  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-green-800">
          {getPermissionMessage(messagePermission.reason)}
        </span>
        {messagePermission.expires_at && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Expires {new Date(messagePermission.expires_at).toLocaleDateString()}
          </Badge>
        )}
      </AlertDescription>
    </Alert>
  );
};

const getRestrictionMessage = (reason?: string) => {
  switch (reason) {
    case 'not_in_network':
      return "You can only message people from your school and graduation years.";
    case 'no_permission':
      return "Send a connection request to start messaging.";
    case 'request_limit_reached':
      return "You've reached your daily message request limit.";
    default:
      return "You need to connect with this person first or upgrade to Premium.";
  }
};

const getPermissionMessage = (reason: string) => {
  switch (reason) {
    case 'in_network':
      return "You can message - same school and years";
    case 'mutual_connection':
      return "You can message - connected classmates";
    case 'same_school_year':
      return "You can message - same graduation year";
    case 'premium_user':
      return "You can message with Premium";
    default:
      return "You can send messages";
  }
};

// Component for displaying general messaging limits
export const MessagingLimitsWidget = () => {
  const { isFreeTier, FREE_MESSAGE_LIMIT } = useSubscription();
  const { user } = useAuth();
  const [todayRequests, setTodayRequests] = useState(0);

  useEffect(() => {
    if (isFreeTier && user) {
      fetchTodayRequests();
    }
  }, [isFreeTier, user]);

  const fetchTodayRequests = async () => {
    if (!user) return;

    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .gte('created_at', new Date().toDateString());

      setTodayRequests(count || 0);
    } catch (error) {
      console.error('Error fetching today requests:', error);
    }
  };

  if (!isFreeTier) return null;

  const remaining = Math.max(0, FREE_MESSAGE_LIMIT - todayRequests);
  const isNearLimit = remaining <= 1;

  return (
    <Card className={isNearLimit ? "border-warning" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Daily Message Requests
          </div>
          <Badge variant="outline">
            {todayRequests}/{FREE_MESSAGE_LIMIT}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          You can send up to {FREE_MESSAGE_LIMIT} new message requests per day.
        </div>
        
        {remaining === 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Daily limit reached. Upgrade for unlimited messaging.
            </AlertDescription>
          </Alert>
        )}

        <Button variant="outline" size="sm" className="w-full text-xs">
          <Crown className="h-4 w-4 mr-1" />
          <span className="truncate">Upgrade for Unlimited Messaging</span>
        </Button>
      </CardContent>
    </Card>
  );
};