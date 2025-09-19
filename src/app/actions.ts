'use server';

import * as xlsx from 'xlsx';
import * as xmljs from 'xml-js';
import { discoverSchema, intelligentDataTransformation, type IntelligentDataTransformationInput } from '@/ai/flows';

/**
 * Extracts the text from a CDATA section or a regular text element.
 */
function getText(element: any): string | null {
  if (!element) {
    return null;
  }
  const cdata = element.elements?.find((el: any) => el.type === 'cdata');
  if (cdata) {
    return cdata.cdata;
  }
  const text = element.elements?.find((el: any) => el.type === 'text');
  if (text) {
    return text.text;
  }
  return null;
}

/**
 * Processes a WordPress XML export file to extract product data.
 */
function processWordPressXml(fileContent: string) {
  const result: any = xmljs.xml2js(fileContent, { compact: false });
  const rss = result.elements?.find((el: any) => el.name === 'rss');
  const channel = rss?.elements?.find((el: any) => el.name === 'channel');

  if (!channel || !channel.elements) {
    throw new Error('Formato de XML do WordPress inválido. Tag <channel> não encontrada.');
  }

  const items = channel.elements.filter((el: any) => el.name === 'item');
  const products = items
    .map((item: any) => {
      const postTypeElement = item.elements?.find((el: any) => el.name === 'wp:post_type');
      const postType = getText(postTypeElement);
      
      // Filter out anything that is not a product
      if (postType !== 'product') {
        return null;
      }

      const product: Record<string, any> = {};
      item.elements?.forEach((el: any) => {
        if (el.name.startsWith('wp:')) {
          const key = el.name.replace(':', '_');
          product[key] = getText(el);
        } else if (el.name === 'title' || el.name === 'link' || el.name === 'description' || el.name === 'content:encoded') {
            const key = el.name.replace(':', '_');
            product[key] = getText(el);
        } else if (el.name === 'category') {
             product.category = getText(el);
        }
      });
      
      // Extract metadata
      const postmeta = item.elements?.filter((el: any) => el.name === 'wp:postmeta') || [];
      postmeta.forEach((meta: any) => {
        const keyEl = meta.elements?.find((el: any) => el.name === 'wp:meta_key');
        const valueEl = meta.elements?.find((el: any) => el.name === 'wp:meta_value');
        if (keyEl && valueEl) {
          const key = getText(keyEl);
          const value = getText(valueEl);
          if (key) {
            product[key] = value;
          }
        }
      });

      return product;
    })
    .filter((p: any): p is Record<string, any> => p !== null);

  if (products.length === 0) {
    throw new Error('Nenhum produto encontrado no arquivo XML do WordPress.');
  }

  return products;
}

/**
 * Action to discover the schema from an uploaded file.
 * It now intelligently handles different file types and passes the data to the AI flow.
 */
export async function discoverSchemaAction(fileContent: string | ArrayBuffer, fileType: string) {
  try {
    let records: Record<string, any>[] = [];

    if (fileType.includes('sheet') || fileType.includes('excel')) {
      const workbook = xlsx.read(fileContent, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      records = xlsx.utils.sheet_to_json(worksheet);
    } else if (fileType.includes('xml')) {
      records = processWordPressXml(fileContent as string);
    } else if (fileType.includes('json')) {
      records = JSON.parse(fileContent as string);
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
    }

    if (records.length === 0) {
      throw new Error('Nenhum dado encontrado no arquivo.');
    }

    // Convert the parsed records to a JSON string for the AI flow
    const jsonString = JSON.stringify(records, null, 2);

    // Call the intelligent schema discovery flow
    const result = await discoverSchema(jsonString);
    
    return result;
  } catch (error) {
    console.error('Erro na descoberta do esquema:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    // Ensure the function returns an object with an error property
    return { error: `Falha ao processar o arquivo: ${errorMessage}` };
  }
}

/**
 * Action to transform data using the AI flow.
 */
export async function transformDataAction(input: IntelligentDataTransformationInput) {
  try {
    const result = await intelligentDataTransformation(input);
    return result;
  } catch (error) {
    console.error('Erro na transformação dos dados:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha na transformação: ${errorMessage}` };
  }
}