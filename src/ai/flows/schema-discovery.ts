'use server';
/**
 * @fileOverview A flow for intelligently discovering the schema of a JSON data structure.
 *
 * This file defines the Genkit flow that analyzes a JSON string and infers its schema.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Defines the input schema for the discovery flow. It expects a JSON string.
export const DiscoverSchemaInputSchema = z.string().describe('A JSON string representing the data to analyze.');
export type DiscoverSchemaInput = z.infer<typeof DiscoverSchemaInputSchema>;

// Defines the shape of a single field in the discovered schema.
const SourceFieldSchema = z.object({
  name: z.string().describe('The name of the field.'),
  type: z.string().describe('The inferred data type (e.g., string, number, boolean, date).'),
  sample: z.any().describe('A sample value for the field from the source data.'),
});

// Defines the output schema for the discovery flow.
export const DiscoverSchemaOutputSchema = z.object({
  sourceSchema: z.array(SourceFieldSchema).describe('The inferred schema of the input data.'),
  sourceData: z.array(z.record(z.any())).describe('The original source data parsed as a JSON object.'),
});
export type DiscoverSchemaOutput = z.infer<typeof DiscoverSchemaOutputSchema>;


// The Genkit prompt that instructs the AI on how to perform schema discovery.
const discoverSchemaPrompt = ai.definePrompt({
  name: 'discoverSchemaPrompt',
  input: { schema: DiscoverSchemaInputSchema },
  output: { schema: DiscoverSchemaOutputSchema },
  prompt: `
    You are a senior data analyst. Your task is to analyze a JSON object and infer its schema.
    
    Instructions:
    1.  The user will provide a JSON string.
    2.  Parse this string into a JSON object (it will be an array of objects).
    3.  Analyze the fields of the first object in the array to determine the schema.
    4.  For each field, determine its name, infer its data type (string, number, boolean, date, or object), and provide a sample value from the first record.
    5.  Return an object containing two keys:
        - "sourceSchema": An array of objects, where each object represents a field with its 'name', 'type', and 'sample'.
        - "sourceData": The original data, parsed as a full JSON object.
    
    JSON Data to Analyze:
    \`\`\`json
    {{{input}}}
    \`\`\`
  `,
});


// The Genkit flow that orchestrates the schema discovery.
const discoverSchemaFlow = ai.defineFlow(
  {
    name: 'discoverSchemaFlow',
    inputSchema: DiscoverSchemaInputSchema,
    outputSchema: DiscoverSchemaOutputSchema,
  },
  async (input) => {
    // Ensure the input is a non-empty string.
    if (!input || typeof input !== 'string' || input.trim() === '') {
        throw new Error('Input data is null, undefined, or empty.');
    }
    const { output } = await discoverSchemaPrompt(input);
    return output!;
  }
);


/**
 * Public function to invoke the schema discovery flow.
 * @param input The JSON string to be analyzed.
 * @returns A promise that resolves to the discovered schema and parsed data.
 */
export async function discoverSchema(input: DiscoverSchemaInput): Promise<DiscoverSchemaOutput> {
  return await discoverSchemaFlow(input);
}
