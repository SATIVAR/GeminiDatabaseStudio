'use client';

import { useState } from 'react';
import { UploadCloud, DatabaseZap } from 'lucide-react';

import type { SourceField, TargetField, OutputFormat } from '@/components/data-studio/types';
import { UploadStep } from '@/components/data-studio/upload-step';
import { MappingStep } from '@/components/data-studio/mapping-step';
import { PreviewStep } from '@/components/data-studio/preview-step';
import { LoadingAnimation } from '@/components/data-studio/loading-animation';
import { transformDataAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [sourceData, setSourceData] = useState<Record<string, any>[]>([]);
  const [sourceSchema, setSourceSchema] = useState<SourceField[]>([]);
  
  const [transformedData, setTransformedData] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('JSON');
  
  const { toast } = useToast();

  const handleUploadSuccess = (data: { sourceData: Record<string, any>[], sourceSchema: SourceField[] }) => {
    setSourceData(data.sourceData);
    setSourceSchema(data.sourceSchema);
    setStep(2);
    setIsLoading(false);
  };

  const handleTransform = async (targetSchema: TargetField[], format: OutputFormat) => {
    setIsLoading(true);
    setLoadingMessage('Realizando transformação inteligente...');
    setOutputFormat(format);

    try {
      const result = await transformDataAction({
        sourceData: JSON.stringify(sourceData),
        targetSchema,
        outputFormat: format,
      });

      if (result.error) {
        throw new Error(result.error);
      }
      
      setTransformedData(result.transformedData!);
      setStep(3);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Falha na Transformação',
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep(1);
    setSourceData([]);
    setSourceSchema([]);
    setTransformedData('');
  };

  const renderStep = () => {
    if (isLoading) {
      return <LoadingAnimation message={loadingMessage} />;
    }

    switch (step) {
      case 1:
        return (
          <UploadStep 
            onSuccess={handleUploadSuccess} 
            setIsLoading={setIsLoading}
            setLoadingMessage={setLoadingMessage}
          />
        );
      case 2:
        return (
          <MappingStep 
            sourceSchema={sourceSchema} 
            onTransform={handleTransform} 
          />
        );
      case 3:
        return (
          <PreviewStep 
            data={transformedData} 
            format={outputFormat} 
            onStartOver={handleStartOver} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-hidden p-4 pt-20 md:p-8 md:pt-20">
      
      <main className="z-10 flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
        <div className="flex items-center gap-4 mb-4">
           <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50 shadow-[0_0_15px_0_hsl(var(--primary)/0.5)]">
             <DatabaseZap size={28} className="text-primary" />
           </div>
           <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
            Gemini Data Studio
          </h1>
        </div>
        <p className="text-muted-foreground text-lg md:text-xl mb-10 text-center max-w-2xl">
          Faça o upload, mapeie e transforme seus dados em qualquer formato com um mecanismo de IA.
        </p>

        <div className="w-full transition-all duration-500">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
