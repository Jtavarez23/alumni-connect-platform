import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GraduationCap, MapPin, Edit, Trash2, Crown } from "lucide-react";
import { useSchoolHistory, SchoolHistory } from "@/hooks/useSchoolHistory";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import SchoolSelector from "./SchoolSelector";

interface MultiSchoolSelectorProps {
  onSchoolHistoryChange?: () => void;
}

const MultiSchoolSelector = ({ onSchoolHistoryChange }: MultiSchoolSelectorProps) => {
  const { schoolHistory, addSchoolHistory, updateSchoolHistory, deleteSchoolHistory, loading } = useSchoolHistory();
  const { canAddSchool, shouldShowUpgradePrompt, getSchoolsRemaining } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolHistory | null>(null);
  const [formData, setFormData] = useState<{
    school_id: string;
    start_year: number;
    end_year: number | null;
    graduated: boolean;
    is_primary: boolean;
    role_type: "student" | "teacher" | "staff" | "administrator";
    grade_level: string;
    department: string;
    activities: string[];
    achievements: string[];
    transfer_reason: string;
    verification_status: "pending" | "verified" | "rejected";
  }>({
    school_id: "",
    start_year: new Date().getFullYear(),
    end_year: null,
    graduated: false,
    is_primary: false,
    role_type: "student",
    grade_level: "",
    department: "",
    activities: [],
    achievements: [],
    transfer_reason: "",
    verification_status: "pending"
  });

  const resetForm = () => {
    setFormData({
      school_id: "",
      start_year: new Date().getFullYear(),
      end_year: null,
      graduated: false,
      is_primary: false,
      role_type: "student",
      grade_level: "",
      department: "",
      activities: [],
      achievements: [],
      transfer_reason: "",
      verification_status: "pending"
    });
    setEditingSchool(null);
  };

  const handleAddSchool = () => {
    if (!canAddSchool()) {
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  const handleEditSchool = (school: SchoolHistory) => {
    setEditingSchool(school);
    setFormData({
      school_id: school.school_id,
      start_year: school.start_year,
      end_year: school.end_year,
      graduated: school.graduated,
      is_primary: school.is_primary,
      role_type: school.role_type as "student" | "teacher" | "staff" | "administrator",
      grade_level: school.grade_level || "",
      department: school.department || "",
      activities: school.activities || [],
      achievements: school.achievements || [],
      transfer_reason: school.transfer_reason || "",
      verification_status: school.verification_status as "pending" | "verified" | "rejected"
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.school_id) return;

    try {
      if (editingSchool) {
        await updateSchoolHistory(editingSchool.id, formData);
      } else {
        await addSchoolHistory(formData);
      }
      setDialogOpen(false);
      resetForm();
      onSchoolHistoryChange?.();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this school from your history?")) {
      await deleteSchoolHistory(id);
      onSchoolHistoryChange?.();
    }
  };

  const getLocationDisplay = (location: any) => {
    if (!location) return "";
    if (typeof location === 'string') return location;
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    }
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Education History</Label>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddSchool}
              disabled={!canAddSchool()}
            >
              {canAddSchool() ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add School
                  {getSchoolsRemaining() < Infinity && (
                    <Badge variant="secondary" className="ml-2">
                      {getSchoolsRemaining()} left
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Premium Required
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSchool ? "Edit School History" : "Add School to History"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <SchoolSelector
                selectedSchoolId={formData.school_id}
                onSchoolSelect={(schoolId) => setFormData({ ...formData, school_id: schoolId })}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_year">Start Year</Label>
                  <Input
                    id="start_year"
                    type="number"
                    value={formData.start_year}
                    onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                    min={1950}
                    max={new Date().getFullYear() + 10}
                  />
                </div>
                <div>
                  <Label htmlFor="end_year">End Year (optional)</Label>
                  <Input
                    id="end_year"
                    type="number"
                    value={formData.end_year || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      end_year: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    min={formData.start_year}
                    max={new Date().getFullYear() + 10}
                    placeholder="Leave empty if still attending"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role_type">Role</Label>
                  <Select value={formData.role_type} onValueChange={(value) => 
                    setFormData({ ...formData, role_type: value as "student" | "teacher" | "staff" | "administrator" })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.role_type === "student" && (
                  <div>
                    <Label htmlFor="grade_level">Grade Level</Label>
                    <Input
                      id="grade_level"
                      value={formData.grade_level}
                      onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                      placeholder="e.g., Senior, Freshman"
                    />
                  </div>
                )}
                
                {(formData.role_type === "teacher" || formData.role_type === "staff" || formData.role_type === "administrator") && (
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Mathematics, Administration"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="graduated"
                    checked={formData.graduated}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, graduated: !!checked })
                    }
                  />
                  <Label htmlFor="graduated">Graduated</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_primary"
                    checked={formData.is_primary}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, is_primary: !!checked })
                    }
                  />
                  <Label htmlFor="is_primary">Primary School</Label>
                </div>
              </div>
              
              {formData.transfer_reason && (
                <div>
                  <Label htmlFor="transfer_reason">Transfer Reason (optional)</Label>
                  <Textarea
                    id="transfer_reason"
                    value={formData.transfer_reason}
                    onChange={(e) => setFormData({ ...formData, transfer_reason: e.target.value })}
                    placeholder="Why did you transfer or leave?"
                    rows={2}
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.school_id}>
                  {editingSchool ? "Update" : "Add"} School
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {shouldShowUpgradePrompt() && schoolHistory.length > 0 && (
        <UpgradePrompt feature="unlimited schools" />
      )}

      {schoolHistory.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No schools in your education history yet.
            </p>
            <Button onClick={handleAddSchool} disabled={!canAddSchool()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First School
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schoolHistory.map((school) => (
            <Card key={school.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{school.school?.name}</h3>
                        {school.is_primary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {school.verification_status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span>
                          {school.start_year} - {school.end_year || "Present"}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {school.role_type}
                        </Badge>
                        {school.graduated && (
                          <Badge variant="secondary">Graduated</Badge>
                        )}
                      </div>
                      {school.school?.location && (
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {getLocationDisplay(school.school.location)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSchool(school)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(school.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSchoolSelector;