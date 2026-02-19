import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'txt') {
      const text = await file.text();
      return NextResponse.json({ text });
    }

    if (ext === 'pdf') {
      // Use pdfjs-dist for PDF text extraction on the server
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: unknown) => {
              const obj = item as Record<string, unknown>;
              return typeof obj.str === 'string' ? obj.str : '';
            })
            .join(' ');
          fullText += pageText + '\n';
        }

        return NextResponse.json({ text: fullText.trim() });
      } catch (pdfErr) {
        console.error('PDF extraction error:', pdfErr);
        return NextResponse.json({ error: 'Failed to extract text from PDF. Try a .txt file instead.' }, { status: 200 });
      }
    }

    if (ext === 'docx') {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return NextResponse.json({ text: result.value });
      } catch (docxErr) {
        console.error('DOCX extraction error:', docxErr);
        return NextResponse.json({ error: 'Failed to extract text from DOCX.' }, { status: 200 });
      }
    }

    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Extract API error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
