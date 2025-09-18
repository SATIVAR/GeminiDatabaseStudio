'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw, FileCode2 } from 'lucide-react';
import type { OutputFormat } from './types';
import { ScrollArea } from '../ui/scroll-area';

interface PreviewStepProps {
  data: string;
  format: OutputFormat;
  onStartOver: () => void;
}

export const PreviewStep = ({ data, format, onStartOver }: PreviewStepProps) => {
  const handleDownload = () => {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados_transformados.${format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full glass-card">
       <CardHeader>
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/50">
              <FileCode2 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <CardTitle className="text-2xl">Transformação Concluída</CardTitle>
              <CardDescription>Aqui estão seus dados transformados, prontos para uso.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[50vh] rounded-md border bg-black/30 p-4">
            <pre className="text-sm font-code text-white whitespace-pre-wrap break-all">
                <code>{data}</code>
            </pre>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex justify-end gap-4">
        <Button variant="outline" onClick={onStartOver}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Começar de Novo
        </Button>
        <Button onClick={handleDownload} className="glow-primary">
          <Download className="mr-2 h-4 w-4" />
          Baixar Arquivo
        </Button>
      </CardFooter>
    </Card>
  );
};
