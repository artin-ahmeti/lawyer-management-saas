/** Download a browser-generated file. Object URLs are short lived and never leave the device. */
export function downloadFile(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csv(rows: (string | number | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let text = value === null ? '' : String(value);
          // Neutralize spreadsheet formulas supplied through narratives or contact names.
          if (typeof value === 'string' && /^[=+@\-\t\r]/.test(text)) text = `'${text}`;
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
}

export async function copyText(text: string) {
  if (!navigator.clipboard) throw new Error('Clipboard is unavailable. Copy from the address bar.');
  await navigator.clipboard.writeText(text);
}
