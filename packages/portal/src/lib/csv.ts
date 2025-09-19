export type CsvValue = string | number | boolean | null | undefined;

function escapeValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (/[,\n"\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function toCsv(rows: Record<string, CsvValue>[], headers?: string[]): string {
  if (rows.length === 0) {
    return '';
  }
  const keys = headers ?? Object.keys(rows[0]);
  const headerRow = keys.join(',');
  const dataRows = rows.map((row) => keys.map((key) => escapeValue(row[key])).join(','));
  return [headerRow, ...dataRows].join('\n');
}
