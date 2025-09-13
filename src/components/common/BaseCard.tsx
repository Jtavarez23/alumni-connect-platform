import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface BaseCardAction {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

interface BaseCardBadge {
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  icon?: React.ReactNode;
}

interface BaseCardInfo {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}

interface BaseCardProps {
  // Core content
  title: string;
  subtitle?: string;
  description?: string;
  avatar?: {
    src?: string;
    fallback: string;
    size?: 'sm' | 'md' | 'lg';
  };

  // Layout
  variant?: 'card' | 'list' | 'compact';
  href?: string;
  className?: string;

  // Metadata
  badges?: BaseCardBadge[];
  infoItems?: BaseCardInfo[];
  actions?: BaseCardAction[];

  // Special content
  highlight?: {
    content: React.ReactNode;
    className?: string;
  };

  // Event handlers
  onClick?: (e: React.MouseEvent) => void;

  // Performance
  id?: string | number;
}

const BaseCard = React.memo<BaseCardProps>(({
  title,
  subtitle,
  description,
  avatar,
  variant = 'card',
  href,
  className = '',
  badges = [],
  infoItems = [],
  actions = [],
  highlight,
  onClick,
  id
}) => {
  const CardWrapper = href ? Link : 'div';
  const wrapperProps = href ? { to: href } : onClick ? { onClick } : {};

  const avatarSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  if (variant === 'list') {
    return (
      <CardWrapper {...wrapperProps}>
        <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Avatar */}
              {avatar && (
                <div className="flex-shrink-0">
                  <Avatar className={avatarSizeClasses[avatar.size || 'md']}>
                    <AvatarImage src={avatar.src} />
                    <AvatarFallback className="text-lg font-semibold">
                      {avatar.fallback}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="text-sm text-muted-foreground">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {badges.length > 0 && (
                    <div className="flex items-center gap-1 ml-4 flex-wrap">
                      {badges.map((badge, index) => (
                        <Badge key={index} variant={badge.variant} className="text-xs">
                          {badge.icon && <span className="mr-1">{badge.icon}</span>}
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {description}
                  </p>
                )}

                {infoItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {infoItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-1">
                        {item.icon}
                        <span className="truncate">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {highlight && (
                  <div className={cn('p-2 rounded-lg border', highlight.className)}>
                    {highlight.content}
                  </div>
                )}
              </div>

              {/* Actions */}
              {actions.length > 0 && (
                <div className="flex-shrink-0 self-center">
                  <div className="flex flex-col gap-2">
                    {actions.slice(0, 2).map((action, index) => (
                      <button
                        key={index}
                        onClick={action.onClick}
                        disabled={action.disabled || action.loading}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
                          'w-full sm:w-auto',
                          action.variant === 'outline'
                            ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90',
                          action.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {action.loading ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </CardWrapper>
    );
  }

  // Card variant (default)
  return (
    <CardWrapper {...wrapperProps}>
      <Card className={cn('hover:shadow-lg transition-shadow cursor-pointer h-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {avatar && (
                <Avatar className={avatarSizeClasses[avatar.size || 'md']}>
                  <AvatarImage src={avatar.src} />
                  <AvatarFallback className="text-lg font-semibold">
                    {avatar.fallback}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg leading-tight line-clamp-1">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {badges.length > 0 && (
              <div className="flex flex-col gap-1">
                {badges.map((badge, index) => (
                  <Badge key={index} variant={badge.variant} className="text-xs">
                    {badge.icon && <span className="mr-1">{badge.icon}</span>}
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-4 space-y-3">
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {description}
            </p>
          )}

          {infoItems.length > 0 && (
            <div className="space-y-2 text-sm text-muted-foreground">
              {infoItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="truncate">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {highlight && (
            <div className={cn('p-3 rounded-lg border', highlight.className)}>
              {highlight.content}
            </div>
          )}
        </CardContent>

        {actions.length > 0 && (
          <CardFooter className="pt-0 flex gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={cn(
                  'px-4 py-2 text-sm rounded-md font-medium transition-colors flex-1',
                  action.variant === 'outline'
                    ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  action.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {action.loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </>
                )}
              </button>
            ))}
          </CardFooter>
        )}
      </Card>
    </CardWrapper>
  );
});

BaseCard.displayName = 'BaseCard';

export { BaseCard };
export type { BaseCardProps, BaseCardAction, BaseCardBadge, BaseCardInfo };