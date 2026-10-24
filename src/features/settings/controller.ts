import type { AuthClient } from '../../core/auth/client';
import type { FeatureController, Notify } from '../../core/types';
import { apiFor } from '../../core/api/client';
import { clearCartoKey, saveCartoKey } from '../../core/config/runtime';
import { settingsView } from './view';
import { query } from '../../shared/ui/dom';
import { messageOf } from '../../shared/data/guards';

interface SettingsOptions {
  element: HTMLElement;
  auth: AuthClient;
  demo: boolean;
  notify: Notify;
  onSaveBase(value: string): void;
  onLogout(all?: boolean): void;
}

export function mountSettings(options: SettingsOptions): FeatureController {
  const { element, auth, demo, notify } = options;
  const events = new AbortController();
  const request = new AbortController();
  function render(): void {
    element.innerHTML = settingsView({ demo, user: auth.user });
    const connection = query<HTMLFormElement>('#settings-form', element);
    connection.onsubmit = (event) => {
      event.preventDefault();
      try {
        options.onSaveBase(String(new FormData(connection).get('cmsBase') ?? ''));
      } catch (error) {
        notify(messageOf(error));
      }
    };
    const maps = query<HTMLFormElement>('#map-settings', element);
    maps.onsubmit = (event) => {
      event.preventDefault();
      try {
        saveCartoKey(String(new FormData(maps).get('cartoKey') ?? ''));
        render();
        notify('Key peta tersimpan di browser ini.');
      } catch (error) {
        notify(messageOf(error));
      }
    };
    query('#clear-carto-key', element).onclick = () => {
      clearCartoKey();
      render();
      notify('Peta menggunakan konfigurasi runtime.');
    };
    query('#logout-current', element).onclick = () => options.onLogout();
    element
      .querySelector<HTMLElement>('#logout-all')
      ?.addEventListener('click', () => options.onLogout(true), { signal: events.signal });
  }
  render();
  return {
    async refresh() {
      if (demo) {
        notify('Pengaturan demo diperbarui.');
        return;
      }
      try {
        await apiFor(auth).request('/auth/me', { signal: request.signal });
        notify('Profil CMS terverifikasi.');
      } catch (error) {
        if (!events.signal.aborted) notify(messageOf(error));
      }
    },
    destroy() {
      events.abort();
      request.abort();
    },
  };
}
