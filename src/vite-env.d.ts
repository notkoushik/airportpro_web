/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DYNAMSOFT_LICENSE: string;
  readonly VITE_DYNAMSOFT_LICENSE_KEY: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
