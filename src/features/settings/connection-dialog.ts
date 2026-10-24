import { openDialog } from '../../shared/ui/dialog';
import { query } from '../../shared/ui/dom';
import { escape } from '../../shared/data/presentation';
import { messageOf } from '../../shared/data/guards';
import { readConfig } from '../../core/config/runtime';

export function showConnectionDialog(save: (value: string) => void): void {
  const dialog = openDialog(
    'Hubungkan CMS API',
    `
    <p>Gunakan URL CMS yang melayani autentikasi dan modul operasional.</p>
    <form id="config-form">
      <label class="field">CMS API base URL
        <input type="url" name="cmsBase" value="${escape(readConfig().cmsBase)}" required>
      </label>
      <div id="config-error" class="form-error" role="alert"></div>
      <button class="button primary full" type="submit">Simpan & buka login</button>
    </form>`,
  );
  const form = query<HTMLFormElement>('form', dialog.element);
  form.onsubmit = (event) => {
    event.preventDefault();
    try {
      save(String(new FormData(form).get('cmsBase') ?? ''));
      dialog.destroy();
    } catch (error) {
      query('#config-error', dialog.element).textContent = messageOf(error);
    }
  };
}
