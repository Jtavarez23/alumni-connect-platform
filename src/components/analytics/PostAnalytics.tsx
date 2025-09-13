import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../hooks/useSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface PostAnalyticsProps {
  postId: string;
  className?: string;
}

interface AnalyticsData {
  post_id: string;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_views: number;
  total_clicks: number;
  engagement_rate: number;
  reach_count: number;
  avg_view_duration: number;
  top_engagement_hours: string[];
  click_breakdown: {
    links: number;
    media: number;
    profiles: number;
  };
}

interface TimelineData {
  time_period: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  total_engagement: number;
}

export function PostAnalytics({ postId, className }: PostAnalyticsProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch post analytics
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_post_analytics', { 
            p_post_id: postId,
            p_time_range: '7 days' 
          });
          
        if (analyticsError) throw analyticsError;
        
        if (analyticsData && analyticsData.length > 0) {
          setAnalytics(analyticsData[0]);
        }
        
        // Fetch engagement timeline
        const { data: timelineData, error: timelineError } = await supabase
          .rpc('get_post_engagement_timeline', { 
            p_post_id: postId,
            p_granularity: 'hour' 
          });
          
        if (timelineError) throw timelineError;
        
        if (timelineData) {
          setTimeline(timelineData);
        }
        
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [postId, user, supabase]);

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>Error loading analytics: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No analytics data available for this post yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metricCards = [
    { title: 'Views', value: analytics.total_views, change: '+12%', icon: '👁️' },
    { title: 'Likes', value: analytics.total_likes, change: '+8%', icon: '❤️' },
    { title: 'Comments', value: analytics.total_comments, change: '+5%', icon: '💬' },
    { title: 'Shares', value: analytics.total_shares, change: '+15%', icon: '↗️' },
    { title: 'Engagement Rate', value: `${analytics.engagement_rate}%`, change: '+3%', icon: '📊' },
    { title: 'Avg. View Duration', value: `${analytics.avg_view_duration}s`, change: '+2s', icon: '⏱️' },
    { title: 'Reach', value: analytics.reach_count, change: '+10%', icon: '🌐' },
    { title: 'Total Clicks', value: analytics.total_clicks, change: '+7%', icon: '🖱️' },
  ];

  const engagementData = timeline.map(item => ({
    time: new Date(item.time_period).toLocaleTimeString([], { hour: '2-digit' }),
    likes: item.likes,
    comments: item.comments,
    shares: item.shares,
    total: item.total_engagement
  }));

  const clickBreakdownData = [
    { name: 'Links', value: analytics.click_breakdown.links },
    { name: 'Media', value: analytics.click_breakdown.media },
    { name: 'Profiles', value: analytics.click_breakdown.profiles },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metricCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-green-600">{card.change}</p>
                </div>
                <span className="text-2xl">{card.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Timeline</CardTitle>
            <CardDescription>Post engagement over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Click Breakdown</CardTitle>
            <CardDescription>Distribution of clicks by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clickBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {analytics.top_engagement_hours && analytics.top_engagement_hours.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Peak Engagement Hours</CardTitle>
            <CardDescription>Best times for engagement based on your audience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analytics.top_engagement_hours.map((hour, index) => (
                <div key={index} className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{hour}</p>
                  <p className="text-sm text-muted-foreground">
                    {index === 0 ? 'Most Engaged' : index === 1 ? '2nd Best' : '3rd Best'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}