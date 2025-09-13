import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileImage, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BulkUploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  url?: string;
  error?: string;
  pageNumber?: number;
}

interface BulkYearbookUploadProps {
  open: boolean;
  onClose: () => void;
  yearbookId: string;
  onSuccess: () => void;
}

export function BulkYearbookUpload({ open, onClose, yearbookId, onSuccess }: BulkYearbookUploadProps) {
  const [files, setFiles] = useState<BulkUploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: BulkUploadFile[] = acceptedFiles.map((file, index) => ({
      file,
      id: crypto.randomUUID(),
      status: 'pending',
      progress: 0,
      pageNumber: files.length + index + 1
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`Added ${acceptedFiles.length} pages to upload queue`);
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.pdf']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB per file
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startBulkUpload = async () => {
    setUploading(true);
    
    try {
      // Upload files in chunks to avoid overwhelming the server
      const chunkSize = 3;
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize);
        await Promise.all(chunk.map(uploadFile));
      }
      
      // Start AI processing for photo recognition
      setAiProcessing(true);
      await processWithAI();
      
      toast.success('Yearbook upload completed successfully!');
      onSuccess();
      
    } catch (error) {
      console.error('Bulk upload failed:', error);
      toast.error('Some files failed to upload. Please try again.');
    } finally {
      setUploading(false);
      setAiProcessing(false);
    }
  };

  const uploadFile = async (uploadFile: BulkUploadFile) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      const fileName = `${yearbookId}/page-${uploadFile.pageNumber}-${Date.now()}.${uploadFile.file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('yearbook-pages')
        .upload(fileName, uploadFile.file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, progress: percent }
                : f
            ));
          }
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('yearbook-pages')
        .getPublicUrl(fileName);

      // Save page to database
      await supabase
        .from('yearbook_pages')
        .insert({
          edition_id: yearbookId,
          page_number: uploadFile.pageNumber,
          image_url: publicUrl,
          ai_processing_status: 'pending'
        });

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100, url: publicUrl }
          : f
      ));

    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
    }
  };

  const processWithAI = async () => {
    // Trigger AI processing for all uploaded pages
    const { error } = await supabase.functions.invoke('process-yearbook-ai', {
      body: { yearbookId }
    });
    
    if (error) {
      console.error('AI processing failed:', error);
      toast.error('AI processing failed. Photos will need manual tagging.');
    } else {
      toast.success('AI processing started! Photos will be auto-detected and ready for claiming.');
    }
  };

  const totalProgress = files.length > 0 
    ? files.reduce((sum, file) => sum + file.progress, 0) / files.length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Yearbook Upload
            <Badge variant="outline">{files.length} pages</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            `}
          >
            <input {...getInputProps()} />
            <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              {isDragActive ? 'Drop yearbook pages here' : 'Upload Yearbook Pages'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop multiple images or PDF pages, or click to browse
            </p>
            <Badge variant="secondary">
              Supports JPG, PNG, WebP, PDF • Max 50MB per file
            </Badge>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading pages...</span>
                <span>{Math.round(totalProgress)}%</span>
              </div>
              <Progress value={totalProgress} />
              {aiProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  AI processing photos for automatic tagging...
                </div>
              )}
            </div>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Pages to Upload</h4>
                <Button 
                  onClick={startBulkUpload} 
                  disabled={uploading || files.length === 0}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload All Pages
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <Card key={file.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Page {file.pageNumber}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="aspect-[3/4] bg-muted rounded mb-2 overflow-hidden">
                        <img 
                          src={URL.createObjectURL(file.file)} 
                          alt={`Page ${file.pageNumber}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="text-xs text-muted-foreground truncate mb-2">
                        {file.file.name}
                      </div>

                      <div className="flex items-center gap-2">
                        {file.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        {file.status === 'uploading' && (
                          <>
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs">{Math.round(file.progress)}%</span>
                          </>
                        )}
                        {file.status === 'success' && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Uploaded
                          </Badge>
                        )}
                        {file.status === 'error' && (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>

                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="mt-2 h-1" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}