import 'leaflet/dist/leaflet.css';
import './shared/styles/base.css';
import './shared/styles/identity.css';
import './shared/styles/workspace.css';
import './shared/styles/controls.css';
import { startApplication } from './app/application';
import { query } from './shared/ui/dom';

try {
  const application = startApplication(query('#app'), query('#toast'));
  if (import.meta.hot) import.meta.hot.dispose(() => application.destroy());
} catch {
  const root = query('#app');
  root.innerHTML =
    '<main class="startup-error" role="alert"><h1>Workspace belum dapat dimuat.</h1><p>Periksa konfigurasi aplikasi, lalu muat ulang.</p><button class="button primary" type="button">Muat ulang</button></main>';
  query('button', root).onclick = () => location.reload();
}
