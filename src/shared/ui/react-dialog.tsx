import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { openDialog } from './dialog';
export function DialogView({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    let unmounting = false;
    const dialog = openDialog(title, '', () => {
      if (!unmounting) callback.current();
    });
    const panel = dialog.element.querySelector('section');
    const body = panel?.lastElementChild;
    if (body instanceof HTMLElement) setHost(body);
    return () => {
      unmounting = true;
      dialog.destroy();
    };
  }, [title]);
  return host ? createPortal(children, host) : null;
}
