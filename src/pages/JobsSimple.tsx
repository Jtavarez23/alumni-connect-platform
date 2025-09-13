// Jobs Page - Simplified Version
import React, { useState } from 'react';
import { Plus, Search, Filter, MapPin, Briefcase, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for now since database RPC functions don't exist yet
  const mockJobs = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      company: 'TechCorp Alumni',
      location: 'San Francisco, CA',
      job_type: 'full-time',
      remote: true,
      salary_min: 120000,
      salary_max: 180000,
      posted_at: '2024-07-10T09:00:00Z',
      description: 'Join our growing team of alumni building the next generation of software.',
    },
    {
      id: '2',
      title: 'Marketing Manager', 
      company: 'StartupX',
      location: 'Austin, TX',
      job_type: 'full-time',
      remote: false,
      salary_min: 70000,
      salary_max: 90000,
      posted_at: '2024-07-12T14:30:00Z',
      description: 'Lead marketing initiatives for our fast-growing startup.',
    },
    {
      id: '3',
      title: 'Freelance Designer',
      company: 'Creative Agency',
      location: 'Remote',
      job_type: 'contract',
      remote: true,
      salary_min: 50,
      salary_max: 75,
      posted_at: '2024-07-13T11:15:00Z',
      description: 'Create stunning designs for our diverse client base.',
    }
  ];

  const filteredJobs = mockJobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Link to="/jobs/create">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Post Job
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Job Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
            <TabsTrigger value="full-time">Full-Time</TabsTrigger>
            <TabsTrigger value="remote">Remote</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{job.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="font-medium">{job.company}</span>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            3 days ago
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {job.description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="capitalize">
                            {job.job_type}
                          </Badge>
                          {job.remote && (
                            <Badge variant="outline">Remote</Badge>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            {job.job_type === 'contract' 
                              ? `$${job.salary_min}-${job.salary_max}/hr`
                              : `$${(job.salary_min / 1000).toFixed(0)}k-${(job.salary_max / 1000).toFixed(0)}k`
                            }
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="full-time" className="mt-6">
            <div className="space-y-4">
              {filteredJobs.filter(job => job.job_type === 'full-time').map((job) => (
                <Card key={job.id} className="p-4">
                  <h3 className="font-medium">{job.title} - {job.company}</h3>
                  <p className="text-sm text-muted-foreground">{job.location}</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="remote" className="mt-6">
            <div className="space-y-4">
              {filteredJobs.filter(job => job.remote).map((job) => (
                <Card key={job.id} className="p-4">
                  <h3 className="font-medium">{job.title} - {job.company}</h3>
                  <p className="text-sm text-muted-foreground">Remote Position</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No saved jobs</h3>
              <p className="text-muted-foreground">
                Start exploring jobs and save the ones you're interested in.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Note about database */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is showing mock data. Database migrations need to be applied to enable full functionality.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}