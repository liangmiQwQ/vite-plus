// Reuse upstream's module runner; importing this entry installs no Node.js hooks.
export { createImporter } from '../../../oxc-node/packages/core/importer.mjs';
export type {
  Importer,
  ImporterOptions,
  ImportOptions,
  ResolveOptions,
} from '../../../oxc-node/packages/core/importer.mjs';
