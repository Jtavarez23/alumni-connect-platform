import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Check } from "lucide-react";

interface UpgradePromptProps {
  onUpgrade?: () => void;
  feature?: string;
  compact?: boolean;
}

export const UpgradePrompt = ({ onUpgrade, feature = "this feature", compact = false }: UpgradePromptProps) => {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
        <div className="flex items-center space-x-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Upgrade to Premium to unlock {feature}</span>
        </div>
        <Button size="sm" onClick={onUpgrade}>
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 w-fit">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          Upgrade to Premium
          <Badge variant="secondary" className="bg-gradient-to-r from-primary to-secondary text-white">
            <Zap className="h-3 w-3 mr-1" />
            Popular
          </Badge>
        </CardTitle>
        <CardDescription>
          Unlock unlimited schools and premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm">Unlimited school history</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm">Advanced search and filters</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm">Priority verification</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm">Exclusive networking features</span>
          </div>
        </div>
        <Button 
          className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90" 
          onClick={onUpgrade}
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade for $5/month
        </Button>
      </CardContent>
    </Card>
  );
};