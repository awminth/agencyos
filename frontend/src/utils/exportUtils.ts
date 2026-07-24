/**
 * Excel (xlsx-js-style) + PDF (jspdf download) export helpers
 */
import XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showError } from './swal';

export type CellValue = string | number | null | undefined;

const thinBorder = {
  top: { style: 'thin', color: { rgb: '334155' } },
  bottom: { style: 'thin', color: { rgb: '334155' } },
  left: { style: 'thin', color: { rgb: '334155' } },
  right: { style: 'thin', color: { rgb: '334155' } },
};

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '1E40AF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinBorder,
};

const dataCellStyle = {
  border: thinBorder,
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'export';
}

function toCell(value: CellValue) {
  if (value === null || value === undefined) return '';
  return value;
}

/** Styled .xlsx download — centered columns + table borders (all Excel exports) */
export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: CellValue[][],
  options?: { title?: string }
) {
  const aoa: CellValue[][] = [];
  if (options?.title) {
    aoa.push([options.title]);
    aoa.push([`Exported: ${new Date().toLocaleString()}`]);
    aoa.push([]);
  }
  aoa.push(headers);
  rows.forEach((r) => aoa.push(r.map(toCell)));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const titleOffset = options?.title ? 3 : 0;
  const headerRowIndex = titleOffset;

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Ensure every table cell exists so borders apply to empty cells too
  for (let R = headerRowIndex; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    }
  }

  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
    ws[addr].s = headerStyle;
  }

  for (let R = headerRowIndex + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      ws[addr].s = {
        ...dataCellStyle,
        fill: { fgColor: { rgb: R % 2 === 0 ? 'F8FAFC' : 'FFFFFF' } },
      };
    }
  }

  if (options?.title) {
    const titleAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[titleAddr]) {
      ws[titleAddr].s = {
        font: { bold: true, sz: 14, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    const metaAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[metaAddr]) {
      ws[metaAddr].s = {
        font: { sz: 10, color: { rgb: '64748B' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(headers.length - 1, 0) } },
    ];
  }

  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(toCell(r[i])).length),
      8
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Sheet1');
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`);
}

/** Download a PDF file (no print dialog) */
export function exportToPDF(
  title: string,
  headers: string[],
  rows: CellValue[][],
  options?: { subtitle?: string; filename?: string }
) {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(title, pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const meta = [
      options?.subtitle || '',
      new Date().toLocaleString(),
      `${rows.length} rows`,
    ]
      .filter(Boolean)
      .join(' · ');
    doc.text(meta, pageWidth / 2, 20, { align: 'center' });

    autoTable(doc, {
      startY: 26,
      head: [headers.map((h) => String(h))],
      body: rows.map((row) => row.map((c) => String(toCell(c)))),
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        halign: 'center',
        valign: 'middle',
        lineColor: [51, 65, 85],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 10, right: 10 },
    });

    const fileBase = options?.filename || title;
    doc.save(`${sanitizeFilename(fileBase)}.pdf`);
  } catch (err) {
    console.error(err);
    void showError('PDF Export', 'PDF ဖိုင် ထုတ်၍ မရပါ။ ထပ်မံ ကြိုးစားပါ။');
  }
}

/** Legacy CSV (kept for compatibility) */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF';
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const val = cell === undefined || cell === null ? '' : String(cell);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizeFilename(filename)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Direct system print dialog — prints on-page element (keeps Tailwind styles; no PDF page) */
export function printElement(elementId: string, _title: string = 'Document Print') {
  const elem = document.getElementById(elementId);
  if (!elem) {
    void showError('Print', 'Printable element not found');
    return;
  }

  elem.classList.add('print-target');
  document.body.classList.add('is-printing');

  const cleanup = () => {
    document.body.classList.remove('is-printing');
    elem.classList.remove('print-target');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Allow logo/layout to settle, then open system print dialog directly
  requestAnimationFrame(() => {
    window.print();
    // Fallback if afterprint does not fire (some browsers)
    setTimeout(cleanup, 1500);
  });
}

/** Capture print preview as PNG for clipboard / share (chat apps, etc.) */
export async function copyElementAsImage(
  elementId: string,
  filename: string = 'voucher.png'
): Promise<'copied' | 'shared' | 'downloaded'> {
  const elem = document.getElementById(elementId);
  if (!elem) {
    throw new Error('Printable element not found');
  }

  // html2canvas-pro supports modern CSS colors (oklch) used by Tailwind v4.
  // Plain html2canvas throws: Attempting to parse an unsupported color function "oklch"
  const { default: html2canvas } = await import('html2canvas-pro');
  const canvas = await html2canvas(elem, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) {
    throw new Error('Could not create image');
  }

  const safeName = sanitizeFilename(filename).replace(/\.png$/i, '') + '.png';
  const file = new File([blob], safeName, { type: 'image/png' });

  // Clipboard image write works on secure contexts (https OR localhost — not plain LAN http IPs)
  if (
    window.isSecureContext &&
    typeof ClipboardItem !== 'undefined' &&
    navigator.clipboard?.write
  ) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 'copied';
    } catch {
      // fall through
    }
  }

  // Native share sheet (mobile) — send like a photo
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: safeName });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
    }
  }

  // Last resort: download PNG
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
