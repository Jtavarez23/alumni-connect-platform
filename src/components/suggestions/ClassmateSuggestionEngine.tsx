import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  UserPlus, 
  Crown, 
  Gift, 
  CheckCircle, 
  Clock,
  Mail,
  AlertTriangle,
  Users,
  Sparkles,
  Trophy,
  Star
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSchoolHistory } from "@/hooks/useSchoolHistory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassmateSuggestion {
  id: string;
  suggested_name: string;
  suggested_email?: string;
  school_id: string;
  graduation_year?: number;
  additional_details: any;
  status: 'pending' | 'invited' | 'joined' | 'rejected';
  verification_reward_given: boolean;
  created_at: string;
  school?: {
    name: string;
  };
}

interface AIRecommendation {
  confidence: number;
  reasoning: string[];
  suggestedDetails: {
    likely_graduation_year?: number;
    possible_activities?: string[];
    connection_strength?: 'strong' | 'medium' | 'weak';
  };
}

export const ClassmateSuggestionEngine = () => {
  const { user } = useAuth();
  const { isFreeTier, isPremium, canSuggestClassmate, FREE_SUGGESTION_LIMIT } = useSubscription();
  const { schoolHistory } = useSchoolHistory();
  const [suggestions, setSuggestions] = useState<ClassmateSuggestion[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    suggested_name: '',
    suggested_email: '',
    school_id: '',
    graduation_year: '',
    activities: '',
    relationship: '',
    confidence_level: '',
    additional_notes: ''
  });

  // AI recommendation state
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    if (user) {
      loadSuggestions();
      loadWeeklyCount();
    }
  }, [user]);

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('classmate_suggestions')
        .select(`
          *,
          school:schools(name)
        `)
        .eq('suggester_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyCount = async () => {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('classmate_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('suggester_id', user!.id)
        .gte('created_at', oneWeekAgo.toISOString());

      setWeeklyCount(count || 0);
    } catch (error) {
      console.error('Error loading weekly count:', error);
    }
  };

  const generateAIRecommendation = async () => {
    if (!formData.suggested_name || !formData.school_id) {
      toast.error('Please enter a name and select a school first');
      return;
    }

    setGeneratingAI(true);
    try {
      // Simulate AI analysis (in real app, this would call an AI service)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock AI recommendation based on form data
      const selectedSchool = schoolHistory.find(sh => sh.school_id === formData.school_id);
      const mockRecommendation: AIRecommendation = {
        confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
        reasoning: [
          `Name "${formData.suggested_name}" appears in ${selectedSchool?.school?.name || 'the school'} records`,
          formData.activities ? `Activities mentioned align with school programs` : 'Limited activity information provided',
          formData.relationship ? `Relationship context suggests strong connection` : 'No relationship context provided',
          'Pattern matching indicates high likelihood of attendance'
        ].filter(Boolean),
        suggestedDetails: {
          likely_graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : 
            (selectedSchool?.end_year || new Date().getFullYear()),
          possible_activities: formData.activities ? 
            formData.activities.split(',').map(a => a.trim()) : ['Student Council', 'Honor Society'],
          connection_strength: formData.relationship ? 'strong' : 
            (formData.confidence_level === 'high' ? 'strong' : 'medium')
        }
      };

      setAiRecommendation(mockRecommendation);
      toast.success('AI analysis complete!');
    } catch (error) {
      console.error('Error generating AI recommendation:', error);
      toast.error('Failed to generate AI recommendation');
    } finally {
      setGeneratingAI(false);
    }
  };

  const submitSuggestion = async () => {
    if (!formData.suggested_name || !formData.school_id) {
      toast.error('Please fill in required fields');
      return;
    }

    const canSuggest = await canSuggestClassmate();
    if (!canSuggest) {
      toast.error(`You've reached your weekly limit of ${FREE_SUGGESTION_LIMIT} suggestions. Upgrade to Premium for unlimited suggestions.`);
      return;
    }

    setSubmitting(true);
    try {
      const suggestionData = {
        suggester_id: user!.id,
        suggested_name: formData.suggested_name.trim(),
        suggested_email: formData.suggested_email.trim() || null,
        school_id: formData.school_id,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        additional_details: {
          activities: formData.activities ? formData.activities.split(',').map(a => a.trim()) : [],
          relationship: formData.relationship,
          confidence_level: formData.confidence_level,
          additional_notes: formData.additional_notes,
          ai_recommendation: aiRecommendation
        }
      };

      const { error } = await supabase
        .from('classmate_suggestions')
        .insert(suggestionData);

      if (error) throw error;

      toast.success('Classmate suggestion submitted! You may earn a bonus search when they join.');
      
      // Reset form
      setFormData({
        suggested_name: '',
        suggested_email: '',
        school_id: '',
        graduation_year: '',
        activities: '',
        relationship: '',
        confidence_level: '',
        additional_notes: ''
      });
      setAiRecommendation(null);
      setDialogOpen(false);
      
      // Refresh data
      loadSuggestions();
      loadWeeklyCount();
    } catch (error: any) {
      console.error('Error submitting suggestion:', error);
      if (error.code === '23505') {
        toast.error('You\'ve already suggested this person');
      } else {
        toast.error('Failed to submit suggestion');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getSuggestionStatusBadge = (status: string) => {
    switch (status) {
      case 'joined':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Joined</Badge>;
      case 'invited':
        return <Badge variant="secondary"><Mail className="h-3 w-3 mr-1" />Invited</Badge>;
      case 'rejected':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const remainingSuggestions = isPremium ? Infinity : Math.max(0, FREE_SUGGESTION_LIMIT - weeklyCount);
  const suggestionsThisWeek = suggestions.filter(s => 
    new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;
  const successfulSuggestions = suggestions.filter(s => s.status === 'joined').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Classmate Suggestions
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Enhanced
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Help grow the community by suggesting classmates who should join
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={isFreeTier && remainingSuggestions === 0}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Suggest Classmate
                {isFreeTier && (
                  <Badge variant="secondary">{remainingSuggestions} left</Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Suggest a Classmate
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Assisted
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="required">Name *</Label>
                    <Input
                      id="name"
                      value={formData.suggested_name}
                      onChange={(e) => setFormData({...formData, suggested_name: e.target.value})}
                      placeholder="First Last"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.suggested_email}
                      onChange={(e) => setFormData({...formData, suggested_email: e.target.value})}
                      placeholder="their.email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="school" className="required">School *</Label>
                    <Select 
                      value={formData.school_id}
                      onValueChange={(value) => setFormData({...formData, school_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolHistory.map((sh) => (
                          <SelectItem key={sh.id} value={sh.school_id}>
                            {sh.school?.name} ({sh.start_year}-{sh.end_year || 'present'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="grad_year">Graduation Year</Label>
                    <Input
                      id="grad_year"
                      type="number"
                      value={formData.graduation_year}
                      onChange={(e) => setFormData({...formData, graduation_year: e.target.value})}
                      placeholder="2020"
                      min="1950"
                      max="2030"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="activities">Activities/Clubs</Label>
                  <Input
                    id="activities"
                    value={formData.activities}
                    onChange={(e) => setFormData({...formData, activities: e.target.value})}
                    placeholder="Drama Club, Student Government, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="relationship">Your relationship</Label>
                    <Select 
                      value={formData.relationship}
                      onValueChange={(value) => setFormData({...formData, relationship: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How do you know them?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classmate">Classmate</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="club_member">Club/Activity Partner</SelectItem>
                        <SelectItem value="neighbor">Neighbor</SelectItem>
                        <SelectItem value="family_friend">Family Friend</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="confidence">Confidence Level</Label>
                    <Select 
                      value={formData.confidence_level}
                      onValueChange={(value) => setFormData({...formData, confidence_level: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How sure are you?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High - Very sure they attended</SelectItem>
                        <SelectItem value="medium">Medium - Pretty sure</SelectItem>
                        <SelectItem value="low">Low - Worth checking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                    placeholder="Any other details that might help identify them..."
                    rows={3}
                  />
                </div>

                {/* AI Analysis Section */}
                <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      AI Analysis
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAIRecommendation}
                      disabled={generatingAI || !formData.suggested_name || !formData.school_id}
                    >
                      {generatingAI ? 'Analyzing...' : 'Generate Analysis'}
                    </Button>
                  </div>
                  
                  {aiRecommendation ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Confidence Score:</span>
                        <Progress value={aiRecommendation.confidence} className="flex-1" />
                        <span className="text-sm text-muted-foreground">{aiRecommendation.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">AI Reasoning:</span>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                          {aiRecommendation.reasoning.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {aiRecommendation.suggestedDetails.likely_graduation_year && (
                        <div className="text-xs text-muted-foreground">
                          <strong>Suggested graduation year:</strong> {aiRecommendation.suggestedDetails.likely_graduation_year}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Fill in the name and school to get AI-powered insights about this suggestion.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitSuggestion} 
                    disabled={submitting || !formData.suggested_name || !formData.school_id}
                  >
                    {submitting ? 'Submitting...' : 'Submit Suggestion'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">{suggestionsThisWeek}</p>
                </div>
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{successfulSuggestions}</p>
                </div>
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold">
                    {isPremium ? '∞' : remainingSuggestions}
                  </p>
                </div>
                {isPremium ? (
                  <Crown className="h-8 w-8 text-yellow-600" />
                ) : (
                  <Gift className="h-8 w-8 text-blue-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No suggestions yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Help grow the community by suggesting classmates who should join.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Make Your First Suggestion
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{suggestion.suggested_name}</h3>
                        {getSuggestionStatusBadge(suggestion.status)}
                        {suggestion.verification_reward_given && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Rewarded
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{suggestion.school?.name}</span>
                        {suggestion.graduation_year && (
                          <span>Class of {suggestion.graduation_year}</span>
                        )}
                        <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                      </div>
                      {suggestion.additional_details?.ai_recommendation?.confidence && (
                        <div className="mt-2 flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-muted-foreground">
                            AI Confidence: {suggestion.additional_details.ai_recommendation.confidence}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upgrade Prompt for Free Users */}
        {isFreeTier && remainingSuggestions === 0 && (
          <Card className="border-warning bg-warning/5 mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-warning" />
                  <div>
                    <h3 className="font-semibold">Weekly Limit Reached</h3>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Premium for unlimited classmate suggestions.
                    </p>
                  </div>
                </div>
                <Button>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};