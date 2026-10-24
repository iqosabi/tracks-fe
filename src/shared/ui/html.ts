export const escape = (v: unknown): string =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
/** Readable HTML templates. Escape untrusted interpolations with escape() before use. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, part, index) => result + part + String(values[index] ?? ''), '');
}
