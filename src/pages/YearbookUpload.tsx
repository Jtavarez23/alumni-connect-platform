// Alumni Connect - Yearbook Upload Page
// Wraps the YearbookUploadWizard component for the /yearbooks/upload route

import React from 'react';
import { useNavigate } from 'react-router-dom';
import YearbookUploadWizard from '@/components/yearbooks/YearbookUploadWizard';
import type { UUID } from '@/types/alumni-connect';

export default function YearbookUpload() {
  const navigate = useNavigate();

  const handleUploadComplete = (yearbookId: UUID) => {
    // Navigate to the uploaded yearbook
    navigate(`/yearbooks/${yearbookId}`);
  };

  return (
    <div className="container mx-auto py-8">
      <YearbookUploadWizard onComplete={handleUploadComplete} />
    </div>
  );
}