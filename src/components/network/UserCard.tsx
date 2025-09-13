import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { MapPin, GraduationCap, MessageCircle, UserPlus } from "lucide-react"

interface UserCardProps {
  data: {
    id: string
    name: string
    avatar?: string
    title?: string
    location?: string
    school?: string
    graduationYear?: number
    isVerified?: boolean
    isPremium?: boolean
    mutualConnections?: number
    bio?: string
  }
  onConnect?: (userId: string) => void
  onMessage?: (userId: string) => void
}

export function UserCard({ data, onConnect, onMessage }: UserCardProps) {
  const initials = data.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <Card variant="default" className="hover:shadow-md transition-shadow">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={data.avatar} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            {data.isVerified && (
              <Badge 
                variant="verified" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              >
                ✓
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-h2 font-semibold">{data.name}</h3>
              {data.isPremium && (
                <Badge variant="premium" className="text-xs">
                  Premium
                </Badge>
              )}
            </div>
            
            {data.title && (
              <p className="text-small text-muted-foreground">{data.title}</p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 text-center">
        <div className="space-y-2 text-small text-muted-foreground">
          {data.school && (
            <div className="flex items-center justify-center gap-1">
              <GraduationCap className="h-4 w-4" />
              <span>{data.school} {data.graduationYear && `'${data.graduationYear.toString().slice(-2)}`}</span>
            </div>
          )}
          
          {data.location && (
            <div className="flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{data.location}</span>
            </div>
          )}
          
          {data.mutualConnections && data.mutualConnections > 0 && (
            <p className="text-brand-600">
              {data.mutualConnections} mutual connection{data.mutualConnections !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        {data.bio && (
          <p className="text-body text-muted-foreground line-clamp-2">
            {data.bio}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button 
          variant="primary" 
          size="sm" 
          className="flex-1"
          onClick={() => onConnect?.(data.id)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Connect
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onMessage?.(data.id)}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}