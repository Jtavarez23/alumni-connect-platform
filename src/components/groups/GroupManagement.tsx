import { useState } from 'react'
import { supabase } from '../../integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Settings, Users, Trash2, AlertTriangle } from 'lucide-react'

interface GroupManagementProps {
  group: any
  onUpdate: () => void
}

export default function GroupManagement({ group, onUpdate }: GroupManagementProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || '',
    privacy: group.privacy,
    is_archived: group.is_archived || false
  })

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('groups')
        .update(formData)
        .eq('id', group.id)

      if (error) throw error
      onUpdate()
      alert('Group updated successfully!')
    } catch (error) {
      console.error('Error updating group:', error)
      alert('Failed to update group. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveGroup = async () => {
    if (!confirm('Are you sure you want to archive this group? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('groups')
        .update({ is_archived: true })
        .eq('id', group.id)

      if (error) throw error
      onUpdate()
      alert('Group archived successfully!')
    } catch (error) {
      console.error('Error archiving group:', error)
      alert('Failed to archive group. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Group Settings
          </CardTitle>
          <CardDescription>
            Manage your group's settings and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="What is this group about?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacy">Privacy Settings</Label>
              <Select
                value={formData.privacy}
                onValueChange={(value) => handleInputChange('privacy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can join</SelectItem>
                  <SelectItem value="alumni_only">Alumni Only - Verified alumni can join</SelectItem>
                  <SelectItem value="school_only">School Only - Same school alumni only</SelectItem>
                  <SelectItem value="private">Private - Invitation only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="archived" className="text-base">
                  Archive Group
                </Label>
                <p className="text-sm text-muted-foreground">
                  Archive this group to make it read-only and hidden from searches
                </p>
              </div>
              <Switch
                id="archived"
                checked={formData.is_archived}
                onCheckedChange={(checked) => handleInputChange('is_archived', checked)}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Settings'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({
                  name: group.name,
                  description: group.description || '',
                  privacy: group.privacy,
                  is_archived: group.is_archived || false
                })}
                disabled={loading}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect the entire group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
              <div>
                <h4 className="font-semibold text-destructive">Archive Group</h4>
                <p className="text-sm text-muted-foreground">
                  Make this group read-only and hide it from searches
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleArchiveGroup}
                disabled={loading || group.is_archived}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {group.is_archived ? 'Archived' : 'Archive Group'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
              <div>
                <h4 className="font-semibold text-destructive">Delete Group</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this group and all its content
                </p>
              </div>
              <Button
                variant="destructive"
                disabled={true} // TODO: Implement delete functionality
                className="opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}