// src/ai/flows/schema-discovery.ts
'use server';
/**
 * @fileOverview A flow for discovering the schema of a JSON data structure.
 *
 * - discoverSchema - A function that takes a JSON string as input and returns a JSON schema string.
 * - DiscoverSchemaInput - The input type for the discoverSchema function (a JSON string).
 * - DiscoverSchemaOutput - The return type for the discoverSchema function (a JSON schema string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiscoverSchemaInputSchema = z.string().nullable().describe('A JSON string representing the data to analyze.');
export type DiscoverSchemaInput = z.infer<typeof DiscoverSchemaInputSchema>;

const DiscoverSchemaOutputSchema = z.string().describe('A JSON string representing the inferred schema of the input data.');
export type DiscoverSchemaOutput = z.infer<typeof DiscoverSchemaOutputSchema>;

export async function discoverSchema(input: DiscoverSchemaInput): Promise<DiscoverSchemaOutput> {
  return discoverSchemaFlow(input);
}

// Define the input schema for the prompt as non-nullable string
const DiscoverSchemaPromptInputSchema = z.string().describe('A JSON string representing the data to analyze.');

const discoverSchemaPrompt = ai.definePrompt({
  name: 'discoverSchemaPrompt',
  input: {schema: DiscoverSchemaPromptInputSchema},
  output: {schema: DiscoverSchemaOutputSchema},
  prompt: `You are a data analyst. Analyze the following JSON data structure and identify the main entities, their fields, and their data types. Return a JSON schema representing this structure.

Data: {{{$input}}}`, // Access the input JSON string using Handlebars syntax
});

const discoverSchemaFlow = ai.defineFlow(
  {
    name: 'discoverSchemaFlow',
    inputSchema: DiscoverSchemaInputSchema,
    outputSchema: DiscoverSchemaOutputSchema,
  },
  async input => {
    if (input === null || typeof input === 'undefined') {
      throw new Error('Input data is null or undefined.');
    }
    const {output} = await discoverSchemaPrompt(input);
    return output!;
  }
);
