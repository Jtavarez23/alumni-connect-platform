// Email Reminder System
// Handles event reminder emails and notifications

import { supabase } from '@/lib/supabase';
import { generateICSFile, type CalendarEvent } from './calendar';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  userId?: string;
}

export interface EmailOptions {
  to: EmailRecipient[];
  template: EmailTemplate;
  icsAttachment?: CalendarEvent;
  metadata?: Record<string, any>;
}

// Email templates for different event scenarios
export const EMAIL_TEMPLATES = {
  EVENT_REMINDER_24H: {
    subject: 'Reminder: Your event is tomorrow!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Event Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Event Reminder</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Your event is coming up soon!</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #4a5568; margin-top: 0;">{{event_title}}</h2>
          
          <div style="background: #f7fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; min-width: 80px;">When:</span>
              <span>{{event_time}}</span>
            </div>
            {{#event_location}}
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; min-width: 80px;">Where:</span>
              <span>{{event_location}}</span>
            </div>
            {{/event_location}}
            {{#is_virtual}}
            <div style="display: flex; align-items: center;">
              <span style="font-weight: 600; min-width: 80px;">Type:</span>
              <span>Virtual Event</span>
            </div>
            {{/is_virtual}}
          </div>

          <div style="margin: 25px 0;">
            <p style="margin-bottom: 15px;">We're looking forward to seeing you at the event!</p>
            
            {{#event_description}}
            <p style="color: #718096;">{{event_description}}</p>
            {{/event_description}}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{event_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              View Event Details
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #718096; font-size: 14px;">
            <p style="margin: 0;">This is an automated reminder. You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Event Reminder
==============

Your event "{{event_title}}" is coming up tomorrow!

When: {{event_time}}
{{#event_location}}Where: {{event_location}}{{/event_location}}
{{#is_virtual}}Type: Virtual Event{{/is_virtual}}

{{#event_description}}
Description: {{event_description}}
{{/event_description}}

View event details: {{event_url}}

This is an automated reminder. You can manage your notification preferences in your account settings.
    `
  },
  
  EVENT_REMINDER_1H: {
    subject: 'Starting soon: Your event begins in 1 hour',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Event Starting Soon</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Starting Soon!</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Your event begins in 1 hour</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #4a5568; margin-top: 0;">{{event_title}}</h2>
          
          <div style="background: #fff5f5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f56565;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; min-width: 80px;">Starts:</span>
              <span>{{event_time}}</span>
            </div>
            {{#event_location}}
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; min-width: 80px;">Location:</span>
              <span>{{event_location}}</span>
            </div>
            {{/event_location}}
            {{#is_virtual}}
            <div style="display: flex; align-items: center;">
              <span style="font-weight: 600; min-width: 80px;">Join at:</span>
              <span>{{virtual_url}}</span>
            </div>
            {{/is_virtual}}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            {{#is_virtual}}
            <a href="{{virtual_url}}" style="background: #f56565; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
              Join Virtual Event
            </a>
            {{/is_virtual}}
            <a href="{{event_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Event Details
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #718096; font-size: 14px;">
            <p style="margin: 0;">See you soon! This is an automated reminder.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Event Starting Soon
===================

Your event "{{event_title}}" begins in 1 hour!

Starts: {{event_time}}
{{#event_location}}Location: {{event_location}}{{/event_location}}
{{#is_virtual}}Virtual Meeting: {{virtual_url}}{{/is_virtual}}

{{#is_virtual}}Join the virtual event: {{virtual_url}}{{/is_virtual}}
View event details: {{event_url}}

See you soon! This is an automated reminder.
    `
  },
  
  EVENT_CONFIRMATION: {
    subject: 'Event Registration Confirmed: {{event_title}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Registration Confirmed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Registration Confirmed!</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">You're all set for the event</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #4a5568; margin-top: 0;">{{event_title}}</h2>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; min-width: 80px;">When:</span>
              <span>{{event_time}}</span>
            </div>
            {{#event_location}}
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; min-width: 80px;">Where:</span>
              <span>{{event_location}}</span>
            </div>
            {{/event_location}}
            {{#is_virtual}}
            <div style="display: flex; align-items: center;">
              <span style="font-weight: 600; min-width: 80px;">Virtual:</span>
              <span>{{virtual_url}}</span>
            </div>
            {{/is_virtual}}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{{event_url}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              View Event Details
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #718096; font-size: 14px;">
            <p style="margin: 0;">We'll send you reminder emails before the event. You can also add this event to your calendar.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Registration Confirmed
=====================

You're registered for "{{event_title}}"!

When: {{event_time}}
{{#event_location}}Where: {{event_location}}{{/event_location}}
{{#is_virtual}}Virtual: {{virtual_url}}{{/is_virtual}}

View event details: {{event_url}}

We'll send you reminder emails before the event. You can also add this event to your calendar.
    `
  }
};

// Simple template engine to replace placeholders
export function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = data[key.trim()];
    return value !== undefined ? value : match;
  });
}

// Send email using Supabase Edge Function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Prepare ICS attachment if provided
    let icsAttachment: string | null = null;
    if (options.icsAttachment) {
      icsAttachment = generateICSFile(options.icsAttachment);
    }

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: options.to,
        subject: options.template.subject,
        html: options.template.html,
        text: options.template.text,
        icsAttachment,
        metadata: options.metadata
      }
    });

    if (error) {
      console.error('Email sending error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Schedule event reminder emails
export async function scheduleEventReminders(eventId: string): Promise<void> {
  try {
    // Get event details with attendees
    const { data: event, error } = await supabase
      .rpc('get_event_details', { event_id: eventId });

    if (error || !event) {
      console.error('Failed to fetch event details:', error);
      return;
    }

    // Get all confirmed attendees
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id, email, name, status')
      .eq('event_id', eventId)
      .eq('status', 'confirmed');

    if (!attendees || attendees.length === 0) {
      return;
    }

    const eventStart = new Date(event.starts_at);
    const now = new Date();
    
    // Only schedule reminders for future events
    if (eventStart <= now) {
      return;
    }

    // Calculate reminder times
    const reminder24h = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    const reminder1h = new Date(eventStart.getTime() - 60 * 60 * 1000);

    // Prepare email data
    const emailData = {
      event_title: event.title,
      event_time: event.starts_at,
      event_location: event.location,
      event_description: event.description,
      is_virtual: event.is_virtual,
      virtual_url: event.virtual_url,
      event_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`
    };

    // Schedule 24-hour reminder
    if (reminder24h > now) {
      await scheduleReminder(
        eventId,
        attendees,
        EMAIL_TEMPLATES.EVENT_REMINDER_24H,
        emailData,
        reminder24h
      );
    }

    // Schedule 1-hour reminder
    if (reminder1h > now) {
      await scheduleReminder(
        eventId,
        attendees,
        EMAIL_TEMPLATES.EVENT_REMINDER_1H,
        emailData,
        reminder1h
      );
    }

  } catch (error) {
    console.error('Failed to schedule event reminders:', error);
  }
}

// Schedule a specific reminder
export async function scheduleReminder(
  eventId: string,
  attendees: any[],
  template: EmailTemplate,
  data: Record<string, any>,
  sendAt: Date
): Promise<void> {
  try {
    // Store reminder in database for cron job to process
    const { error } = await supabase
      .from('scheduled_emails')
      .insert({
        event_id: eventId,
        template_name: template.subject,
        recipients: attendees.map(a => ({
          email: a.email,
          name: a.name,
          userId: a.user_id
        })),
        template_data: data,
        scheduled_for: sendAt.toISOString(),
        status: 'pending'
      });

    if (error) {
      console.error('Failed to schedule reminder:', error);
    }
  } catch (error) {
    console.error('Error scheduling reminder:', error);
  }
}

// Send immediate confirmation email
export async function sendEventConfirmation(
  eventId: string,
  recipient: EmailRecipient
): Promise<boolean> {
  try {
    const { data: event } = await supabase
      .rpc('get_event_details', { event_id: eventId });

    if (!event) {
      return false;
    }

    const emailData = {
      event_title: event.title,
      event_time: event.starts_at,
      event_location: event.location,
      event_description: event.description,
      is_virtual: event.is_virtual,
      virtual_url: event.virtual_url,
      event_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`
    };

    const renderedTemplate = {
      subject: renderTemplate(EMAIL_TEMPLATES.EVENT_CONFIRMATION.subject, emailData),
      html: renderTemplate(EMAIL_TEMPLATES.EVENT_CONFIRMATION.html, emailData),
      text: renderTemplate(EMAIL_TEMPLATES.EVENT_CONFIRMATION.text, emailData)
    };

    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      start: new Date(event.starts_at),
      end: event.ends_at ? new Date(event.ends_at) : undefined,
      location: event.location,
      isVirtual: event.is_virtual,
      virtualUrl: event.virtual_url,
      organizer: event.host_name ? { name: event.host_name } : undefined
    };

    return await sendEmail({
      to: [recipient],
      template: renderedTemplate,
      icsAttachment: calendarEvent,
      metadata: {
        eventId,
        type: 'confirmation',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    return false;
  }
}