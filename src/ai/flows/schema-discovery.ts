'use server';
/**
 * @fileOverview A flow for discovering the schema of a JSON data structure.
 *
 * This file is temporarily disabled.
 */

import {z} from 'genkit';

const DiscoverSchemaInputSchema = z.string().nullable().describe('A JSON string representing the data to analyze.');
export type DiscoverSchemaInput = z.infer<typeof DiscoverSchemaInputSchema>;

const DiscoverSchemaOutputSchema = z.string().describe('A JSON string representing the inferred schema of the input data.');
export type DiscoverSchemaOutput = z.infer<typeof DiscoverSchemaOutputSchema>;

export async function discoverSchema(input: DiscoverSchemaInput): Promise<DiscoverSchemaOutput> {
  throw new Error('This function is temporarily disabled.');
}
