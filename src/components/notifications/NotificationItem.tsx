import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationItemProps {
  data: {
    id: string
    type: 'like' | 'comment' | 'share' | 'connection' | 'event' | 'message' | 'claim'
    title: string
    message: string
    timestamp: string
    isRead: boolean
    actor?: {
      name: string
      avatar?: string
    }
    actionUrl?: string
  }
  onMarkRead?: (notificationId: string) => void
  onDismiss?: (notificationId: string) => void
  onClick?: (notificationId: string) => void
}

export function NotificationItem({ 
  data, 
  onMarkRead, 
  onDismiss, 
  onClick 
}: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️'
      case 'comment': return '💬'
      case 'share': return '🔄'
      case 'connection': return '🤝'
      case 'event': return '🎉'
      case 'message': return '✉️'
      case 'claim': return '📸'
      default: return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like': return 'bg-red-50 border-red-200'
      case 'comment': return 'bg-blue-50 border-blue-200'
      case 'connection': return 'bg-green-50 border-green-200'
      case 'event': return 'bg-purple-50 border-purple-200'
      case 'message': return 'bg-cyan-50 border-cyan-200'
      case 'claim': return 'bg-amber-50 border-amber-200'
      default: return 'bg-neutral-50 border-neutral-200'
    }
  }

  return (
    <Card 
      variant={data.isRead ? "default" : "outlined"}
      className={cn(
        "cursor-pointer transition-all hover:shadow-sm",
        !data.isRead && "ring-1 ring-brand-200 bg-brand-50/30",
        getNotificationColor(data.type)
      )}
      onClick={() => onClick?.(data.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {data.actor ? (
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={data.actor.avatar} />
              <AvatarFallback>
                {data.actor.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">{getNotificationIcon(data.type)}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-small font-medium text-foreground">
                  {data.title}
                </p>
                <p className="text-small text-muted-foreground line-clamp-2">
                  {data.message}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{data.timestamp}</span>
                  {!data.isRead && (
                    <Badge variant="default" className="h-4 text-xs">
                      New
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {!data.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-brand-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkRead?.(data.id)
                    }}
                  >
                    <span className="sr-only">Mark as read</span>
                    ✓
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDismiss?.(data.id)
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}