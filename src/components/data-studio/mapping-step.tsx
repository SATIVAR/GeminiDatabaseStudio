'use client';

import { useState } from 'react';
import type { SourceField, TargetField, OutputFormat } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Settings2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MappingStepProps {
  sourceSchema: SourceField[];
  onTransform: (targetSchema: TargetField[], format: OutputFormat) => void;
}

export const MappingStep = ({ sourceSchema, onTransform }: MappingStepProps) => {
  const [targetSchema, setTargetSchema] = useState<TargetField[]>(
    sourceSchema.map(field => ({
      sourceField: field.name,
      targetField: field.name,
      include: true,
      dataType: 'auto',
    }))
  );
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('JSON');

  const handleFieldChange = (index: number, newValues: Partial<TargetField>) => {
    const updatedSchema = [...targetSchema];
    updatedSchema[index] = { ...updatedSchema[index], ...newValues };
    setTargetSchema(updatedSchema);
  };

  const handleSubmit = () => {
    onTransform(targetSchema, outputFormat);
  };

  return (
    <Card className="w-full glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50">
              <Settings2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Define Target Schema</CardTitle>
              <CardDescription>Map source fields to your desired output structure.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[50vh] pr-4">
          <Table>
            <TableHeader className="sticky top-0 bg-card/80 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[50px]">Include</TableHead>
                <TableHead>Source Field</TableHead>
                <TableHead>Target Field</TableHead>
                <TableHead className="w-[150px]">Data Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targetSchema.map((field, index) => (
                <TableRow key={field.sourceField}>
                  <TableCell>
                    <Checkbox
                      checked={field.include}
                      onCheckedChange={(checked) => handleFieldChange(index, { include: !!checked })}
                      aria-label={`Include ${field.sourceField}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{field.sourceField}</TableCell>
                  <TableCell>
                    <Input
                      value={field.targetField}
                      onChange={(e) => handleFieldChange(index, { targetField: e.target.value })}
                      className="font-mono"
                      disabled={!field.include}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={field.dataType}
                      onValueChange={(value: 'string' | 'number' | 'boolean' | 'auto') => handleFieldChange(index, { dataType: value })}
                      disabled={!field.include}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Data Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Output Format:</span>
             <Select value={outputFormat} onValueChange={(v: OutputFormat) => setOutputFormat(v)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="SQL">SQL (Inserts)</SelectItem>
                    <SelectItem value="XML">XML</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <Button onClick={handleSubmit} size="lg" className="glow-primary hover:glow-primary">
          Transform Data <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
