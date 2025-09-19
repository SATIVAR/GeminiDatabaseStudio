'use server';

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as xlsx from 'xlsx';
import * as xmljs from 'xml-js';
import sqlite3 from 'sqlite3';
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
 * Processes an SQLite .db file to extract schema information.
 */
async function processSqliteDb(fileContent: ArrayBuffer): Promise<Record<string, any>[]> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `upload_${Date.now()}.db`);
  let db: sqlite3.Database;

  try {
    // 1. Save the file temporarily
    await fs.writeFile(tempFilePath, Buffer.from(fileContent));
    
    // 2. Connect to the SQLite database
    db = new sqlite3.Database(tempFilePath, sqlite3.OPEN_READONLY);
    
    const dbQuery = (query: string, params: any[] = []): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    };

    // 3. Introspect the schema
    const tables = await dbQuery("SELECT name FROM sqlite_master WHERE type='table';");

    if (tables.length === 0) {
      throw new Error('Nenhuma tabela encontrada no banco de dados SQLite.');
    }

    const schemaInfo: Record<string, any>[] = [];
    for (const table of tables) {
        const tableName = table.name;
        // Don't include sqlite internal tables
        if (tableName.startsWith('sqlite_')) {
            continue;
        }

        const columns = await dbQuery(`PRAGMA table_info('${tableName}');`);
        const firstRow = await dbQuery(`SELECT * FROM "${tableName}" LIMIT 1;`);

        schemaInfo.push({
            tableName: tableName,
            columns: columns,
            sampleData: firstRow[0] || {}
        });
    }

    // For schema discovery, we can just return a simplified version of one table
    // A more complex implementation would let the user choose the table in the UI
    const firstTable = schemaInfo[0];
    const records = [firstTable.sampleData];
    
    // Enrich with column types
    if (records.length > 0) {
      const enrichedRecord: Record<string, any> = {};
      for (const col of firstTable.columns) {
        enrichedRecord[col.name] = {
          value: records[0][col.name],
          type: col.type,
        };
      }
      return [enrichedRecord];
    }

    return records;

  } catch (error) {
    console.error("Erro ao processar arquivo SQLite:", error);
    throw error;
  } finally {
    // 4. Clean up: close DB and delete temporary file
    db!.close();
    await fs.unlink(tempFilePath).catch(err => console.error("Falha ao apagar arquivo temporário:", err));
  }
}


/**
 * Action to discover the schema from an uploaded file.
 * It now intelligently handles different file types and passes the data to the AI flow.
 */
export async function discoverSchemaAction(fileContent: string | ArrayBuffer, fileType: string, fileName: string) {
  try {
    let records: Record<string, any>[] = [];
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (fileExtension === 'db' || fileType === 'application/x-sqlite3') {
        records = await processSqliteDb(fileContent as ArrayBuffer);
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
      const workbook = xlsx.read(fileContent, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      records = xlsx.utils.sheet_to_json(worksheet);
    } else if (fileType.includes('xml')) {
      records = processWordPressXml(fileContent as string);
    } else if (fileType.includes('json')) {
      records = JSON.parse(fileContent as string);
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${fileType} (${fileExtension})`);
    }

    if (records.length === 0) {
      throw new Error('Nenhum dado encontrado no arquivo.');
    }

    // Convert the parsed records to a JSON string for the AI flow
    const jsonString = JSON.stringify(records, null, 2);
    
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
