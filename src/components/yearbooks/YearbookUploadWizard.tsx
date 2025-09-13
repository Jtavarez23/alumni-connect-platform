import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  FileText, 
  School, 
  Shield, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import type { UUID } from "@/types/alumni-connect";

type UploadStep = 'select' | 'details' | 'review' | 'uploading' | 'complete';

interface UploadState {
  files: File[];
  schoolId: string;
  classYear: string;
  title: string;
  isPublic: boolean;
}

interface YearbookUploadWizardProps {
  onComplete?: (yearbookId: string) => void;
}

const YearbookUploadWizard = ({ onComplete }: YearbookUploadWizardProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<UploadStep>('select');
  const [uploadState, setUploadState] = useState<UploadState>({
    files: [],
    schoolId: '',
    classYear: '',
    title: '',
    isPublic: false
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [yearbookId, setYearbookId] = useState<string>('');

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => 
      ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) &&
      file.size <= 500 * 1024 * 1024 // 500MB limit
    );

    if (validFiles.length === 0) {
      toast.error("Please select PDF, JPG, or PNG files under 500MB");
      return;
    }

    setUploadState(prev => ({ ...prev, files: validFiles }));
    setCurrentStep('details');
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadState.schoolId || !uploadState.classYear) {
      toast.error("Please select a school and class year");
      return;
    }
    setCurrentStep('review');
  };

  const ensureStorageBuckets = async () => {
    const buckets = ['yearbooks-originals', 'yearbooks-tiles', 'post-media'];
    
    for (const bucket of buckets) {
      try {
        const { error } = await supabase.storage.createBucket(bucket, {
          public: bucket === 'yearbooks-tiles',
          fileSizeLimit: 500 * 1024 * 1024 // 500MB
        });
        
        if (error && error.code !== 'bucket_already_exists') {
          console.warn(`Failed to create bucket ${bucket}:`, error.message);
        }
      } catch (error) {
        console.warn(`Error ensuring bucket ${bucket}:`, error);
      }
    }
  };

  const startUpload = async () => {
    if (!user || uploadState.files.length === 0) return;

    setCurrentStep('uploading');
    
    try {
      // Ensure storage buckets exist
      await ensureStorageBuckets();

      // Create yearbook record
      const { data: yearbook, error: createError } = await supabase
        .from('yearbooks')
        .insert({
          school_id: uploadState.schoolId,
          class_year_id: uploadState.classYear,
          title: uploadState.title,
          uploaded_by: user.id,
          page_count: uploadState.files.length,
          status: 'pending',
          visibility: uploadState.isPublic ? 'public' : 'alumni_only'
        })
        .select()
        .single();

      if (createError) throw createError;
      setYearbookId(yearbook.id);

      // Upload files to storage
      for (let i = 0; i < uploadState.files.length; i++) {
        const file = uploadState.files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${yearbook.id}/page_${i + 1}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('yearbooks-originals')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Update progress
        setUploadProgress(((i + 1) / uploadState.files.length) * 100);
      }

      // Trigger processing pipeline
      const { error: processError } = await supabase.rpc('start_yearbook_processing', {
        yearbook_id: yearbook.id
      });

      if (processError) throw processError;

      setCurrentStep('complete');
      toast.success("Upload successful! Your yearbook is being processed.");
      if (onComplete) {
        onComplete(yearbook.id);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Something went wrong during upload");
      setCurrentStep('review');
    }
  };

  const resetWizard = () => {
    setUploadState({
      files: [],
      schoolId: '',
      classYear: '',
      title: '',
      isPublic: false
    });
    setUploadProgress(0);
    setCurrentStep('select');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Upload Yearbook
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Step 1: File Selection */}
          {currentStep === 'select' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  id="yearbook-upload"
                />
                <label
                  htmlFor="yearbook-upload"
                  className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                >
                  Select Files
                </label>
                <p className="text-sm text-muted-foreground mt-2">
                  PDF, JPG, or PNG files up to 500MB each
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">School</label>
                <select
                  value={uploadState.schoolId}
                  onChange={(e) => setUploadState(prev => ({ ...prev, schoolId: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select a school</option>
                  {/* Schools will be loaded from database */}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Class Year</label>
                <input
                  type="number"
                  value={uploadState.classYear}
                  onChange={(e) => setUploadState(prev => ({ ...prev, classYear: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., 2005"
                  min="1900"
                  max="2030"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Yearbook Title (Optional)</label>
                <input
                  type="text"
                  value={uploadState.title}
                  onChange={(e) => setUploadState(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Senior Yearbook 2005"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={uploadState.isPublic}
                  onChange={(e) => setUploadState(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm">
                  Make this yearbook publicly visible
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep('select')}>
                  Back
                </Button>
                <Button type="submit">
                  Continue
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Files to upload:</h4>
                <ul className="text-sm text-muted-foreground">
                  {uploadState.files.map((file, index) => (
                    <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep('details')}>
                  Back
                </Button>
                <Button onClick={startUpload}>
                  Start Upload
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Uploading */}
          {currentStep === 'uploading' && (
            <div className="space-y-4 text-center">
              <Upload className="h-12 w-12 text-primary mx-auto animate-pulse" />
              <p>Uploading {uploadState.files.length} files...</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round(uploadProgress)}% complete
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-medium">Upload Complete!</h3>
              <p className="text-muted-foreground">
                Your yearbook is being processed. This may take a few minutes.
              </p>
              <Button onClick={resetWizard}>
                Upload Another Yearbook
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YearbookUploadWizard;