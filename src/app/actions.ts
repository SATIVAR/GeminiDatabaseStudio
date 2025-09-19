'use server';

import type { IntelligentDataTransformationInput } from '@/ai/flows';
import type { SourceField } from '@/components/data-studio/types';

export async function discoverSchemaAction(fileContent: string, fileType: string) {
  console.log('discoverSchemaAction called but is disabled.');
  // Returning an error to prevent the UI from proceeding.
  return { error: 'A funcionalidade de IA está temporariamente desativada.' };
}

export async function transformDataAction(input: IntelligentDataTransformationInput) {
  console.log('transformDataAction called but is disabled.');
  // Returning an error to prevent the UI from proceeding.
  return { error: 'A funcionalidade de IA está temporariamente desativada.' };
}
