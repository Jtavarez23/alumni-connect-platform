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
import { useSchoolPhotos } from "@/hooks/useSchoolPhotos";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Upload, Calendar, Tag } from "lucide-react";
import LoadingBoundary from "@/components/LoadingBoundary";

const photoFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  academic_year: z.string().optional(),
});

const photoCategories = [
  "general",
  "sports",
  "academics",
  "events",
  "facilities",
  "student_life",
  "graduation",
  "clubs",
];

interface SchoolPhotoGalleryProps {
  schoolId: string;
}

export function SchoolPhotoGallery({ schoolId }: SchoolPhotoGalleryProps) {
  const { photos, loading, uploading, uploadPhoto } = useSchoolPhotos(schoolId);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof photoFormSchema>>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      academic_year: "",
    },
  });

  const filteredPhotos = photos.filter(photo => {
    const matchesCategory = selectedCategory === "all" || photo.category === selectedCategory;
    const matchesSearch = photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         photo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const onSubmit = async (values: z.infer<typeof photoFormSchema>) => {
    if (!selectedFile) return;

    try {
      await uploadPhoto(selectedFile, {
        title: values.title || "",
        description: values.description,
        category: values.category || "",
        academic_year: values.academic_year,
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      form.reset();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  if (loading) {
    return <LoadingBoundary>Loading photos...</LoadingBoundary>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Upload */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New Photo</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Photo
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    required
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Photo title" />
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
                        <Textarea {...field} placeholder="Optional description" />
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
                          {photoCategories.map((category) => (
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
                
                <FormField
                  control={form.control}
                  name="academic_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 2023-24" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={uploading || !selectedFile}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setUploadDialogOpen(false)}
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
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          <TabsTrigger value="all">All</TabsTrigger>
          {photoCategories.map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {category.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {searchQuery || selectedCategory !== "all" 
                ? "No photos found matching your criteria." 
                : "No photos uploaded yet. Be the first to share memories!"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="relative aspect-square">
                <img
                  src={photo.photo_url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {photo.is_featured && (
                  <Badge className="absolute top-2 left-2 bg-primary">
                    Featured
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-3">
                <h3 className="font-medium text-sm mb-1 line-clamp-1">
                  {photo.title}
                </h3>
                
                {photo.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {photo.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {photo.category}
                    </Badge>
                    
                    {photo.academic_year && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {photo.academic_year}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}