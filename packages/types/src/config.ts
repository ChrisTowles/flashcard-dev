import { FlashcardDevThemeConfig } from "./types"

export interface FlashcardDevConfig {
  title: string
  /**
   * String template to compose title
   *
   * @example "%s - Flashcard-Dev" - to suffix " - Flashcard-Dev" to all pages
   * @default '%s - Flashcard-Dev'
   */
  titleTemplate: string
  /**
   * Theme to use for the slides
   *
   * @default 'default'
   */
  theme: string
  /**
   * List of FlashcardDev addons
   *
   * @default []
   */
  // addons: string[]
  /**
   * Download remote assets in local using vite-plugin-remote-assets
   *
   * @default false
   */
  remoteAssets: boolean | 'dev' | 'build'
  /**
   * Enable Monaco
   *
   * @see https://sli.dev/custom/config-monaco.html
   * @default 'dev'
   */
  monaco: boolean | 'dev' | 'build'
  /**
   * Show a download button in the SPA build,
   * could also be a link to custom pdf
   *
   * @default false
   */
  download: boolean | string
  /**
   * Show a copy button in code blocks
   *
   * @default true
   */
  codeCopy: boolean
  /**
   * Information shows on the built SPA
   * Can be a markdown string
   *
   * @default false
   */
  info: string | boolean
  
  // highlighter: 'prism' 
  /**
   * Show line numbers in code blocks
   *
   * @default false
   */
  lineNumbers: boolean
  /**
   * Force slides color schema
   *
   * @default 'auto'
   */
  colorSchema: 'dark' | 'light' | 'all' | 'auto'
  /**
   * Router mode for vue-router
   *
   * @default 'history'
   */
  routerMode: 'hash' | 'history'
  /**
   * Aspect ratio for slides
   * should be like `16/9` or `1:1`
   *
   * @default '16/9'
   */
  aspectRatio: number
  /**
   * The actual width for slides canvas.
   * unit in px.
   *
   * @default '980'
   */
  canvasWidth: number
  /**
   * Force the filename used when exporting the presentation.
   * The extension, e.g. .pdf, gets automatically added.
   *
   * @default ''
   */
  exportFilename: string | null
  /**
   * Controls whether texts in slides are selectable
   *
   * @default true
   */
  selectable: boolean
  /**
   * Configure for themes, will inject intro root styles as
   * `--flashcard-dev-theme-x` for attribute `x`
   *
   * This allows themes to have customization options in frontmatter
   * Refer to themes' document for options available
   *
   * @default {}
   */
  themeConfig: FlashcardDevThemeConfig
  /**
   * Configure fonts for the slides and app
   *
   * @default {}
   */
  fonts: ResolvedFontOptions
  /**
   * Configure the icon for app
   *
   * @default 'https://cdn.jsdelivr.net/gh/slidevjs/slidev/assets/favicon.png'
   */
  favicon: string

  /**
   * Engine for atomic CSS
   *
   * @default 'windicss'
   */
  css: 'windicss' 
}

export interface FontOptions {
  /**
   * Sans serif fonts (default fonts for most text)
   */
  sans?: string | string[]
  /**
   * Serif fonts
   */
  serif?: string | string[]
  /**
   * Monospace fonts, for code blocks and etc.
   */
  mono?: string | string[]
  /**
   * Load webfonts for custom CSS (does not apply anywhere by default)
   */
  custom?: string | string[]
  /**
   * Weights for fonts
   *
   * @default [200, 400, 600]
   */
  weights?: string | (string | number)[]
  /**
   * Import italic fonts
   *
   * @default false
   */
  italic?: boolean

  /**
   * @default 'google'
   */
  provider?: 'none' | 'google'
  /**
   * Specify web fonts names, will detect from `sans`, `mono`, `serif` if not provided
   */
  webfonts?: string[]
  /**
   * Specify local fonts names, be excluded from webfonts
   */
  local?: string[]
  /**
   * Use fonts fallback
   *
   * @default true
   */
  fallbacks?: boolean
}

export interface ResolvedFontOptions {
  sans: string[]
  mono: string[]
  serif: string[]
  weights: string[]
  italic: boolean
  provider: 'none' | 'google'
  webfonts: string[]
  local: string[]
}
