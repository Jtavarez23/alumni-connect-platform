// Jobs Board Page
// Job discovery and application interface

import React, { useState } from 'react';
import { Plus, Search, Filter, MapPin, Briefcase, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobs, useSavedJobs } from '@/hooks/useJobs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AppLayout } from '@/components/layout/AppLayout';
import type { JobFilters } from '@/types/jobs';

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<JobFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: jobsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useJobs({ ...filters, search: searchQuery });

  const { data: savedJobs } = useSavedJobs();

  const allJobs = jobsData?.pages.flatMap(page => page.jobs) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Failed to load jobs</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <AppLayout title="Jobs">
      <div className="space-y-6 pb-20 md:pb-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Alumni Job Board</h1>
          <p className="text-muted-foreground">
            Discover career opportunities from your alumni network
          </p>
        </div>
        <Link to="/jobs/post">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Post Job
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search jobs by title, company, or skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Job Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Jobs ({allJobs.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedJobs?.length || 0})</TabsTrigger>
          <TabsTrigger value="remote">Remote Only</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <JobsGrid jobs={allJobs} />
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <JobsGrid jobs={savedJobs || []} />
        </TabsContent>

        <TabsContent value="remote" className="mt-6">
          <JobsGrid jobs={allJobs.filter(job => job.remote)} />
        </TabsContent>
      </Tabs>

      {/* Load More */}
      {hasNextPage && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              'Load More Jobs'
            )}
          </Button>
        </div>
      )}
      </div>
    </AppLayout>
  );
}

function JobsGrid({ jobs }: { jobs: any[] }) {
  if (jobs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

function JobCard({ job }: { job: any }) {
  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min && !max) return null;
    const formatter = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency,
      maximumFractionDigits: 0 
    });
    
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return formatter.format(min || max || 0);
  };

  return (
    <Link to={`/jobs/${job.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Company Logo / Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
            </div>

            {/* Job Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-muted-foreground">{job.company}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  {job.remote && (
                    <Badge variant="secondary">Remote</Badge>
                  )}
                  {job.is_featured && (
                    <Badge variant="default">Featured</Badge>
                  )}
                </div>
              </div>

              {job.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {job.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="capitalize">{job.job_type.replace('-', ' ')}</span>
                </div>

                {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {job.experience_level.replace('-', ' ')} Level
                </Badge>
                {job.posted_by_name && (
                  <Badge variant="outline" className="text-xs">
                    Posted by {job.posted_by_name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex-shrink-0 self-center">
              <Button size="sm">
                {job.has_applied ? 'Applied' : 'View Job'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No jobs found</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Be the first to post a job opportunity for your fellow alumni!
      </p>
      <Link to="/jobs/post">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Post First Job
        </Button>
      </Link>
    </div>
  );
}