import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { MapPin, Clock, DollarSign, Building } from "lucide-react"

interface JobCardProps {
  data: {
    id: string
    title: string
    company: string
    location: string
    type: string
    salary?: string
    postedAt: string
    description: string
    remote?: boolean
  }
  onApply?: (jobId: string) => void
  onSave?: (jobId: string) => void
}

export function JobCard({ data, onApply, onSave }: JobCardProps) {
  return (
    <Card variant="default" className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="text-h2 font-semibold">{data.title}</h3>
            <div className="flex items-center gap-2 text-small">
              <Building className="h-4 w-4" />
              <span>{data.company}</span>
            </div>
          </div>
          <Badge variant={data.type === 'Full-time' ? 'default' : 'secondary'}>
            {data.type}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-small text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{data.location}</span>
            {data.remote && <Badge variant="outline">Remote</Badge>}
          </div>
          {data.salary && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>{data.salary}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{data.postedAt}</span>
          </div>
        </div>
        
        <p className="text-body text-muted-foreground line-clamp-3">
          {data.description}
        </p>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => onApply?.(data.id)}
        >
          Apply Now
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onSave?.(data.id)}
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  )
}