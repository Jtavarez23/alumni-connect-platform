import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Linkedin, 
  Instagram, 
  Facebook,
  Twitter,
  ExternalLink,
  Shield,
  Crown,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SocialConnection {
  id: string;
  platform: 'linkedin' | 'instagram' | 'facebook' | 'twitter';
  platform_username: string;
  platform_url: string;
  verification_status: 'unverified' | 'pending' | 'verified';
  is_premium_verified: boolean;
  created_at: string;
}

const PLATFORM_CONFIGS = {
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    placeholder: 'your-linkedin-username',
    urlPattern: 'https://linkedin.com/in/',
    description: 'Professional networking'
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    placeholder: 'your_instagram_handle',
    urlPattern: 'https://instagram.com/',
    description: 'Photo sharing'
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    placeholder: 'your.facebook.username',
    urlPattern: 'https://facebook.com/',
    description: 'Social networking'
  },
  twitter: {
    name: 'Twitter/X',
    icon: Twitter,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    placeholder: 'your_twitter_handle',
    urlPattern: 'https://twitter.com/',
    description: 'Microblogging'
  }
};

export const SocialMediaIntegration = () => {
  const { user } = useAuth();
  const { isPremium, hasFeatureAccess } = useSubscription();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof PLATFORM_CONFIGS>('linkedin');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching social connections:', error);
      toast.error('Failed to load social connections');
    } finally {
      setLoading(false);
    }
  };

  const addConnection = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setSubmitting(true);
    try {
      const config = PLATFORM_CONFIGS[selectedPlatform];
      const platformUrl = `${config.urlPattern}${username}`;

      const { error } = await supabase
        .from('social_connections')
        .insert({
          user_id: user!.id,
          platform: selectedPlatform,
          platform_username: username.trim(),
          platform_url: platformUrl,
          verification_status: 'unverified',
          is_premium_verified: isPremium
        });

      if (error) throw error;

      toast.success(`${config.name} connection added successfully!`);
      setDialogOpen(false);
      setUsername('');
      fetchConnections();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('You already have a connection for this platform');
      } else {
        toast.error('Failed to add social connection');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const removeConnection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('social_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Social connection removed');
      fetchConnections();
    } catch (error) {
      toast.error('Failed to remove connection');
    }
  };

  const getVerificationStatus = (connection: SocialConnection) => {
    if (connection.is_premium_verified && connection.verification_status === 'verified') {
      return {
        icon: Shield,
        text: 'Premium Verified',
        variant: 'default' as const,
        color: 'text-green-600'
      };
    }
    
    switch (connection.verification_status) {
      case 'verified':
        return {
          icon: CheckCircle,
          text: 'Verified',
          variant: 'secondary' as const,
          color: 'text-green-600'
        };
      case 'pending':
        return {
          icon: AlertTriangle,
          text: 'Pending',
          variant: 'warning' as const,
          color: 'text-yellow-600'
        };
      default:
        return {
          icon: AlertTriangle,
          text: 'Unverified',
          variant: 'outline' as const,
          color: 'text-gray-600'
        };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Social Media Connections
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your social profiles to help classmates find you
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Platform
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Social Media Connection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(PLATFORM_CONFIGS).map(([key, config]) => {
                      const Icon = config.icon;
                      const isSelected = selectedPlatform === key;
                      const isConnected = connections.some(c => c.platform === key);
                      
                      return (
                        <Button
                          key={key}
                          variant={isSelected ? "default" : "outline"}
                          className={`justify-start ${isConnected ? 'opacity-50' : ''}`}
                          onClick={() => setSelectedPlatform(key as keyof typeof PLATFORM_CONFIGS)}
                          disabled={isConnected}
                        >
                          <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                          {config.name}
                          {isConnected && <Badge variant="secondary" className="ml-auto">Connected</Badge>}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-muted-foreground mr-2">
                      {PLATFORM_CONFIGS[selectedPlatform].urlPattern}
                    </span>
                    <Input
                      id="username"
                      placeholder={PLATFORM_CONFIGS[selectedPlatform].placeholder}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {PLATFORM_CONFIGS[selectedPlatform].description}
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addConnection} disabled={submitting || !username.trim()}>
                    {submitting ? 'Adding...' : 'Add Connection'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!isPremium && (
          <Alert className="mb-4">
            <Crown className="h-4 w-4" />
            <AlertDescription>
              Free users can add social links but won't get verified badges. 
              Upgrade to Premium for verification and enhanced discovery.
            </AlertDescription>
          </Alert>
        )}

        {connections.length === 0 ? (
          <div className="text-center py-8">
            <ExternalLink className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No social connections yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your social media profiles to help classmates connect with you outside the platform.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Connection
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => {
              const config = PLATFORM_CONFIGS[connection.platform];
              const Icon = config.icon;
              const status = getVerificationStatus(connection);
              const StatusIcon = status.icon;

              return (
                <div 
                  key={connection.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${config.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.name}</span>
                        <Badge variant={status.variant} className="flex items-center gap-1">
                          <StatusIcon className={`h-3 w-3 ${status.color}`} />
                          {status.text}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>@{connection.platform_username}</span>
                        <a 
                          href={connection.platform_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeConnection(connection.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {hasFeatureAccess('verified_social_links') && connections.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Premium Verification Available</span>
            </div>
            <p className="text-blue-700 text-xs mt-1">
              Your social links can be verified for authenticity. This helps classmates trust your connections.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};