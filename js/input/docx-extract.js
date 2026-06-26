import mammoth from 'mammoth';

export async function extractDocxFile(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return { text: result.value || '', messages: result.messages || [] };
}
