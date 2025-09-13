import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Linkedin, 
  Instagram, 
  Facebook,
  Shield,
  Crown,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface OAuthProvider {
  name: string;
  icon: typeof Linkedin;
  color: string;
  bgColor: string;
  description: string;
  features: string[];
  available: boolean;
  comingSoon?: boolean;
}

const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Import your professional profile and connections',
    features: [
      'Auto-import education history',
      'Find classmates through LinkedIn connections',
      'Verify employment information',
      'Import profile photo and bio'
    ],
    available: true,
    comingSoon: false
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    description: 'Share your visual memories and find classmates',
    features: [
      'Import profile photo',
      'Share yearbook-era photos',
      'Find classmates through followers',
      'Cross-post memories'
    ],
    available: false,
    comingSoon: true
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    description: 'Connect through your existing Facebook network',
    features: [
      'Import education and location',
      'Find mutual friends who are classmates',
      'Import photos and memories',
      'Sync with Facebook events'
    ],
    available: false,
    comingSoon: true
  }
};

interface SocialOAuthFlowProps {
  onSuccess?: () => void;
}

export const SocialOAuthFlow = ({ onSuccess }: SocialOAuthFlowProps) => {
  const { user } = useAuth();
  const { isPremium, hasFeatureAccess } = useSubscription();
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleOAuthConnect = async (provider: string) => {
    if (!OAUTH_PROVIDERS[provider].available) {
      toast.info(`${OAUTH_PROVIDERS[provider].name} integration coming soon!`);
      return;
    }

    setConnecting(provider);
    
    try {
      // This would implement the actual OAuth flow
      // For now, we'll simulate the process
      
      // Step 1: Redirect to OAuth provider
      const redirectUrl = `${window.location.origin}/auth/callback/${provider}`;
      const oauthUrl = buildOAuthUrl(provider, redirectUrl);
      
      // In a real implementation, you would:
      // window.location.href = oauthUrl;
      
      // For demo purposes, we'll simulate success after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Successfully connected to ${OAUTH_PROVIDERS[provider].name}!`);
      onSuccess?.();
      
    } catch (error) {
      console.error(`Error connecting to ${provider}:`, error);
      toast.error(`Failed to connect to ${OAUTH_PROVIDERS[provider].name}`);
    } finally {
      setConnecting(null);
    }
  };

  const buildOAuthUrl = (provider: string, redirectUrl: string): string => {
    // This would build the actual OAuth URLs for each provider
    const baseUrls = {
      linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
      instagram: 'https://api.instagram.com/oauth/authorize',
      facebook: 'https://www.facebook.com/v18.0/dialog/oauth'
    };

    const params = new URLSearchParams({
      client_id: process.env.VITE_OAUTH_CLIENT_ID || 'demo_client_id',
      redirect_uri: redirectUrl,
      scope: getOAuthScope(provider),
      response_type: 'code',
      state: generateStateParameter()
    });

    return `${baseUrls[provider as keyof typeof baseUrls]}?${params}`;
  };

  const getOAuthScope = (provider: string): string => {
    const scopes = {
      linkedin: 'r_liteprofile r_emailaddress',
      instagram: 'user_profile user_media',
      facebook: 'public_profile email user_education_history'
    };

    return scopes[provider as keyof typeof scopes] || '';
  };

  const generateStateParameter = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          OAuth Social Integration
          <Badge variant="secondary">Enhanced</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your social media accounts for automatic profile enhancement and classmate discovery
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPremium && (
          <Alert>
            <Crown className="h-4 w-4" />
            <AlertDescription>
              OAuth social integration requires Premium. Manual social links are available for free users.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {Object.entries(OAUTH_PROVIDERS).map(([key, provider]) => {
            const Icon = provider.icon;
            const isConnecting = connecting === key;
            const canConnect = isPremium && hasFeatureAccess('verified_social_links');

            return (
              <div 
                key={key}
                className={`p-4 rounded-lg border ${provider.bgColor} border-opacity-50`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-full bg-white`}>
                      <Icon className={`h-6 w-6 ${provider.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{provider.name}</h3>
                        {provider.comingSoon && (
                          <Badge variant="outline">Coming Soon</Badge>
                        )}
                        {provider.available && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {provider.description}
                      </p>
                      <div className="space-y-1">
                        {provider.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Button
                      onClick={() => handleOAuthConnect(key)}
                      disabled={!canConnect || isConnecting || !provider.available}
                      loading={isConnecting}
                      size="sm"
                      className="min-w-[100px]"
                    >
                      {isConnecting ? (
                        'Connecting...'
                      ) : provider.available ? (
                        'Connect'
                      ) : (
                        'Coming Soon'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Privacy Notice:</strong> We only import publicly available information and 
            data you explicitly permit. You can disconnect at any time and control what 
            information is shared with your classmates.
          </AlertDescription>
        </Alert>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Don't see your preferred platform? 
            <a href="/feedback" className="text-primary hover:underline ml-1">
              Let us know
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};