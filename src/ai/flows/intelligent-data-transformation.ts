'use server';

/**
 * @fileOverview An intelligent data transformation AI agent.
 *
 * - intelligentDataTransformation - A function that transforms data based on a user-defined schema.
 * - IntelligentDataTransformationInput - The input type for the intelligentDataTransformation function.
 * - IntelligentDataTransformationOutput - The return type for the intelligentDataTransformation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DataFieldSchema = z.object({
  sourceField: z.string().describe('The name of the field in the source data.'),
  targetField: z.string().describe('The desired name of the field in the transformed data.'),
  include: z.boolean().describe('Whether or not to include this field in the output.'),
  dataType: z.string().describe('The desired data type of the field (e.g., string, number, boolean).').optional(),
});

const IntelligentDataTransformationInputSchema = z.object({
  sourceData: z.string().describe('The source data in JSON format.'),
  targetSchema: z.array(DataFieldSchema).describe('The user-defined schema for the transformation.'),
  outputFormat: z.enum(['JSON', 'SQL', 'XML']).describe('The desired output format.'),
});

export type IntelligentDataTransformationInput = z.infer<typeof IntelligentDataTransformationInputSchema>;

const IntelligentDataTransformationOutputSchema = z.object({
  transformedData: z.string().describe('The transformed data in the specified output format.'),
});

export type IntelligentDataTransformationOutput = z.infer<typeof IntelligentDataTransformationOutputSchema>;


export async function intelligentDataTransformation(input: IntelligentDataTransformationInput): Promise<IntelligentDataTransformationOutput> {
  return intelligentDataTransformationFlow(input);
}

const canConvertType = ai.defineTool({
    name: 'canConvertType',
    description: 'Determines if a data type conversion is possible.',
    inputSchema: z.object({
      fromType: z.string().describe('The original data type.'),
      toType: z.string().describe('The target data type.'),
      value: z.string().describe('The value to be converted'),
    }),
    outputSchema: z.boolean(),
  },
  async (input) => {
    try {
      if (input.toType === 'number') {
        return !isNaN(Number(input.value));
      }
      if (input.toType === 'boolean') {
        const lowerCaseValue = input.value.toLowerCase();
        return lowerCaseValue === 'true' || lowerCaseValue === 'false';
      }
      return true;
    } catch (e) {
      return false;
    }
  }
);

const prompt = ai.definePrompt({
  name: 'intelligentDataTransformationPrompt',
  tools: [canConvertType],
  input: {schema: IntelligentDataTransformationInputSchema},
  output: {schema: IntelligentDataTransformationOutputSchema},
  prompt: `You are an expert ETL engineer.

      Your task is to transform the provided source data into the desired format, adhering to the user-defined schema.

      Source Data:
      {{sourceData}}

      Target Schema:
      {{#each targetSchema}}
        - Source Field: {{sourceField}}, Target Field: {{targetField}}, Include: {{include}}, Data Type: {{dataType}}\n
      {{/each}}

      Output Format: {{outputFormat}}

      Instructions:
      1.  For each field in the source data, check if it is present in the target schema and if the include flag is true.
      2.  If a target field is included, rename it to the target field name.
      3.  If a data type is specified, attempt to convert the data to the specified type. Only convert the type if the canConvertType tool returns true.
      4.  If a data type conversion is not possible or no data type is specified, keep the original data type.
      5.  If a field is not included, do not include it in the output.
      6.  Format the final output as {{outputFormat}}.

      Example:
      Source Data:
      {
        "product_id": "123",
        "product_name": "Awesome Product",
        "price": "99.99",
        "in_stock": "true"
      }

      Target Schema:
      [
        { "sourceField": "product_id", "targetField": "id", "include": true, "dataType": "number" },
        { "sourceField": "product_name", "targetField": "name", "include": true, "dataType": "string" },
        { "sourceField": "price", "targetField": "cost", "include": true, "dataType": "number" },
        { "sourceField": "in_stock", "targetField": "available", "include": true, "dataType": "boolean" }
      ]

      Output:
      {
        "id": 123,
        "name": "Awesome Product",
        "cost": 99.99,
        "available": true
      }

      Now, transform the source data according to the target schema and output format.
      Ensure valid output format.
      `, 
});

const intelligentDataTransformationFlow = ai.defineFlow(
  {
    name: 'intelligentDataTransformationFlow',
    inputSchema: IntelligentDataTransformationInputSchema,
    outputSchema: IntelligentDataTransformationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
