// Alumni Connect - Yearbook Reader Page
// Wraps the YearbookReader component for the /yearbooks/:id route

import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { YearbookReader as YearbookReaderComponent } from '@/components/yearbooks/YearbookReader';

export default function YearbookReader() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;

  if (!id) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Yearbook not found</h1>
        <p className="text-neutral-600 mt-2">The yearbook ID is invalid or missing.</p>
      </div>
    );
  }

  return <YearbookReaderComponent yearbookId={id} page={page} />;
}