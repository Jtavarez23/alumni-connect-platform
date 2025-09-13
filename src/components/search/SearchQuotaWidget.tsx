import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Crown, 
  Gift, 
  Timer,
  Zap,
  AlertTriangle
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface SearchQuotaWidgetProps {
  showUpgradeDialog?: boolean;
  compact?: boolean;
}

export const SearchQuotaWidget = ({ showUpgradeDialog = true, compact = false }: SearchQuotaWidgetProps) => {
  const { 
    isFreeTier, 
    isPremium,
    canSearch, 
    getSearchesRemaining, 
    searchQuota,
    FREE_DAILY_SEARCHES 
  } = useSubscription();

  const [timeToReset, setTimeToReset] = useState<string>("");

  useEffect(() => {
    // Calculate time to midnight for quota reset
    const updateTimeToReset = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeToReset(`${hours}h ${minutes}m`);
    };

    if (isFreeTier) {
      updateTimeToReset();
      const interval = setInterval(updateTimeToReset, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isFreeTier]);

  if (isPremium) {
    if (compact) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Unlimited
        </Badge>
      );
    }
    
    return null; // Premium users don't need to see quota
  }

  if (!searchQuota) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usedSearches = searchQuota.searches_used;
  const totalSearches = searchQuota.search_limit + searchQuota.earned_searches;
  const remainingSearches = getSearchesRemaining();
  const progressPercentage = (usedSearches / totalSearches) * 100;
  const isNearLimit = remainingSearches <= 1;
  const isAtLimit = remainingSearches === 0;

  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Badge 
            variant={isAtLimit ? "destructive" : isNearLimit ? "warning" : "outline"}
            className="flex items-center gap-1 cursor-pointer hover:bg-accent"
          >
            <Search className="h-3 w-3" />
            {remainingSearches}/{totalSearches}
          </Badge>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Daily Search Quota
            </DialogTitle>
          </DialogHeader>
          <SearchQuotaContent 
            searchQuota={searchQuota}
            remainingSearches={remainingSearches}
            totalSearches={totalSearches}
            progressPercentage={progressPercentage}
            timeToReset={timeToReset}
            isAtLimit={isAtLimit}
            showUpgradeDialog={showUpgradeDialog}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={isAtLimit ? "border-destructive" : isNearLimit ? "border-warning" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Daily Searches
          </div>
          {searchQuota.earned_searches > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              +{searchQuota.earned_searches} bonus
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SearchQuotaContent 
          searchQuota={searchQuota}
          remainingSearches={remainingSearches}
          totalSearches={totalSearches}
          progressPercentage={progressPercentage}
          timeToReset={timeToReset}
          isAtLimit={isAtLimit}
          showUpgradeDialog={showUpgradeDialog}
        />
      </CardContent>
    </Card>
  );
};

interface SearchQuotaContentProps {
  searchQuota: any;
  remainingSearches: number;
  totalSearches: number;
  progressPercentage: number;
  timeToReset: string;
  isAtLimit: boolean;
  showUpgradeDialog: boolean;
}

const SearchQuotaContent = ({
  searchQuota,
  remainingSearches,
  totalSearches,
  progressPercentage,
  timeToReset,
  isAtLimit,
  showUpgradeDialog
}: SearchQuotaContentProps) => {
  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Used</span>
          <span className="font-medium">
            {searchQuota.searches_used}/{totalSearches}
          </span>
        </div>
        <Progress 
          value={progressPercentage} 
          className={isAtLimit ? "bg-destructive/20" : ""}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{remainingSearches} remaining</span>
          {timeToReset && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Reset in {timeToReset}
            </span>
          )}
        </div>
      </div>

      {isAtLimit && (
        <div className="p-3 bg-destructive/10 rounded-lg">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Search limit reached</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your searches will reset at midnight, or upgrade for unlimited access.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          💡 <strong>Earn bonus searches:</strong>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• Suggest a classmate (+1 search)</div>
          <div>• Complete your profile (+1 search)</div>
          <div>• Join a group chat (+1 search)</div>
        </div>
      </div>

      {showUpgradeDialog && (
        <div className="pt-2 border-t">
          <Button className="w-full" size="sm">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade for Unlimited Searches
          </Button>
        </div>
      )}
    </>
  );
};

// Hook for using search functionality with quota enforcement
export const useSearchWithQuota = () => {
  const { canSearch, useSearch } = useSubscription();

  const performSearch = async (searchFunction: () => Promise<any>) => {
    if (!canSearch()) {
      toast.error("Daily search limit reached", {
        description: "Upgrade to Premium for unlimited searches or wait for your quota to reset."
      });
      return null;
    }

    const searchUsed = await useSearch();
    if (!searchUsed) {
      toast.error("Unable to perform search", {
        description: "Please try again later."
      });
      return null;
    }

    try {
      const result = await searchFunction();
      return result;
    } catch (error) {
      // If search fails, we don't consume the quota
      console.error('Search failed:', error);
      throw error;
    }
  };

  return { performSearch, canSearch };
};