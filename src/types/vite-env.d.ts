/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __NAVET_ENABLE_DEMO__: boolean;

interface ImportMetaEnv {
  readonly VITE_NAVET_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
