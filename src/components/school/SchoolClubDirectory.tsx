import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSchoolClubs } from "@/hooks/useSchoolClubs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Users, Calendar, Clock, Mail, User } from "lucide-react";
import LoadingBoundary from "@/components/LoadingBoundary";

const clubFormSchema = z.object({
  name: z.string().min(1, "Club name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  founded_year: z.number().optional(),
  advisor_name: z.string().optional(),
  meeting_schedule: z.string().optional(),
  contact_info: z.string().optional(),
});

const clubCategories = [
  "academic",
  "arts",
  "athletics",
  "community_service",
  "cultural",
  "honor_society",
  "music",
  "student_government",
  "technology",
];

interface SchoolClubDirectoryProps {
  schoolId: string;
}

export function SchoolClubDirectory({ schoolId }: SchoolClubDirectoryProps) {
  const { clubs, loading, createClub } = useSchoolClubs(schoolId);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof clubFormSchema>>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      advisor_name: "",
      meeting_schedule: "",
      contact_info: "",
    },
  });

  const filteredClubs = clubs.filter(club => {
    const matchesCategory = selectedCategory === "all" || club.category === selectedCategory;
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         club.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && club.is_active;
  });

  const onSubmit = async (values: z.infer<typeof clubFormSchema>) => {
    try {
      await createClub({
        name: values.name || "",
        description: values.description,
        category: values.category || "",
        founded_year: values.founded_year,
        advisor_name: values.advisor_name,
        meeting_schedule: values.meeting_schedule,
        contact_info: values.contact_info,
        is_active: true,
        member_count: 0,
      });
      setCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  if (loading) {
    return <LoadingBoundary>Loading clubs...</LoadingBoundary>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Create */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Club
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Club</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Club Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Club name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Club description and activities" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clubCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.replace("_", " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="founded_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Founded Year</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            placeholder="2020"
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="advisor_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advisor</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Teacher/Staff name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="meeting_schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Schedule</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Fridays 3:30 PM" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contact_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Info</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Email or room number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Create Club
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="all">All</TabsTrigger>
          {clubCategories.map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {category.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Clubs Grid */}
      {filteredClubs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {searchQuery || selectedCategory !== "all" 
                ? "No clubs found matching your criteria." 
                : "No clubs registered yet. Be the first to create one!"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClubs.map((club) => (
            <Card key={club.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{club.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {club.category.replace("_", " ")}
                    </Badge>
                  </div>
                  
                  {club.logo_url && (
                    <img 
                      src={club.logo_url} 
                      alt={`${club.name} logo`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {club.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {club.description}
                  </p>
                )}
                
                <div className="space-y-2 text-xs">
                  {club.member_count > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span>{club.member_count} members</span>
                    </div>
                  )}
                  
                  {club.founded_year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span>Founded {club.founded_year}</span>
                    </div>
                  )}
                  
                  {club.advisor_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span>Advisor: {club.advisor_name}</span>
                    </div>
                  )}
                  
                  {club.meeting_schedule && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>{club.meeting_schedule}</span>
                    </div>
                  )}
                  
                  {club.contact_info && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="break-all">{club.contact_info}</span>
                    </div>
                  )}
                </div>
                
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}