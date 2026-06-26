/** Built-in visualization plugins — add new files to `loaders` to ship them automatically. */
import { registerRenderer } from '../../js/design/plugins.js';

const loaders = [
  () => import('./minimal-list.js'),
];

export async function loadAllDataPlugins() {
  for (const load of loaders) {
    const mod = await load();
    if (typeof mod.register === 'function') {
      mod.register(registerRenderer);
    } else if (mod.default?.render) {
      registerRenderer(mod.default.id || 'plugin', mod.default);
    }
  }
}
