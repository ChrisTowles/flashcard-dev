import { isNumber, range, uniq } from '@antfu/utils'
import { ResolvedFontOptions } from '@flashcard-dev/types'
import type Token from 'markdown-it/lib/token'

/**
 * 1,3-5,8 => [1, 3, 4, 5, 8]
 */
export function parseRangeString(total: number, rangeStr?: string) {
  if (!rangeStr || rangeStr === 'all' || rangeStr === '*')
    return range(1, total + 1)

  const pages: number[] = []
  for (const part of rangeStr.split(/[,;]/g)) {
    if (!part.includes('-')) {
      pages.push(+part)
    }
    else {
      const [start, end] = part.split('-', 2)
      pages.push(
        ...range(+start, !end ? (total + 1) : (+end + 1)),
      )
    }
  }

  return uniq(pages).filter(i => i <= total).sort((a, b) => a - b)
}

/**
 * Accepts `16/9` `1:1` `3x4`
 */
export function parseAspectRatio(str: string | number) {
  if (isNumber(str))
    return str
  if (!isNaN(+str))
    return +str
  const [wStr = '', hStr = ''] = str.split(/[:\/x\|]/)
  const w = parseFloat(wStr.trim())
  const h = parseFloat(hStr.trim())

  if (isNaN(w) || isNaN(h) || h === 0)
    throw new Error(`Invalid aspect ratio "${str}"`)

  return w / h
}



export function stringifyMarkdownTokens(tokens: Token[]) {
  return tokens.map(token =>
    token.children
      ?.filter(t => ['text', 'code_inline'].includes(t.type) && !t.content.match(/^\s*$/))
      .map(t => t.content.trim())
      .join(' '),
  )
    .filter(Boolean)
    .join(' ')
}

export function generateGoogleFontsUrl(options: ResolvedFontOptions) {
  const weights = options.weights
    .flatMap(i => options.italic ? [`0,${i}`, `1,${i}`] : [`${i}`])
    .sort()
    .join(';')
  const fonts = options.webfonts
    .map(i => `family=${i.replace(/^(['"])(.*)\1$/, '$1').replace(/\s+/g, '+')}:${options.italic ? 'ital,' : ''}wght@${weights}`)
    .join('&')

  return `https://fonts.googleapis.com/css2?${fonts}&display=swap`
}