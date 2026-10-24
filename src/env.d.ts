import type { PublicConfig } from './core/config/runtime';

declare global {
  var TRACKS_PUBLIC_CONFIG: PublicConfig | undefined;
}
export {};
