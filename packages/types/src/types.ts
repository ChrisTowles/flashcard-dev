
export interface FashcardInfoBase {
  raw: string
  contentQuestion: string
  contentAnswer: string
  note?: string
  frontmatter: Record<string, any>
  title?: string
  level?: number
}
