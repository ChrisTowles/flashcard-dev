
import { isObject, objectMap } from '@antfu/utils'
import { FlashcardDevFeatureFlags, FlashcardDevMarkdown, FlashcardDevPreparserExtension, FlashcardDevThemeMeta, FlashcardInfo, FlashcardInfoBase, PreparserExtensionFromHeadmatter } from '@flashcard-dev/types'
import YAML from 'js-yaml'
import { resolveConfig } from './config'

export function parseMarkdownFile(raw: string): string { 
    return raw
}

export async function parse( 
{ markdown, filepath, extensions, themeMeta, onHeadmatter }: 
{ markdown: string, filepath?: string,  themeMeta?: FlashcardDevThemeMeta,  extensions?: FlashcardDevPreparserExtension[], onHeadmatter?: PreparserExtensionFromHeadmatter }): Promise<FlashcardDevMarkdown> {
  const lines = markdown.split(/\r?\n/g)
  const cards: FlashcardInfo[] = []

  let start = 0

  async function slice(end: number) {
    if (start === end)
      return
    const raw = lines.slice(start, end).join('\n')
    const card = {
      ...parseCard(raw),
      index: cards.length,
      start,
      end,
    }
    if (extensions) {
      for (const e of extensions) {
        if (e.transformCard) {
          const newContent = await e.transformCard(card.content, card.frontmatter)
          if (newContent !== undefined) {
            card.content = newContent
          }
        }
      }
    }
    cards.push(card)
    start = end + 1
  }

  // identify the headmatter, to be able to load preparser extensions
  // (strict parsing based on the parsing code)
  {
    let hm = ''
    if (lines[0].match(/^---([^-].*)?$/) && !lines[1]?.match(/^\s*$/)) {
      let hEnd = 1
      while (hEnd < lines.length && !lines[hEnd].trimEnd().match(/^---$/))
        hEnd++
      hm = lines.slice(1, hEnd).join('\n')
    }
    if (onHeadmatter) {
      const o = YAML.load(hm) ?? {}
      extensions = await onHeadmatter(o, extensions ?? [], filepath)
    }
  }

  if (extensions) {
    for (const e of extensions) {
      if (e.transformRawLines)
        await e.transformRawLines(lines)
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    if (line.match(/^---+/)) {
      await slice(i)

      const next = lines[i + 1]
      // found frontmatter, skip next dash
      if (line.match(/^---([^-].*)?$/) && !next?.match(/^\s*$/)) {
        start = i
        for (i += 1; i < lines.length; i++) {
          if (lines[i].trimEnd().match(/^---$/))
            break
        }
      }
    }
    // skip code block
    else if (line.startsWith('```')) {
      for (i += 1; i < lines.length; i++) {
        if (lines[i].startsWith('```'))
          break
      }
    }
  }

  if (start <= lines.length - 1)
    await slice(lines.length)

  const headmatter = cards[0]?.frontmatter || {}
  headmatter.title = headmatter.title || cards[0]?.title
  const config = resolveConfig(headmatter, themeMeta, filepath)
  const features = detectFeatures(markdown)

  return {
    raw: markdown,
    filepath,
    cards,
    config,
    features,
    headmatter,
    themeMeta,
  }
}

export function detectFeatures(code: string): FlashcardDevFeatureFlags {
    return {
      katex: !!code.match(/\$.*?\$/) || !!code.match(/$\$\$/),
      monaco: !!code.match(/{monaco.*}/),
      tweet: !!code.match(/<Tweet\b/),
      mermaid: !!code.match(/^```mermaid/m),
    }
  }

  function matter(code: string) {
    let data: any = {}
    const content = code.replace(/^---.*\r?\n([\s\S]*?)---/,
      (_, d) => {
        data = YAML.load(d)
        if (!isObject(data))
          data = {}
        return ''
      })
    return { data, content }
  }
  

export function parseCard(raw: string): FlashcardInfoBase {
  const result = matter(raw)
  let note: string | undefined
  const frontmatter = result.data || {}
  let content = result.content.trim()

  const comments = Array.from(content.matchAll(/<!--([\s\S]*?)-->/g))
  if (comments.length) {
    const last = comments[comments.length - 1]
    if (last.index !== undefined && last.index + last[0].length >= content.length) {
      note = last[1].trim()
      content = content.slice(0, last.index).trim()
    }
  }

  let title
  let level
  if (frontmatter.title || frontmatter.name) {
    title = frontmatter.title || frontmatter.name
    level = frontmatter.level || 1
  }
  else {
    const match = content.match(/^(#+) (.*)$/m)
    title = match?.[2]?.trim()
    level = match?.[1]?.length
  }

  return {
    raw,
    title,
    level,
    content,
    frontmatter,
    note,
  }
}

export function stringify(data: FlashcardDevMarkdown) {
  return `${
    data.cards
      .filter(card => card.source === undefined || card.inline !== undefined)
      .map((card, idx) => stringifyCard(card.inline || card, idx))
      .join('\n')
      .trim()
  }\n`
}
export function filterDisabled(data: FlashcardDevMarkdown) {
  data.cards = data.cards.filter(i => !i.frontmatter?.disabled)
  return data
}


export function stringifyCard(data: FlashcardInfoBase, idx = 0) {
  if (data.raw == null)
    prettifyCard(data)

  return (data.raw.startsWith('---') || idx === 0)
    ? data.raw
    : `---\n${data.raw.startsWith('\n') ? data.raw : `\n${data.raw}`}`
}

export function prettifyCard(data: FlashcardInfoBase) {
  data.content = `\n${data.content.trim()}\n`
  data.raw = Object.keys(data.frontmatter || {}).length
    ? `---\n${YAML.dump(data.frontmatter).trim()}\n---\n${data.content}`
    : data.content
  if (data.note)
    data.raw += `\n<!--\n${data.note.trim()}\n-->\n`
  else
    data.raw += '\n'
  return data
}

export function prettify(data: FlashcardDevMarkdown) {
  data.cards.forEach(prettifyCard)
  return data
}


export function mergeFeatureFlags(a: FlashcardDevFeatureFlags, b: FlashcardDevFeatureFlags): FlashcardDevFeatureFlags {
  return objectMap(a, (k, v) => [k, v || b[k]])
}
