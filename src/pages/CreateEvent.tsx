// Event Creation Wizard
// Multi-step form for creating new events with ticketing support

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Ticket, Settings, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCreateEvent } from '@/hooks/useEvents';
import { useSchoolHistory } from '@/hooks/useSchoolHistory';
import { AppLayout } from '@/components/layout/AppLayout';
import type { EventCreationData, Visibility } from '@/types/events';

const steps = [
  { id: 'basic', title: 'Basic Info', icon: Users, description: 'Event title and description' },
  { id: 'datetime', title: 'Date & Time', icon: Calendar, description: 'When your event happens' },
  { id: 'location', title: 'Location', icon: MapPin, description: 'Where your event takes place' },
  { id: 'tickets', title: 'Tickets', icon: Ticket, description: 'Ticketing options (optional)' },
  { id: 'settings', title: 'Settings', icon: Settings, description: 'Visibility and capacity' }
];

export function CreateEvent() {
  const navigate = useNavigate();
  const { schoolHistory } = useSchoolHistory();
  const createEventMutation = useCreateEvent();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EventCreationData>({
    title: '',
    description: '',
    starts_at: null,
    ends_at: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: '',
    is_virtual: false,
    virtual_link: '',
    ticketing_enabled: false,
    tickets: [],
    visibility: 'alumni_only',
    max_capacity: undefined,
    host_type: 'user',
    host_id: undefined
  });

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        starts_at: formData.starts_at?.toISOString() || new Date().toISOString(),
        ends_at: formData.ends_at?.toISOString(),
        location: formData.is_virtual ? undefined : formData.location,
        is_virtual: formData.is_virtual,
        visibility: formData.visibility,
        host_type: formData.host_type,
        host_id: formData.host_id,
        max_capacity: formData.max_capacity,
        tickets: formData.ticketing_enabled ? formData.tickets : []
      };

      const result = await createEventMutation.mutateAsync(payload);
      
      // Handle the RPC function response format
      if (result.success && result.event_id) {
        navigate(`/events/${result.event_id}`);
      } else if (result.error) {
        console.error('Event creation failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Class of 2025 Reunion"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell people what to expect at your event..."
                rows={4}
              />
            </div>
          </div>
        );

      case 1: // Date & Time
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="starts_at">Start Date & Time *</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at ? formData.starts_at.toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  starts_at: e.target.value ? new Date(e.target.value) : null 
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="ends_at">End Date & Time (optional)</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={formData.ends_at ? formData.ends_at.toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  ends_at: e.target.value ? new Date(e.target.value) : null 
                })}
              />
            </div>
          </div>
        );

      case 2: // Location
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_virtual"
                checked={formData.is_virtual}
                onCheckedChange={(checked) => setFormData({ ...formData, is_virtual: checked })}
              />
              <Label htmlFor="is_virtual">Virtual Event</Label>
            </div>
            
            {formData.is_virtual ? (
              <div>
                <Label htmlFor="virtual_link">Virtual Meeting Link</Label>
                <Input
                  id="virtual_link"
                  type="url"
                  value={formData.virtual_link}
                  onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="location">Physical Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="123 Main St, City, State"
                  required={!formData.is_virtual}
                />
              </div>
            )}
          </div>
        );

      case 3: // Tickets
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="ticketing_enabled"
                checked={formData.ticketing_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, ticketing_enabled: checked, tickets: checked ? formData.tickets : [] })}
              />
              <Label htmlFor="ticketing_enabled">Enable Paid Ticketing</Label>
            </div>

            {formData.ticketing_enabled && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Ticket Types</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      tickets: [
                        ...formData.tickets,
                        {
                          name: '',
                          price_cents: 0,
                          currency: 'USD',
                          quantity: null,
                          sales_start: null,
                          sales_end: null
                        }
                      ]
                    })}
                  >
                    Add Ticket Type
                  </Button>
                </div>

                {formData.tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add ticket types with different pricing tiers for your event.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.tickets.map((ticket, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Ticket {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({
                              ...formData,
                              tickets: formData.tickets.filter((_, i) => i !== index)
                            })}
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`ticket_name_${index}`}>Ticket Name</Label>
                            <Input
                              id={`ticket_name_${index}`}
                              placeholder="General Admission"
                              value={ticket.name || ''}
                              onChange={(e) => {
                                const newTickets = [...formData.tickets];
                                newTickets[index] = { ...newTickets[index], name: e.target.value };
                                setFormData({ ...formData, tickets: newTickets });
                              }}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`ticket_price_${index}`}>Price ($)</Label>
                            <Input
                              id={`ticket_price_${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="25.00"
                              value={ticket.price_cents ? (ticket.price_cents / 100).toFixed(2) : ''}
                              onChange={(e) => {
                                const newTickets = [...formData.tickets];
                                newTickets[index] = { 
                                  ...newTickets[index], 
                                  price_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                                };
                                setFormData({ ...formData, tickets: newTickets });
                              }}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`ticket_quantity_${index}`}>Quantity (optional)</Label>
                            <Input
                              id={`ticket_quantity_${index}`}
                              type="number"
                              min="1"
                              placeholder="Unlimited"
                              value={ticket.quantity || ''}
                              onChange={(e) => {
                                const newTickets = [...formData.tickets];
                                newTickets[index] = { 
                                  ...newTickets[index], 
                                  quantity: e.target.value ? parseInt(e.target.value) : null
                                };
                                setFormData({ ...formData, tickets: newTickets });
                              }}
                            />
                          </div>

                          <div>
                            <Label>Currency</Label>
                            <Select
                              value={ticket.currency || 'USD'}
                              onValueChange={(value) => {
                                const newTickets = [...formData.tickets];
                                newTickets[index] = { ...newTickets[index], currency: value };
                                setFormData({ ...formData, tickets: newTickets });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Currency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                <SelectItem value="CAD">CAD ($)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.tickets.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setFormData({
                      ...formData,
                      tickets: [{
                        name: 'General Admission',
                        price_cents: 2500, // $25.00
                        currency: 'USD',
                        quantity: null,
                        sales_start: null,
                        sales_end: null
                      }]
                    })}
                  >
                    Add First Ticket Type
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 4: // Settings
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="visibility">Visibility *</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: Visibility) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (Anyone can see)</SelectItem>
                  <SelectItem value="alumni_only">Alumni Only</SelectItem>
                  <SelectItem value="school_only">School Members Only</SelectItem>
                  <SelectItem value="connections_only">My Connections Only</SelectItem>
                  <SelectItem value="private">Private (Invite Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max_capacity">Maximum Capacity (optional)</Label>
              <Input
                id="max_capacity"
                type="number"
                min="1"
                value={formData.max_capacity || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_capacity: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="Leave empty for unlimited"
              />
            </div>

            {schoolHistory.length > 0 && (
              <div>
                <Label htmlFor="host_type">Host Type</Label>
                <Select
                  value={formData.host_type}
                  onValueChange={(value: 'school' | 'group' | 'user') => 
                    setFormData({ ...formData, host_type: value, host_id: undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select host type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Personal Event</SelectItem>
                    <SelectItem value="school">School Event</SelectItem>
                    <SelectItem value="group">Group Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.host_type === 'school' && schoolHistory.length > 0 && (
              <div>
                <Label htmlFor="host_id">Select School</Label>
                <Select
                  value={formData.host_id}
                  onValueChange={(value) => setFormData({ ...formData, host_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolHistory.map((school) => (
                      <SelectItem key={school.id} value={school.school_id}>
                        {school.schools?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.title.trim().length > 0;
      case 1: return formData.starts_at !== null;
      case 2: return formData.is_virtual ? true : formData.location.trim().length > 0;
      case 3: return true; // Tickets are optional
      case 4: return true; // Settings have defaults
      default: return false;
    }
  };

  return (
    <AppLayout title="Create Event">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Create New Event</h1>
          <p className="text-muted-foreground">
            Organize reunions, meetups, and alumni gatherings
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    index <= currentStep
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <Badge variant="default" className="text-xs">✓</Badge>
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 ${
                    index <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {React.createElement(steps[currentStep].icon, { className: "w-5 h-5" })}
              <span>{steps[currentStep].title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}

            {/* Navigation */}
            <div className="flex justify-between pt-6 mt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep || createEventMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default CreateEvent;