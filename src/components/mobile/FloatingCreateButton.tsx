// Floating Create Button Component
// Global Create (+) button for mobile as per AC-ARCH-001

import React, { useState } from 'react';
import { Plus, X, Calendar, MapPin, Briefcase, UserPlus, Edit, Users, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const createActions = [
  { 
    icon: Edit, 
    label: 'Post', 
    path: '/create/post', 
    description: 'Share with your network',
    color: 'bg-blue-600 hover:bg-blue-700'
  },
  { 
    icon: Calendar, 
    label: 'Event', 
    path: '/events/create', 
    description: 'Plan a reunion or meetup',
    color: 'bg-green-600 hover:bg-green-700'
  },
  { 
    icon: MapPin, 
    label: 'Business', 
    path: '/businesses/create', 
    description: 'Add your business',
    color: 'bg-purple-600 hover:bg-purple-700'
  },
  { 
    icon: Briefcase, 
    label: 'Job', 
    path: '/jobs/create', 
    description: 'Post a job opportunity',
    color: 'bg-orange-600 hover:bg-orange-700'
  },
  { 
    icon: Users, 
    label: 'Group', 
    path: '/groups/create', 
    description: 'Start a new group',
    color: 'bg-pink-600 hover:bg-pink-700'
  },
];

export function FloatingCreateButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const handleActionClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleMainButtonClick = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 touch-manipulation"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Buttons */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse gap-3">
          {createActions.map((action, index) => (
            <div
              key={action.path}
              className={cn(
                "flex items-center gap-3 transition-all duration-200 ease-out",
                isOpen
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4"
              )}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
            >
              <div className="bg-white rounded-lg shadow-lg px-3 py-2 mr-2">
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-600">{action.description}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleActionClick(action.path)}
                className={cn(
                  "w-12 h-12 rounded-full shadow-lg border-2 border-white",
                  action.color,
                  "hover:scale-110 transition-transform duration-200"
                )}
              >
                <action.icon className="w-5 h-5 text-white" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <Button
        onClick={handleMainButtonClick}
        className={cn(
          "fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-xl",
          "bg-primary hover:bg-primary/90 border-4 border-white",
          "transition-all duration-300 ease-out touch-manipulation",
          isOpen && "rotate-45"
        )}
        aria-label="Create new content"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </Button>
    </>
  );
}