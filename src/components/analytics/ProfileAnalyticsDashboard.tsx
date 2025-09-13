import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  Users, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Crown,
  MessageSquare,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ProfileAnalytics {
  total_views: number;
  this_week_views: number;
  this_month_views: number;
  unique_viewers: number;
  top_contexts: Array<{
    view_context: string;
    count: number;
  }>;
}

interface ViewerData {
  id: string;
  viewer_profile: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  viewed_at: string;
  view_context: string;
}

interface AnalyticsChartData {
  date: string;
  views: number;
  unique_viewers: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ProfileAnalyticsDashboard = () => {
  const { user } = useAuth();
  const { isPremium, isEnterprise } = useSubscription();
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [recentViewers, setRecentViewers] = useState<ViewerData[]>([]);
  const [chartData, setChartData] = useState<AnalyticsChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const canViewAnalytics = isPremium || isEnterprise;

  useEffect(() => {
    if (canViewAnalytics && user) {
      fetchAnalytics();
    }
  }, [canViewAnalytics, user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get profile analytics
      const { data: analyticsData } = await supabase
        .rpc('get_profile_analytics', { p_user_id: user!.id });
      
      if (analyticsData) {
        setAnalytics(analyticsData);
      }

      // Get recent viewers
      const { data: viewersData } = await supabase
        .from('profile_views')
        .select(`
          id,
          viewed_at,
          view_context,
          viewer:viewer_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('viewed_id', user!.id)
        .order('viewed_at', { ascending: false })
        .limit(20);

      if (viewersData) {
        const formattedViewers = viewersData.map(view => ({
          id: view.id,
          viewer_profile: view.viewer as any,
          viewed_at: view.viewed_at,
          view_context: view.view_context
        }));
        setRecentViewers(formattedViewers);
      }

      // Get chart data for last 30 days
      const { data: chartData } = await supabase
        .from('profile_views')
        .select('viewed_at, viewer_id')
        .eq('viewed_id', user!.id)
        .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('viewed_at');

      if (chartData) {
        // Group by date
        const dateMap = new Map<string, { views: number; viewers: Set<string> }>();
        
        chartData.forEach(view => {
          const date = new Date(view.viewed_at).toISOString().split('T')[0];
          if (!dateMap.has(date)) {
            dateMap.set(date, { views: 0, viewers: new Set() });
          }
          const data = dateMap.get(date)!;
          data.views++;
          data.viewers.add(view.viewer_id);
        });

        const formattedChartData: AnalyticsChartData[] = Array.from(dateMap.entries()).map(([date, data]) => ({
          date,
          views: data.views,
          unique_viewers: data.viewers.size
        })).sort((a, b) => a.date.localeCompare(b.date));

        setChartData(formattedChartData);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatViewContext = (context: string) => {
    return context.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getViewContextIcon = (context: string) => {
    switch (context) {
      case 'search': return <Users className="h-4 w-4" />;
      case 'yearbook': return <Calendar className="h-4 w-4" />;
      case 'group': return <MessageSquare className="h-4 w-4" />;
      case 'suggestion': return <UserPlus className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  if (!canViewAnalytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
          <p className="text-muted-foreground mb-4">
            Profile analytics are available for Premium and Enterprise users only.
          </p>
          <Button>Upgrade to Premium</Button>
        </CardContent>
      </Card>
    );
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profile Analytics</h2>
          <p className="text-muted-foreground">
            See who's viewing your profile and how you're discovered
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Crown className="h-4 w-4" />
          Premium Feature
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_views || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.this_week_views || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.this_month_views || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Viewers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.unique_viewers || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="viewers">Recent Viewers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Views Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                      name="Total Views"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="unique_viewers" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.3}
                      name="Unique Viewers"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for the last 30 days
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discovery" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Discovery Sources</CardTitle>
                <p className="text-sm text-muted-foreground">
                  How people find your profile
                </p>
              </CardHeader>
              <CardContent>
                {analytics?.top_contexts && analytics.top_contexts.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.top_contexts.map((context, index) => (
                      <div key={context.view_context} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getViewContextIcon(context.view_context)}
                          <span className="font-medium">
                            {formatViewContext(context.view_context)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(context.count / (analytics.total_views || 1)) * 100} 
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground min-w-[3ch]">
                            {context.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No discovery data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discovery Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.top_contexts && analytics.top_contexts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={analytics.top_contexts}
                        dataKey="count"
                        nameKey="view_context"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {analytics.top_contexts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, formatViewContext(name as string)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data to display
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="viewers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Profile Visitors</CardTitle>
              <p className="text-sm text-muted-foreground">
                People who viewed your profile recently
              </p>
            </CardHeader>
            <CardContent>
              {recentViewers.length > 0 ? (
                <div className="space-y-3">
                  {recentViewers.map((viewer) => (
                    <div key={viewer.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {viewer.viewer_profile.avatar_url ? (
                            <img 
                              src={viewer.viewer_profile.avatar_url} 
                              alt="Profile" 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {viewer.viewer_profile.first_name?.[0]}
                              {viewer.viewer_profile.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {viewer.viewer_profile.first_name} {viewer.viewer_profile.last_name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getViewContextIcon(viewer.view_context)}
                            <span>{formatViewContext(viewer.view_context)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(viewer.viewed_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent visitors
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};