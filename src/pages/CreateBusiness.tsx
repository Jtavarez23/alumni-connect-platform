// Business Creation Form
// Multi-step business creation wizard

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, MapPin, Globe, Phone, Mail, Gift, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useCreateBusiness } from '@/hooks/useBusiness';
import { AppLayout } from '@/components/layout/AppLayout';
import { BUSINESS_CATEGORIES } from '@/types/business';
import type { CreateBusinessPayload } from '@/types/business';

interface FormData extends Omit<CreateBusinessPayload, 'address' | 'hours' | 'social_links'> {
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  hours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  social_links?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
}

export function CreateBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMutation = useCreateBusiness();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    website: '',
    email: '',
    phone: '',
    location: '',
    perk: '',
    perk_url: '',
    logo_url: ''
  });

  const steps = [
    { title: 'Basic Info', description: 'Business name and category' },
    { title: 'Contact Details', description: 'How customers can reach you' },
    { title: 'Location', description: 'Business address and hours' },
    { title: 'Alumni Perks', description: 'Special offers for alumni' },
    { title: 'Review', description: 'Confirm your information' }
  ];

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync(formData);
      toast({
        title: 'Success!',
        description: 'Your business has been added to the directory.',
      });
      navigate('/businesses');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create business listing. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <AppLayout title="Add Business">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/businesses')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add Your Business</h1>
            <p className="text-muted-foreground">
              Share your business with the alumni community
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of {steps.length}</span>
            <span>{steps[currentStep - 1].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{steps[currentStep - 1].title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {steps[currentStep - 1].description}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your business name"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => updateFormData({ category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your business..."
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="website">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourbusiness.com"
                    value={formData.website}
                    onChange={(e) => updateFormData({ website: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@yourbusiness.com"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Location/Address
                  </Label>
                  <Input
                    id="location"
                    placeholder="123 Main St, City, State 12345"
                    value={formData.location}
                    onChange={(e) => updateFormData({ location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    <Clock className="w-4 h-4 inline mr-2" />
                    Business Hours (Optional)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <div key={day} className="space-y-1">
                        <Label className="text-sm">{day}</Label>
                        <Input
                          placeholder="9:00 AM - 5:00 PM"
                          value={formData.hours?.[day.toLowerCase() as keyof FormData['hours']] || ''}
                          onChange={(e) => updateFormData({
                            hours: {
                              ...formData.hours,
                              [day.toLowerCase()]: e.target.value
                            }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="perk">
                    <Gift className="w-4 h-4 inline mr-2" />
                    Alumni Perk Description
                  </Label>
                  <Textarea
                    id="perk"
                    placeholder="Special discount or offer for alumni (e.g., '15% off for alumni members')"
                    value={formData.perk}
                    onChange={(e) => updateFormData({ perk: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perk_url">Perk Redemption URL</Label>
                  <Input
                    id="perk_url"
                    type="url"
                    placeholder="https://yourbusiness.com/alumni-perk"
                    value={formData.perk_url}
                    onChange={(e) => updateFormData({ perk_url: e.target.value })}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    💡 Alumni perks help attract fellow graduates to your business and build
                    stronger connections within the community.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Ready to Submit!</h3>
                  <p className="text-sm text-green-700">
                    Review your information below and click "Create Business" to list your business
                    in the alumni directory.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Business Details</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Name:</dt>
                        <dd className="font-medium">{formData.name}</dd>
                      </div>
                      {formData.category && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Category:</dt>
                          <dd>{formData.category}</dd>
                        </div>
                      )}
                      {formData.description && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Description:</dt>
                          <dd className="text-right">{formData.description}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Contact Information</h4>
                    <dl className="space-y-2 text-sm">
                      {formData.website && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Website:</dt>
                          <dd>{formData.website}</dd>
                        </div>
                      )}
                      {formData.email && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Email:</dt>
                          <dd>{formData.email}</dd>
                        </div>
                      )}
                      {formData.phone && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Phone:</dt>
                          <dd>{formData.phone}</dd>
                        </div>
                      )}
                      {formData.location && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Location:</dt>
                          <dd>{formData.location}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {formData.perk && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Alumni Perk</h4>
                    <p className="text-blue-700">{formData.perk}</p>
                    {formData.perk_url && (
                      <p className="text-sm text-blue-600 mt-1">
                        URL: {formData.perk_url}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              <Button
                onClick={nextStep}
                disabled={(currentStep === 1 && !formData.name.trim()) || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : (currentStep === steps.length ? 'Create Business' : 'Next')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Tips for a Great Listing</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use a clear, descriptive business name that alumni will recognize</li>
            <li>• Add alumni-specific perks to attract fellow graduates</li>
            <li>• Include accurate contact information and business hours</li>
            <li>• Provide a compelling description of your products or services</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}

export default CreateBusiness;