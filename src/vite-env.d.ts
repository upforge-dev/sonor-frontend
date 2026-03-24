/// <reference types="vite/client" />

declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGSVGElement>>
  export default ReactComponent
}

// Optionally, declare the specific vars you use for better autocomplete:
interface ImportMetaEnv {
  readonly VITE_DS_ACCOUNT_ID: string
  readonly VITE_DS_BRAND_ID?: string
  // add more VITE_* as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}