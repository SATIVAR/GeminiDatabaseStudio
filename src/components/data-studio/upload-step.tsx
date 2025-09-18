'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { discoverSchemaAction } from '@/app/actions';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SourceField } from './types';

interface UploadStepProps {
  onSuccess: (data: { sourceData: Record<string, any>[], sourceSchema: SourceField[] }) => void;
  setIsLoading: (isLoading: boolean) => void;
  setLoadingMessage: (message: string) => void;
}

export const UploadStep = ({ onSuccess, setIsLoading, setLoadingMessage }: UploadStepProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadingMessage('Analyzing file structure...');
    
    try {
      const fileType = file.type;
      let fileContent: string | ArrayBuffer;

      if (fileType.includes('sheet') || fileType.includes('excel')) {
        fileContent = await file.arrayBuffer();
      } else {
        fileContent = await file.text();
      }
      
      const result = await discoverSchemaAction(fileContent as any, fileType);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      onSuccess(result as any);

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Could not process the file.',
      });
      setIsLoading(false);
    }
  }, [onSuccess, setIsLoading, setLoadingMessage, toast]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFile(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  }, [handleFile]);

  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(event);
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(event);
    setIsDragging(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFile(event.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragEvents}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={cn(
        "w-full h-[40vh] max-w-3xl glass-card flex flex-col items-center justify-center p-8 text-center cursor-pointer border-dashed border-2",
        isDragging ? "border-accent glow-accent" : "border-muted-foreground/30"
      )}
    >
      <input
        id="file-upload"
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        accept=".json,.xml,.xlsx,.xls,.csv"
      />
      <label htmlFor="file-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
        <UploadCloud
          className={cn(
            "w-20 h-20 mb-4 transition-colors",
            isDragging ? "text-accent" : "text-muted-foreground"
          )}
        />
        <h2 className="text-2xl font-semibold">
          {isDragging ? "Drop it like it's hot!" : "Drag & drop your data file here"}
        </h2>
        <p className="text-muted-foreground mt-2">
          or click to browse. Supports XML, Excel, and JSON files.
        </p>
      </label>
    </div>
  );
};
