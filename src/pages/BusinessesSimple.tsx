// Businesses Page - Simplified Version
import React, { useState } from 'react';
import { Plus, Search, Filter, MapPin, Star, Award, Gift, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';

export function Businesses() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for now since database RPC functions don't exist yet
  const mockBusinesses = [
    {
      id: '1',
      name: 'TechStart Solutions',
      description: 'Full-service web development and digital marketing agency founded by Lincoln High alumni.',
      category: 'technology',
      owner_name: 'Sarah Johnson',
      owner_class_year: '2015',
      location: 'San Francisco, CA',
      website: 'https://techstart.com',
      verified: true,
      featured: true,
      alumni_perks: true,
      rating: 4.8,
      review_count: 24,
      logo_url: null
    },
    {
      id: '2',
      name: "Mike's Coffee Roasters",
      description: 'Artisan coffee roastery specializing in single-origin beans from sustainable farms.',
      category: 'food_beverage',
      owner_name: 'Mike Chen',
      owner_class_year: '2012',
      location: 'Portland, OR',
      website: 'https://mikescoffee.com',
      verified: true,
      featured: false,
      alumni_perks: true,
      rating: 4.9,
      review_count: 87,
      logo_url: null
    },
    {
      id: '3',
      name: 'Green Valley Consulting',
      description: 'Environmental consulting firm helping businesses implement sustainable practices.',
      category: 'consulting',
      owner_name: 'Alex Rivera',
      owner_class_year: '2010',
      location: 'Austin, TX',
      website: 'https://greenvalley.com',
      verified: false,
      featured: false,
      alumni_perks: false,
      rating: 4.6,
      review_count: 12,
      logo_url: null
    }
  ];

  const filteredBusinesses = mockBusinesses.filter(business =>
    business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredBusinesses = filteredBusinesses.filter(b => b.featured);
  const verifiedBusinesses = filteredBusinesses.filter(b => b.verified);
  const withPerksBusinesses = filteredBusinesses.filter(b => b.alumni_perks);

  const BusinessCard = ({ business }: { business: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {business.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{business.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {business.owner_name} • Class of {business.owner_class_year}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {business.verified && (
              <Badge variant="default" className="text-xs">
                <Award className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {business.featured && (
              <Badge variant="secondary" className="text-xs">Featured</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {business.description}
        </p>
        
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {business.location}
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            {business.rating} ({business.review_count})
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline" className="capitalize">
              {business.category.replace('_', ' ')}
            </Badge>
            {business.alumni_perks && (
              <Badge variant="outline" className="text-green-600">
                <Gift className="w-3 h-3 mr-1" />
                Alumni Perks
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={business.website} target="_blank">
                <ExternalLink className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              Contact
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout title="Businesses">
      <div className="space-y-6 pb-20 md:pb-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Alumni Business Directory</h1>
            <p className="text-muted-foreground">
              Discover and support alumni-owned businesses
            </p>
          </div>
          <Link to="/businesses/create">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Business
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search businesses..."
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

        {/* Business Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({filteredBusinesses.length})</TabsTrigger>
            <TabsTrigger value="featured">Featured ({featuredBusinesses.length})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedBusinesses.length})</TabsTrigger>
            <TabsTrigger value="perks">Alumni Perks ({withPerksBusinesses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="featured" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="verified" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="perks" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {withPerksBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No businesses found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Be the first to add your business to the alumni directory and connect with fellow graduates!
            </p>
            <Link to="/businesses/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Your Business
              </Button>
            </Link>
          </div>
        )}

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

export default Businesses;