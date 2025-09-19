'use server';

/**
 * @fileOverview An intelligent data transformation AI agent.
 *
 * This file defines the Genkit flow for transforming source data based on a
 * user-defined target schema.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Defines the schema for a single field mapping.
const DataFieldSchema = z.object({
  sourceField: z.string().describe('The name of the field in the source data.'),
  targetField: z.string().describe('The desired name of the field in the transformed data.'),
  include: z.boolean().describe('Whether or not to include this field in the output.'),
  dataType: z.string().describe('The desired data type of the field (e.g., string, number, boolean).').optional(),
});

// Defines the input schema for the entire transformation flow.
export const IntelligentDataTransformationInputSchema = z.object({
  sourceData: z.string().describe('The source data in JSON format.'),
  targetSchema: z.array(DataFieldSchema).describe('The user-defined schema for the transformation.'),
  outputFormat: z.enum(['JSON', 'SQL', 'XML']).describe('The desired output format.'),
});
export type IntelligentDataTransformationInput = z.infer<typeof IntelligentDataTransformationInputSchema>;

// Defines the output schema for the transformation flow.
export const IntelligentDataTransformationOutputSchema = z.object({
  transformedData: z.string().describe('The transformed data in the specified output format.'),
});
export type IntelligentDataTransformationOutput = z.infer<typeof IntelligentDataTransformationOutputSchema>;

// The Genkit prompt for the transformation.
const transformPrompt = ai.definePrompt({
  name: 'intelligentDataTransformer',
  input: { schema: IntelligentDataTransformationInputSchema },
  output: { schema: IntelligentDataTransformationOutputSchema },
  prompt: `
    You are an expert ETL (Extract, Transform, Load) engineer. Your task is to transform the provided source data into the desired output format based on the user's mapping instructions.

    - Source Data: A JSON string containing an array of objects.
    - Target Schema: An array of mapping rules. Each rule specifies a source field, a target field, whether to include it, and an optional data type.
    - Output Format: The final format for the data (JSON, SQL, or XML).

    Instructions:
    1.  Iterate through each object in the source JSON data.
    2.  For each object, apply the rules from the target schema.
    3.  Only include fields where 'include' is true.
    4.  Rename fields from 'sourceField' to 'targetField' as specified.
    5.  If a 'dataType' is provided (string, number, boolean), attempt to cast the value to that type. Handle casting errors gracefully.
    6.  Format the final output as a valid string in the specified 'outputFormat'.
        - For SQL, generate 'INSERT' statements. Assume a table name of 'transformed_data'.
        - For XML, use '<root>' as the main container and '<item>' for each object.
    
    Source Data:
    \`\`\`json
    {{{sourceData}}}
    \`\`\`

    Target Schema:
    \`\`\`json
    {{{jsonStringify targetSchema}}}
    \`\`\`

    Output Format: {{outputFormat}}
  `,
  helpers: {
    jsonStringify: (obj: any) => JSON.stringify(obj, null, 2),
  }
});

// The Genkit flow that executes the transformation.
const intelligentDataTransformationFlow = ai.defineFlow(
  {
    name: 'intelligentDataTransformationFlow',
    inputSchema: IntelligentDataTransformationInputSchema,
    outputSchema: IntelligentDataTransformationOutputSchema,
  },
  async (input) => {
    if (!input.sourceData || !input.targetSchema || input.targetSchema.length === 0) {
      throw new Error('Invalid input: Source data and target schema must be provided.');
    }
    const result = await transformPrompt(input);
    return result.output!;
  }
);


/**
 * Public function to invoke the intelligent data transformation flow.
 * @param input The transformation configuration.
 * @returns A promise that resolves to the transformed data.
 */
export async function intelligentDataTransformation(input: IntelligentDataTransformationInput): Promise<IntelligentDataTransformationOutput> {
  return await intelligentDataTransformationFlow(input);
}
