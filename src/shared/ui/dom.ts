export function query<T extends Element = HTMLElement>(
  selector: string,
  parent: ParentNode = document,
): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Elemen UI tidak ditemukan: ${selector}`);
  return element;
}

export function optionalQuery<T extends Element = HTMLElement>(
  selector: string,
  parent: ParentNode = document,
): T | null {
  return parent.querySelector<T>(selector);
}

export function formTarget(event: Event): HTMLFormElement {
  if (!(event.currentTarget instanceof HTMLFormElement)) throw new Error('Form tidak ditemukan.');
  return event.currentTarget;
}

export function inputValue(form: HTMLFormElement, name: string): string {
  return String(new FormData(form).get(name) ?? '').trim();
}
