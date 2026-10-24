import type { Disposable, Notify } from '../../core/types';

export function createToast(element: HTMLElement): { notify: Notify } & Disposable {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    notify(message) {
      element.textContent = message;
      element.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => element.classList.remove('show'), 4500);
    },
    destroy() {
      clearTimeout(timer);
      element.classList.remove('show');
    },
  };
}
