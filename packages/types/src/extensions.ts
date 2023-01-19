  
export interface FlashcardDevPreparserExtension {
    name: string
    transformRawLines?(lines: string[]): Promise<void>
    transformCard?(content: string, frontmatter: any): Promise<string | undefined>
  }
  
  export type PreparserExtensionLoader = (headmatter?: Record<string, unknown>, filepath?: string) => Promise<FlashcardDevPreparserExtension[]>
  
  export type PreparserExtensionFromHeadmatter = (headmatter: any, exts: FlashcardDevPreparserExtension[], filepath?: string) => Promise<FlashcardDevPreparserExtension[]>
  