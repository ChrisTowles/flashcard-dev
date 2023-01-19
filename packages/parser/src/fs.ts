import { promises as fs } from 'fs'
import { dirname, resolve } from 'path'
import type { PreparserExtensionLoader, FlashcardInfo, FlashcardInfoWithPath, FlashcardDevMarkdown, FlashcardDevPreparserExtension, FlashcardDevThemeMeta } from '@flashcard-dev/types'
import { detectFeatures, mergeFeatureFlags, parse, stringify, stringifyCard } from './core'
export * from './core'

let preparserExtensionLoader: PreparserExtensionLoader | null = null

export function injectPreparserExtensionLoader(fn: PreparserExtensionLoader) {
  preparserExtensionLoader = fn
}

export async function load(filepath: string, themeMeta?: FlashcardDevThemeMeta, content?: string) {
  const dir = dirname(filepath)
  const markdown = content ?? await fs.readFile(filepath, 'utf-8')

  const preparserExtensions: FlashcardDevPreparserExtension[] = []
  const data = await parse({
      markdown, filepath, extensions: [], themeMeta: themeMeta, onHeadmatter: async (headmatter, exts: FlashcardDevPreparserExtension[], filepath: string | undefined) => {
        preparserExtensions.splice(0, preparserExtensions.length,
          ...exts,
          ...preparserExtensionLoader ? await preparserExtensionLoader(headmatter, filepath) : [])
        return preparserExtensions
      }
    })

  const entries = new Set([filepath,  ])

  for (let iCard = 0; iCard < data.cards.length;) {
    const baseCard = data.cards[iCard]
    if (!baseCard.frontmatter.src) {
      iCard++
      continue
    }

    data.cards.splice(iCard, 1)

    if (baseCard.frontmatter.hide)
      continue

    const srcExpression = baseCard.frontmatter.src
    let path
    if (srcExpression.startsWith('/'))
      path = resolve(dir, srcExpression.substring(1))
    else if (baseCard.source?.filepath)
      path = resolve(dirname(baseCard.source.filepath), srcExpression)
    else
      path = resolve(dir, srcExpression)

    const raw = await fs.readFile(path, 'utf-8')
    const subCards = await parse({ markdown: raw, filepath: path, themeMeta: themeMeta, extensions: preparserExtensions })

    for (const [offset, subCard] of subCards.cards.entries()) {
      const card: FlashcardInfo = { ...baseCard }

      card.source = {
        filepath: path,
        ...subCard,
      }

      if (offset === 0 && !baseCard.frontmatter.srcSequence) {
        card.inline = { ...baseCard }
        delete card.inline.frontmatter.src
        Object.assign(card, card.source, { raw: null })
      }
      else {
        Object.assign(card, card.source)
      }

      const baseSlideFrontMatterWithoutSrc = { ...baseCard.frontmatter }
      delete baseSlideFrontMatterWithoutSrc.src

      card.frontmatter = {
        ...subCard.frontmatter,
        ...baseSlideFrontMatterWithoutSrc,
        srcSequence: `${baseCard.frontmatter.srcSequence ? `${baseCard.frontmatter.srcSequence},` : ''}${srcExpression}`,
      }

      data.features = mergeFeatureFlags(data.features, detectFeatures(raw))
      entries.add(path)
      data.cards.splice(iCard + offset, 0, card)
    }
  }
  // re-index cards
  for (let iCard = 0; iCard < data.cards.length; iCard++)
    data.cards[iCard].index = iCard === 0 ? 0 : 1 + data.cards[iCard - 1].index

  data.entries = Array.from(entries)

  return data
}

export async function save(data: FlashcardDevMarkdown, filepath?: string) {
  const updatedFilepath = filepath || data.filepath!

  await fs.writeFile(updatedFilepath, stringify(data), 'utf-8')
}

export async function saveExternalSlide(card: FlashcardInfoWithPath) {
  await fs.writeFile(card.filepath, stringifyCard(card), 'utf-8')
}
