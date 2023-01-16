import { toArray, uniq } from '@antfu/utils'
import type {  FontOptions, ResolvedFontOptions, FlashcardDevConfig, FlashcardDevThemeMeta } from '@flashcard-dev/types'
import { parseAspectRatio } from './utils'

export function resolveConfig(headmatter: any, themeMeta: FlashcardDevThemeMeta = {}, filepath?: string, verify = false) {
  const themeColorSchema = ['light', 'dark'].includes(themeMeta.colorSchema || '') ? themeMeta.colorSchema as 'light' | 'dark' : undefined

  const defaultConfig: FlashcardDevConfig = {
    theme: 'default',
    title: 'Flashcard-Dev',
    titleTemplate: '%s - Flashcard-Dev',
    favicon: '/favicon-wrong-path.ico',
    remoteAssets: false,
    monaco: 'dev',
    download: false,
    info: false,
    lineNumbers: false,
    colorSchema: themeColorSchema || 'auto',
    routerMode: 'history',
    aspectRatio: 16 / 9,
    canvasWidth: 980,
    exportFilename: '',
    selectable: false,
    themeConfig: {},
    fonts: {} as ResolvedFontOptions,
    codeCopy: true,
    css: 'windicss',
  }
  const config: FlashcardDevConfig = {
    ...defaultConfig,
    ...themeMeta.defaults,
    ...headmatter.config,
    ...headmatter,
    fonts: resolveFonts({
      ...themeMeta.defaults?.fonts,
      ...headmatter.config?.fonts,
      ...headmatter?.fonts,
    }),
  }

  if (config.colorSchema !== 'dark' && config.colorSchema !== 'light')
    config.colorSchema = 'auto'
  if (themeColorSchema && config.colorSchema === 'auto')
    config.colorSchema = themeColorSchema

  config.aspectRatio = parseAspectRatio(config.aspectRatio)

  if (verify)
    verifyConfig(config, themeMeta)

  return config
}

export function verifyConfig(
  config: FlashcardDevConfig,
  themeMeta: FlashcardDevThemeMeta = {},
  warn = (v: string) => console.warn(`[FlashcardDev] ${v}`),
) {
  
  const themeColorSchema = ['light', 'dark'].includes(themeMeta.colorSchema || '') ? themeMeta.colorSchema as 'light' | 'dark' : undefined

  if (themeColorSchema && config.colorSchema !== themeColorSchema)
    warn(`Color schema "${config.colorSchema}" does not supported by the theme`)


  if (!['windicss', undefined].includes(config.css)) {
    warn(`Unsupported Atomic CSS engine "${config.css}", fallback to Windi CSS`)
    config.css = 'windicss'
  }
}

export function resolveFonts(fonts: FontOptions = {}): ResolvedFontOptions {
  const {
    fallbacks = true,
    italic = false,
    provider = 'google',
  } = fonts
  let sans = toArray(fonts.sans).flatMap(i => i.split(/,\s*/g)).map(i => i.trim())
  let serif = toArray(fonts.serif).flatMap(i => i.split(/,\s*/g)).map(i => i.trim())
  let mono = toArray(fonts.mono).flatMap(i => i.split(/,\s*/g)).map(i => i.trim())
  const weights = toArray(fonts.weights || '200,400,600').flatMap(i => i.toString().split(/,\s*/g)).map(i => i.trim())
  const custom = toArray(fonts.custom).flatMap(i => i.split(/,\s*/g)).map(i => i.trim())

  const local = toArray(fonts.local).flatMap(i => i.split(/,\s*/g)).map(i => i.trim())
  const webfonts = fonts.webfonts
    ? fonts.webfonts
    : fallbacks
      ? uniq([...sans, ...serif, ...mono, ...custom])
      : []

  webfonts.filter((i: any) => local.includes(i))

  function toQuoted(font: string) {
    if (/^(['"]).*\1$/.test(font))
      return font
    return `"${font}"`
  }

  if (fallbacks) {
    sans = uniq([
      ...sans.map(toQuoted),
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      '"Noto Sans"',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
      '"Noto Color Emoji"',
    ])
    serif = uniq([
      ...serif.map(toQuoted),
      'ui-serif',
      'Georgia',
      'Cambria',
      '"Times New Roman"',
      'Times',
      'serif',
    ])
    mono = uniq([
      ...mono.map(toQuoted),
      'ui-monospace',
      'SFMono-Regular',
      'Menlo',
      'Monaco',
      'Consolas',
      '"Liberation Mono"',
      '"Courier New"',
      'monospace',
    ])
  }

  return {
    sans,
    serif,
    mono,
    webfonts,
    provider,
    local,
    italic,
    weights,
  }
}

