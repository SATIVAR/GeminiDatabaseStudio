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
      const parsedJs = xmljs.xml2js(fileContent, { compact: false, elementsKey: 'elements' });
      
      const channel = parsedJs.elements?.find((el: any) => el.name === 'rss')?.elements?.find((el: any) => el.name === 'channel');
      if (channel && channel.elements) {
          const items = channel.elements.filter((el: any) => el.name === 'item');
          const products = items.map((item: any) => {
              const product: Record<string, any> = {};
              item.elements?.forEach((el: any) => {
                  let value: any;
                  if (el.elements && el.elements.length > 0) {
                      if (el.elements[0].type === 'cdata') {
                        value = el.elements[0].cdata;
                      } else if (el.elements[0].type === 'text') {
                        value = el.elements[0].text;
                      }
                  }

                  if (el.name === 'wp:postmeta') {
                      const metaKeyEl = el.elements?.find((e:any) => e.name === 'wp:meta_key');
                      const metaValueEl = el.elements?.find((e:any) => e.name === 'wp:meta_value');
                      
                      const metaKey = metaKeyEl?.elements?.[0]?.cdata;
                      const metaValue = metaValueEl?.elements?.[0]?.cdata;
                      if (metaKey) {
                        product[metaKey] = metaValue;
                      }
                  } else if (el.name && el.name.startsWith('wp:')) {
                     const tagName = el.name.replace('wp:', 'wp_');
                     product[tagName] = value;
                  }
                  else if(el.name === 'category'){
                    const categoryValue = el.elements?.[0]?.cdata ?? el.elements?.[0]?.text;
                    if(categoryValue) {
                        if (!product[el.name]) {
                           product[el.name] = [];
                        }
                        product[el.name].push(categoryValue);
                    }
                  }
                   else if (el.name && value){
                     product[el.name] = value;
                  }
              });
              return product;
          }).filter((p: any) => p && p['wp_post_type'] === 'product');

          if(products.length > 0) {
            jsonData = products;
            jsonString = JSON.stringify(products, null, 2);
          } else {
             // If no products, maybe it's a different XML structure
             jsonString = xmljs.xml2json(fileContent, { compact: true, spaces: 2 });
          }
      } else {
         // Fallback for non-Wordpress XML
         jsonString = xmljs.xml2json(fileContent, { compact: true, spaces: 2 });
      }

    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      const workbook = xlsx.read(fileContent, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = xlsx.utils.sheet_to_json(worksheet);
      jsonString = JSON.stringify(jsonData, null, 2);
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${fileType}. Por favor, envie arquivos JSON, XML ou Excel.`);
    }
    
    if (jsonData.length === 0 && jsonString) {
      const parsedData = JSON.parse(jsonString);
      const mainArray = findMainArray(parsedData);
      
      if (!mainArray && Object.keys(parsedData).length > 0) {
        // If it's a single object, wrap it in an array
        jsonData = [parsedData];
        jsonString = JSON.stringify(jsonData, null, 2);
      } else if (mainArray) {
         jsonData = mainArray;
         jsonString = JSON.stringify(jsonData, null, 2);
      } else {
        throw new Error('Não foi possível encontrar um array principal de objetos nos dados.');
      }
    }

    if (jsonData.length === 0) {
      throw new Error('Nenhum dado encontrado no arquivo para gerar um esquema.');
    }

    // Use a sample of the data for schema discovery to avoid overly large payloads
    const dataForSchemaDiscovery = jsonData.slice(0, 5); 
    const schemaInput = JSON.stringify(dataForSchemaDiscovery, null, 2);
    
    const schemaResponse = await discoverSchema(schemaInput);
    
    const SchemaProperties = z.object({
      type: z.literal('object'),
      properties: z.record(z.object({
        type: z.string(),
      })),
    });

    const parsedSchema = SchemaProperties.safeParse(JSON.parse(schemaResponse));
    
    if (!parsedSchema.success) {
      console.error("Schema parsing error:", parsedSchema.error);
      throw new Error('A IA falhou em gerar um esquema válido. Por favor, verifique o formato dos dados.');
    }
    
    const sampleItem = jsonData[0] || {};
    const sourceSchema: SourceField[] = Object.entries(parsedSchema.data.properties).map(([key, value]) => ({
      name: key,
      type: value.type,
      sample: sampleItem[key] ?? '',
    }));
    
    // Pass the full original data, not just the sample
    return { sourceData: jsonData, sourceSchema };

  } catch (error) {
    console.error('Erro na descoberta do esquema:', error);
    if (error instanceof Error) {
       return { error: `Falha ao processar o arquivo: ${error.message}` };
    }
    return { error: 'Ocorreu um erro desconhecido durante a descoberta do esquema.' };
  }
}

export async function transformDataAction(input: IntelligentDataTransformationInput) {
  try {
    const result = await intelligentDataTransformation(input);

    if (input.outputFormat === 'JSON') {
      try {
        JSON.parse(result.transformedData);
      } catch (e) {
        throw new Error('A IA gerou um JSON inválido. Por favor, tente novamente.');
      }
    } else if (input.outputFormat === 'SQL') {
      if (!result.transformedData.toLowerCase().includes('insert into')) {
         throw new Error('A IA gerou um SQL inválido. Por favor, tente novamente.');
      }
    } else if (input.outputFormat === 'XML') {
      if (!result.transformedData.startsWith('<')) {
        throw new Error('A IA gerou um XML inválido. Por favor, tente novamente.');
      }
    }

    return { transformedData: result.transformedData };
  } catch (error) {
    console.error('Erro na transformação:', error);
    if (error instanceof Error) {
      return { error: `A transformação falhou: ${error.message}` };
    }
    return { error: 'Ocorreu um erro desconhecido durante a transformação dos dados.' };
  }
}
