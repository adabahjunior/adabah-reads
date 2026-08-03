/**
 * Client-side PDF text extraction. Runs in the browser so page count is only
 * limited by the user's machine — nothing is uploaded to extract text.
 */

export type PdfExtractResult = {
  pageCount: number;
  charCount: number;
  text: string;
};

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

function tidy(input: string) {
  return input
    .replace(/\u00AD/g, "")
    .replace(/-\n/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export async function extractPdfText(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PdfExtractResult> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(tidy(pageText));
    page.cleanup();
    onProgress?.(pageNumber, doc.numPages);
    // Yield to the event loop so the UI keeps painting on huge documents.
    if (pageNumber % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  const pageCount = doc.numPages;
  doc.cleanup();

  const text = pages.filter(Boolean).join("\n\n");
  return { pageCount, charCount: text.length, text };
}
