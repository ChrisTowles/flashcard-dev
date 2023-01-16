import { FlashcardDevConfig } from "./config"

export interface FlashcardInfoBase {
  raw: string
  content: string
  note?: string
  frontmatter: Record<string, any>
  title?: string
  level?: number
}


export interface FlashcardInfoWithPath extends FlashcardInfoBase {
  filepath: string
}

export interface FlashcardInfo extends FlashcardInfoBase {
  index: number
  start: number
  end: number
  inline?: FlashcardInfoBase
  source?: FlashcardInfoWithPath
}


export interface FlashcardDevFeatureFlags {
  katex: boolean
  monaco: boolean
  tweet: boolean
  mermaid: boolean
}

export type FlashcardDevThemeConfig = Record<string, string | number>

export interface FlashcardDevThemeMeta {
  defaults?: Partial<FlashcardDevConfig>
  colorSchema?: 'dark' | 'light' | 'both'
  highlighter?: 'prism'
}

export interface FlashcardDevMarkdown {
  slides: FlashcardInfo[]
  raw: string
  config: FlashcardDevConfig
  features: FlashcardDevFeatureFlags
  headmatter: Record<string, unknown>

  filepath?: string
  entries?: string[]
  themeMeta?: FlashcardDevThemeMeta
}
