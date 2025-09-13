import { useState } from 'react'
import { supabase } from '../../integrations/supabase/client'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Image, Video, Link, Send } from 'lucide-react'
import { getInitials } from '../../lib/utils'

interface CreateGroupPostProps {
  groupId: string
  onPostCreated: () => void
}

export default function CreateGroupPost({ groupId, onPostCreated }: CreateGroupPostProps) {
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('group_posts')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          content: content.trim(),
          type: 'text'
        }])

      if (error) throw error
      setContent('')
      onPostCreated()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {getInitials(profile?.first_name, profile?.last_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                placeholder="Share something with the group..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={loading}
              />
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={loading}>
                    <Image className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={loading}>
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={loading}>
                    <Link className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={loading || !content.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}