import { basename, resolve } from 'path'
import fg from 'fast-glob'
import { describe, expect, it } from 'vitest'
import { load, parse, prettify, stringify } from './fs'
import type { FlashcardDevPreparserExtension } from '@flashcard-dev/types'

describe('md parser', () => {
  const files = fg.sync('*.md', {
    cwd: resolve(__dirname, '../tests/fixtures/markdown'),
    absolute: true,
  })
  if(files.length === 0) {
    throw new Error('No test files found')
  }
  
  for (const file of files) {
  
    it(basename(file), async () => {
      const data = await load(file)

      expect(stringify(data).trim()).toEqual(data.raw.trim())

      prettify(data)

      for (const slide of data.cards) {
        if (slide.source?.filepath)
          // @ts-expect-error non-optional
          delete slide.source.filepath
        // @ts-expect-error extra prop
        if (slide.filepath)
          // @ts-expect-error extra prop
          delete slide.filepath
      }
      expect(data.cards).toMatchSnapshot('cards')
      expect(data.config).toMatchSnapshot('config')
      expect(data.features).toMatchSnapshot('features')
    })
  }

  it('parse', async () => {
    const data = await parse({ markdown: `
a

---

b

---
layout: z
---
c
----
d
----
e

---

f

`})
    expect(data.cards.map(i => i.content.trim()))
      .toEqual(Array.from('abcdef'))
    expect(data.cards[2].frontmatter)
      .toEqual({ layout: 'z' })
    expect(data.cards[3].frontmatter)
      .toEqual({ })
  })

  it('parse section matter', async () => {
    const data = await parse({ markdown:`
a

---

b

---section2
layout: z
---
c
----   section 3
d
---- section-4
e

---

f

`})
    expect(data.cards.map(i => i.content.trim()))
      .toEqual(Array.from('abcdef'))
    expect(data.cards[2].frontmatter)
      .toEqual({ layout: 'z' })
    expect(data.cards[3].frontmatter)
      .toEqual({ })
  })

  type transformLines = (lines: string[]) => Promise<void>

  async function parseWithExtension({ src, transformRawLines, more = {}, moreExts = [] }: { src: string; transformRawLines: transformLines | undefined; more?: {}; moreExts?: FlashcardDevPreparserExtension[] }) {
    return await parse({ markdown: src, filepath: undefined, themeMeta: undefined, extensions: [], 
      onHeadmatter: async (): Promise<FlashcardDevPreparserExtension[]> => [{name: 'test', transformRawLines, ...more }, ...moreExts]});
  }

  it('parse with-extension replace', async () => {
    const data = await parseWithExtension({
        src: `---
ga: bu
---
a @@v@@

---

b
@@v@@

@@v@@ = @@v@@
`, transformRawLines: async (lines) => {
          for (const i in lines)
            lines[i] = lines[i].replace(/@@v@@/g, 'thing')
        }
      })

    expect(data.cards.map(i => i.content.trim().replace(/\n/g, '%')).join('/'))
      .toEqual('a thing/b%thing%%thing = thing')
  })

  it('parse with-extension custom-separator', async () => {
    const data = await parseWithExtension({
        src: `---
ga: bu
---
a @@v@@

SEPARATOR

b
@@v@@

@@v@@ = @@v@@
`, transformRawLines: async (lines) => {
          for (const i in lines)
            lines[i] = lines[i].replace(/^SEPARATOR$/g, '---')
        }
      })

    expect(data.cards.map(i => i.content.trim().replace(/\n/g, '%')).join('/'))
      .toEqual('a @@v@@/b%@@v@@%%@@v@@ = @@v@@')
  })

  it('parse with-extension eg-easy-cover', async () => {
    function cov(i: string, more = '.jpg') {
      return `---
layout: cover
background: ${i}${more}
---

`
    }
    const data = await parseWithExtension({
        src: `@cov 1.jpg
@cov 2.jpg
# 2
---

# 3
@cov 4.jpg
`, transformRawLines: async (lines) => {
          let i = 0
          while (i < lines.length) {
            if (lines[i].startsWith('@cov ')) {
              const repl = [...cov(lines[i].substring(5), '').split('\n')]
              lines.splice(i, 1, ...repl)
            }
            i++
          }
        }
      })

    expect(data.cards.map(s => s.content.trim().replace(/\n/g, '%')).join('/'))
      .toEqual('/# 2/# 3/'.replace(/\n/g, '%'))
    expect(data.cards[0].frontmatter)
      .toEqual({ layout: 'cover', background: '1.jpg' })
    expect(data.cards[1].frontmatter)
      .toEqual({ layout: 'cover', background: '2.jpg' })
    expect(data.cards[3].frontmatter)
      .toEqual({ layout: 'cover', background: '4.jpg' })
  })

  it('parse with-extension sequence', async () => {
    const data = await parseWithExtension({
        src: `
a..A
a.a.A.A
.a.A.
`, transformRawLines: undefined, more: {}, moreExts: [{
          name: 'test1',
          async transformRawLines(lines: string[]) {
            for (const i in lines)
              lines[i] = lines[i].replace(/A/g, 'B').replace(/a/g, 'A')

          },
        },
        {
          name: 'test2',
          async transformRawLines(lines: string[]) {
            for (const i in lines)
              lines[i] = lines[i].replace(/A/g, 'C')
          },
        },]
      })
    expect(data.cards.map(i => i.content.trim().replace(/\n/g, '%')).join('/'))
      .toEqual('C..B%C.C.B.B%.C.B.')
  })

  // Generate cartesian product of given iterables:
  function* cartesian(...all: number[][]): any {
    const [head, ...tail] = all
    const remainder = tail.length ? cartesian(...tail) : [[]]
    for (const r of remainder) 
      for (const h of head)
        yield [h, ...r]
  }
  const B = [0, 1]
  const Bs = [B, B, B, B, B, B]
  const bNames = '_swScCF'

  for (const desc of cartesian(...Bs)) {
    const [withSlideBefore, withFrontmatter, withSlideAfter, prependContent, appendContent, addFrontmatter] = desc
    it(`parse with-extension wrap ${desc.map((b: number, i: number) => bNames[b * (i + 1)]).join('')}`, async () => {
      const data = await parseWithExtension({
          src: `${withSlideBefore
              ? `
.

---
`
              : ''}${!withSlideBefore && withFrontmatter ? '---\n' : ''}${withFrontmatter
                ? `m: M
n: N
---`
                : ''}

ccc
@a
@b
ddd
${withSlideAfter
              ? `
---

..
`
              : ''}`, transformRawLines: undefined, more: {
                transformCard(content: string, frontmatter: any) {
                  const lines = content.split('\n')
                  let i = 0
                  let appendBeforeCount = 0
                  let appendAfterCount = 0
                  while (i < lines.length) {
                    const l = lines[i]
                    if (l.startsWith('@')) {
                      const t = l.substring(1)
                      lines.splice(i, 1)
                      if (prependContent)
                        lines.splice(appendBeforeCount++, 0, `<${t}>`)
                      if (appendContent)
                        lines.splice(lines.length - appendAfterCount++, 0, `</${t}>`)
                      if (addFrontmatter)
                        frontmatter[`add${t}`] = 'add'
                      i--
                    }
                    i++
                  }
                  return lines.join('\n')
                },
              }
        })
      function project(s: string) {
        // like the trim in other tests, the goal is not to test newlines here
        return s.replace(/%%%*/g, '%')
      }
      expect(project(data.cards.map(i => i.content.replace(/\n/g, '%')).join('/')))
        .toEqual(project([
          ...withSlideBefore ? ['./'] : [],
          ...prependContent ? ['<a>%<b>%'] : [],
          'ccc%ddd',
          ...appendContent ? ['%</b>%</a>'] : [],
          ...withSlideAfter ? ['/..'] : [],
        ].join('')))

      if (withFrontmatter || addFrontmatter) {
        expect(data.cards[withSlideBefore ? 1 : 0].frontmatter)
          .toEqual({
            ...withFrontmatter ? { m: 'M', n: 'N' } : {},
            ...addFrontmatter ? { adda: 'add', addb: 'add' } : {},
          })
      }
    })
  }
})
