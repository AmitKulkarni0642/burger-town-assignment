/** Turns rows into CSV text. Values containing commas, quotes or line breaks are quoted. */
export function toCsv(rows: unknown[][]): string {
  const cell = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",") + "\r\n").join("");
}
