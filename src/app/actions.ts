'use server';

import { discoverSchema, intelligentDataTransformation, type IntelligentDataTransformationInput } from '@/ai/flows';
import xmljs from 'xml-js';
import * as xlsx from 'xlsx';
import { z } from 'zod';
import type { SourceField } from '@/components/data-studio/types';

// Helper to find the main array of objects in a JSON structure
const findMainArray = (data: any): any[] | null => {
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
        return data[key];
      }
      const nested = findMainArray(data[key]);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
};

export async function discoverSchemaAction(fileContent: string, fileType: string) {
  try {
    let jsonData: Record<string, any>[] = [];
    let jsonString = '';

    if (fileType.includes('json')) {
      jsonString = fileContent;
    } else if (fileType.includes('xml')) {
      const result = xmljs.xml2json(fileContent, { compact: true, spaces: 2 });
      jsonString = result;
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      const workbook = xlsx.read(fileContent, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = xlsx.utils.sheet_to_json(worksheet);
      jsonString = JSON.stringify(jsonData, null, 2);
    } else {
      throw new Error(`Unsupported file type: ${fileType}. Please upload JSON, XML, or Excel files.`);
    }

    const parsedData = JSON.parse(jsonString);
    const mainArray = findMainArray(parsedData);
    
    if (!mainArray) {
      throw new Error('Could not find a main array of objects in the data.');
    }
    
    jsonData = mainArray;

    // Use a sample of the data for schema discovery to avoid oversized payloads
    const dataForSchemaDiscovery = jsonData.slice(0, 5);
    if (dataForSchemaDiscovery.length === 0) {
      throw new Error('No data found to generate a schema.');
    }
    
    const schemaResponse = await discoverSchema(JSON.stringify(dataForSchemaDiscovery));
    
    const SchemaProperties = z.object({
      type: z.literal('object'),
      properties: z.record(z.object({
        type: z.string(),
      })),
    });

    const parsedSchema = SchemaProperties.safeParse(JSON.parse(schemaResponse));
    
    if (!parsedSchema.success) {
      throw new Error('AI failed to generate a valid schema. Please check the data format.');
    }

    const sourceSchema: SourceField[] = Object.entries(parsedSchema.data.properties).map(([key, value]) => ({
      name: key,
      type: value.type,
      sample: jsonData[0]?.[key] ?? '',
    }));
    
    return { sourceData: jsonData, sourceSchema };

  } catch (error) {
    console.error('Schema discovery error:', error);
    if (error instanceof Error) {
       return { error: `Failed to process file: ${error.message}` };
    }
    return { error: 'An unknown error occurred during schema discovery.' };
  }
}

export async function transformDataAction(input: IntelligentDataTransformationInput) {
  try {
    const result = await intelligentDataTransformation(input);

    // Basic validation
    if (input.outputFormat === 'JSON') {
      try {
        JSON.parse(result.transformedData);
      } catch (e) {
        throw new Error('AI generated invalid JSON. Please try again.');
      }
    } else if (input.outputFormat === 'SQL') {
      if (!result.transformedData.toLowerCase().includes('insert into')) {
         throw new Error('AI generated invalid SQL. Please try again.');
      }
    } else if (input.outputFormat === 'XML') {
      // Very basic XML check
      if (!result.transformedData.startsWith('<')) {
        throw new Error('AI generated invalid XML. Please try again.');
      }
    }

    return { transformedData: result.transformedData };
  } catch (error) {
    console.error('Transformation error:', error);
    if (error instanceof Error) {
      return { error: `Transformation failed: ${error.message}` };
    }
    return { error: 'An unknown error occurred during data transformation.' };
  }
}
