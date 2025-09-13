import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../hooks/useSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UserAnalyticsProps {
  className?: string;
}

interface UserAnalyticsData {
  total_posts: number;
  total_likes_received: number;
  total_comments_received: number;
  total_shares_received: number;
  total_views_received: number;
  avg_engagement_rate: number;
  best_performing_post_id: string;
  top_engagement_types: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function UserAnalytics({ className }: UserAnalyticsProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7 days' | '30 days' | '90 days'>('30 days');

  useEffect(() => {
    if (!user) return;
    
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        const { data, error: analyticsError } = await supabase
          .rpc('get_user_analytics_overview', { 
            p_time_range: timeRange 
          });
          
        if (analyticsError) throw analyticsError;
        
        if (data && data.length > 0) {
          setAnalytics(data[0]);
        }
        
      } catch (err) {
        console.error('Error fetching user analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, supabase, timeRange]);

  if (loading) {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Analytics Overview</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
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
            <p>No analytics data available yet. Start posting to see your insights!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overviewCards = [
    { 
      title: 'Total Posts', 
      value: analytics.total_posts, 
      icon: '📝',
      description: 'Posts created'
    },
    { 
      title: 'Likes Received', 
      value: analytics.total_likes_received, 
      icon: '❤️',
      description: 'Total likes'
    },
    { 
      title: 'Comments Received', 
      value: analytics.total_comments_received, 
      icon: '💬',
      description: 'Total comments'
    },
    { 
      title: 'Engagement Rate', 
      value: `${analytics.avg_engagement_rate.toFixed(1)}%`, 
      icon: '📊',
      description: 'Average engagement'
    },
  ];

  const engagementData = [
    { name: 'Likes', value: analytics.top_engagement_types.likes },
    { name: 'Comments', value: analytics.top_engagement_types.comments },
    { name: 'Shares', value: analytics.top_engagement_types.shares },
    { name: 'Views', value: analytics.top_engagement_types.views },
  ];

  const performanceData = [
    { metric: 'Likes', value: analytics.top_engagement_types.likes, max: Math.max(
      analytics.top_engagement_types.likes,
      analytics.top_engagement_types.comments,
      analytics.top_engagement_types.shares,
      analytics.top_engagement_types.views
    )},
    { metric: 'Comments', value: analytics.top_engagement_types.comments, max: Math.max(
      analytics.top_engagement_types.likes,
      analytics.top_engagement_types.comments,
      analytics.top_engagement_types.shares,
      analytics.top_engagement_types.views
    )},
    { metric: 'Shares', value: analytics.top_engagement_types.shares, max: Math.max(
      analytics.top_engagement_types.likes,
      analytics.top_engagement_types.comments,
      analytics.top_engagement_types.shares,
      analytics.top_engagement_types.views
    )},
    { metric: 'Views', value: analytics.top_engagement_types.views, max: Math.max(
      analytics.top_engagement_types.likes,
      analytics.top_engagement_types.comments,
      analytics.top_engagement_types.shares,
      analytics.top_engagement_types.views
    )},
  ];

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Analytics Overview</h2>
        
        <div className="flex space-x-2">
          {(['7 days', '30 days', '90 days'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {overviewCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
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
            <CardTitle>Engagement Distribution</CardTitle>
            <CardDescription>How your audience engages with your content</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} engagements`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Comparison of different engagement types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} engagements`, '']} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {analytics.best_performing_post_id && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Top Performing Post</CardTitle>
            <CardDescription>Your post with the highest engagement rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Post ID: {analytics.best_performing_post_id}</p>
              <p className="text-lg font-semibold mt-2">
                Engagement Rate: {analytics.avg_engagement_rate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This post received the highest engagement relative to its reach.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}