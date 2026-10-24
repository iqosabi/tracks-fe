import { loginView } from './login-view';
import { query } from '../../shared/ui/dom';
import { messageOf } from '../../shared/data/guards';
import type { Disposable } from '../../core/types';

interface LoginOptions {
  root: HTMLElement;
  restoring?: boolean;
  message?: string;
  onLogin(username: string, password: string): Promise<void>;
  onDemo(): void;
  onConfigure(): void;
}

export function mountLogin(options: LoginOptions): Disposable {
  const { root, onLogin, onDemo, onConfigure } = options;
  root.innerHTML = loginView({ sessionError: options.message, loading: options.restoring });
  const events = new AbortController();
  const form = query<HTMLFormElement>('#login-form', root);
  const submit = query<HTMLButtonElement>('[type=submit]', form);
  query('#demo', root).addEventListener('click', onDemo, { signal: events.signal });
  query('#configure', root).addEventListener('click', onConfigure, { signal: events.signal });
  query('#toggle-password', root).addEventListener(
    'click',
    () => {
      const password = query<HTMLInputElement>('[name=password]', form);
      password.type = password.type === 'password' ? 'text' : 'password';
      query('#toggle-password', root).setAttribute(
        'aria-label',
        password.type === 'password' ? 'Tampilkan password' : 'Sembunyikan password',
      );
    },
    { signal: events.signal },
  );
  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      const data = new FormData(form);
      submit.disabled = true;
      submit.textContent = 'Menghubungkan…';
      void onLogin(String(data.get('username') ?? '').trim(), String(data.get('password') ?? ''))
        .catch((error: unknown) => {
          if (events.signal.aborted) return;
          let notice = root.querySelector<HTMLElement>('#login-error');
          if (!notice) {
            notice = document.createElement('div');
            notice.id = 'login-error';
            notice.className = 'notice error';
            notice.setAttribute('role', 'alert');
            form.before(notice);
          }
          notice.textContent = messageOf(error);
        })
        .finally(() => {
          if (!events.signal.aborted) {
            submit.disabled = false;
            submit.textContent = 'Masuk ke workspace';
          }
        });
    },
    { signal: events.signal },
  );
  return {
    destroy() {
      events.abort();
      form.reset();
    },
  };
}
