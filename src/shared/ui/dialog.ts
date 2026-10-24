import { query } from './dom';
import type { Disposable } from '../../core/types';

export interface Dialog extends Disposable {
  element: HTMLElement;
}
let activeDialog: Dialog | null = null;

export function closeDialog(): void {
  activeDialog?.destroy();
}

export function openDialog(title: string, content: string, onClose?: () => void): Dialog {
  closeDialog();
  const previous = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const panel = document.createElement('section');
  panel.className = 'modal management-dialog';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', title);
  panel.tabIndex = -1;
  const close = document.createElement('button');
  close.className = 'modal-close icon-button';
  close.type = 'button';
  close.setAttribute('aria-label', 'Tutup');
  close.textContent = '×';
  const heading = document.createElement('h2');
  heading.textContent = title;
  panel.append(close, heading);
  const body = document.createElement('div');
  body.innerHTML = content;
  panel.append(body);
  overlay.append(panel);
  document.body.append(overlay);
  const events = new AbortController();
  const dialog: Dialog = {
    element: overlay,
    destroy() {
      if (!overlay.isConnected) return;
      events.abort();
      overlay.remove();
      if (activeDialog === dialog) activeDialog = null;
      onClose?.();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    },
  };
  close.addEventListener('click', () => dialog.destroy(), { signal: events.signal });
  overlay.addEventListener(
    'click',
    (event) => {
      if (event.target === overlay) dialog.destroy();
    },
    { signal: events.signal },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        dialog.destroy();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]'),
      ].filter(
        (element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0,
      );
      const first = focusable.at(0),
        last = focusable.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    },
    { signal: events.signal },
  );
  activeDialog = dialog;
  query<HTMLElement>('section', overlay).focus();
  return dialog;
}
