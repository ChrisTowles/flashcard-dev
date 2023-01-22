import path from 'path'
import net from 'net'
import os from 'os'
import { exec } from 'child_process'
import * as readline from 'readline'
import fs from 'fs-extra'
import openBrowser from 'open'
import type { Argv } from 'yargs'
import yargs from 'yargs'
import prompts from 'prompts'
import p from 'picocolors'


import type { LogLevel, ViteDevServer } from 'vite'
import type { FlashcardDevConfig } from '@flashcard-dev/types'
//import type { FlashcardDevConfig, FlashcardDevPreparserExtension } from '@flashcard-dev/types'
import isInstalledGlobally from 'is-installed-globally'
import equal from 'fast-deep-equal'
import { verifyConfig } from '@flashcard-dev/parser'
// import { injectPreparserExtensionLoader } from '@flashcard-dev/parser'
import * as parser from '@flashcard-dev/parser'
import { version } from '../package.json'
import { createServer } from './server'
// import type { ResolvedSlidevOptions } from './options'
//import { getAddonRoots, getClientRoot, getThemeRoots, getUserRoot, isPath, ResolvedSlidevOptions, resolveOptions } from './options'
import { getThemeRoots, isPath, ResolvedSlidevOptions, resolveOptions } from './options'
import { resolveThemeName } from './themes'

// cimport { loadSetups } from './plugins/setupNode'

const CONFIG_RESTART_FIELDS: (keyof FlashcardDevConfig)[] = [
  'monaco',
  'routerMode',
  'fonts',
  'css',
]

//  injectPreparserExtensionLoader(async (headmatter?: Record<string, unknown>, filepath?: string) => {
//   const addons = headmatter?.addons as string[] ?? []
//   const roots = /* uniq */([
//     getUserRoot({}).userRoot,
//     ...getAddonRoots(addons, ''),
//     getClientRoot(),
//   ])
//   const mergeArrays = (a: FlashcardDevPreparserExtension[], b: FlashcardDevPreparserExtension[]) => a.concat(b)
//   return await loadSetups(roots, 'preparser.ts', { filepath, headmatter }, [], false, mergeArrays)
// })

const cli = yargs
  .scriptName('slidev')
  .usage('$0 [args]')
  .version(version)
  .strict()
  .showHelpOnFail(false)
  .alias('h', 'help')
  .alias('v', 'version')

cli.command(
  '* [entry]',
  'Start a local server for Slidev',
  args => commonOptions(args)
    .option('port', {
      alias: 'p',
      type: 'number',
      describe: 'port',
    })
    .option('open', {
      alias: 'o',
      default: false,
      type: 'boolean',
      describe: 'open in browser',
    })
    .option('remote', {
      type: 'string',
      describe: 'listen public host and enable remote control',
    })
    .option('log', {
      default: 'warn',
      type: 'string',
      choices: ['error', 'warn', 'info', 'silent'],
      describe: 'log level',
    })
    .option('inspect', {
      default: false,
      type: 'boolean',
      describe: 'enable the inspect plugin for debugging',
    })
    .option('force', {
      alias: 'f',
      default: false,
      type: 'boolean',
      describe: 'force the optimizer to ignore the cache and re-bundle  ',
    })
    .strict()
    .help(),
  async ({ entry, theme, port: userPort, open, log, remote, force, inspect }) => {
    if (!fs.existsSync(entry) && !entry.endsWith('.md'))
      entry = `${entry}.md`

    if (!fs.existsSync(entry)) {
      const { create } = await prompts({
        name: 'create',
        type: 'confirm',
        initial: 'Y',
        message: `Entry file ${p.yellow(`"${entry}"`)} does not exist, do you want to create it?`,
      })
      if (create)
        await fs.copyFile(path.resolve(__dirname, '../template.md'), entry)
      else
        process.exit(0)
    }

    let server: ViteDevServer | undefined
    let port = 3030

    async function initServer() {
      if (server)
        await server.close()
      const options = await resolveOptions({ entry, remote, theme, inspect }, 'dev')
      port = userPort || await findFreePort(3030)
      server = (await createServer(
        options,
        {
          server: {
            port,
            strictPort: true,
            open,
            host: remote !== undefined ? '0.0.0.0' : 'localhost',
            force,
          },
          logLevel: log as LogLevel,
        },
        {
          onDataReload(newData, data) {
            if (!theme && resolveThemeName(newData.config.theme) !== resolveThemeName(data.config.theme)) {
              console.log(p.yellow('\n  restarting on theme change\n'))
              initServer()
            }
            else if (CONFIG_RESTART_FIELDS.some(i => !equal(newData.config[i], data.config[i]))) {
              console.log(p.yellow('\n  restarting on config change\n'))
              initServer()
            }
          },
        },
      ))

      await server.listen()
      printInfo(options, port, remote)
    }

    const SHORTCUTS = [
      {
        name: 'r',
        fullname: 'restart',
        action() {
          initServer()
        },
      },
      {
        name: 'o',
        fullname: 'open',
        action() {
          openBrowser(`http://localhost:${port}`)
        },
      },
      {
        name: 'e',
        fullname: 'edit',
        action() {
          exec(`code "${entry}"`)
        },
      },
    ]

    function bindShortcut() {
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      readline.emitKeypressEvents(process.stdin)
      if (process.stdin.isTTY)
        process.stdin.setRawMode(true)

      process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
          process.exit()
        }
        else {
          const [sh] = SHORTCUTS.filter(item => item.name === str)
          if (sh) {
            try {
              sh.action()
            }
            catch (err) {
              console.error(`Failed to execute shortcut ${sh.fullname}`, err)
            }
          }
        }
      })
    }

    initServer()
    bindShortcut()
  },
)

cli.command(
  'build [entry]',
  'Build hostable SPA',
  args => commonOptions(args)
    .option('watch', {
      alias: 'w',
      default: false,
      describe: 'build watch',
    })
    .option('out', {
      alias: 'o',
      type: 'string',
      default: 'dist',
      describe: 'output dir',
    })
    .option('base', {
      type: 'string',
      describe: 'output base',
    })
    .option('download', {
      alias: 'd',
      type: 'boolean',
      describe: 'allow download as PDF',
    })
    .option('inspect', {
      default: false,
      type: 'boolean',
      describe: 'enable the inspect plugin for debugging',
    })
    .strict()
    .help(),
  async ({ entry, theme, watch, base, download, out, inspect }) => {
    // const { build } = await import('./build')

    const options = await resolveOptions({ entry, theme, inspect }, 'build')
    if (download && !options.data.config.download)
       options.data.config.download = download

    printInfo(options)
    // await build(options, {
    //   base,
    //   build: {
    //     watch: watch ? {} : undefined,
    //     outDir: out,
    //   },
    // })
  },
)

cli.command(
  'format [entry]',
  'Format the markdown file',
  args => commonOptions(args)
    .strict()
    .help(),
  async ({ entry }) => {
    const data = await parser.load(entry)
    parser.prettify(data)
    await parser.save(data)
  },
)

cli.command(
  'theme [subcommand]',
  'Theme related operations',
  (command) => {
    return command
      .command(
        'eject',
        'Eject current theme into local file system',
        args => commonOptions(args)
          .option('dir', {
            type: 'string',
            default: 'theme',
          }),
        async ({ entry, dir, theme: themeInput }) => {
          const data = await parser.load(entry)
          const theme = resolveThemeName(themeInput || data.config.theme)
          if (theme === 'none') {
            console.error('Cannot eject theme "none"')
            process.exit(1)
          }
          if (isPath(theme)) {
            console.error('Theme is already ejected')
            process.exit(1)
          }
          const roots = getThemeRoots(theme, entry)
          if (!roots.length) {
            console.error(`Could not find theme "${theme}"`)
            process.exit(1)
          }
          const root = roots[0]

          await fs.copy(root, path.resolve(dir), {
            filter: i => !/node_modules|.git/.test(path.relative(root, i)),
          })

          const dirPath = `./${dir}`
          data.cards[0].frontmatter.theme = dirPath
          // @ts-expect-error remove the value
          data.slides[0].raw = null
          await parser.save(data)

          console.log(`Theme "${theme}" ejected successfully to "${dirPath}"`)
        },
      )
  },
  () => {
    cli.showHelp()
    process.exit(1)
  },
)

cli.command(
  'export [entry]',
  'Export slides to PDF',
  args => commonOptions(args)
    .option('output', {
      type: 'string',
      describe: 'path to the output',
    })
    .option('format', {
      default: 'pdf',
      type: 'string',
      choices: ['pdf', 'png', 'md'],
      describe: 'output format',
    })
    .option('timeout', {
      default: 30000,
      type: 'number',
      describe: 'timeout for rendering the print page',
    })
    .option('range', {
      type: 'string',
      describe: 'page ranges to export, for example "1,4-5,6"',
    })
    .option('dark', {
      default: false,
      type: 'boolean',
      describe: 'export as dark theme',
    })
    .option('with-clicks', {
      alias: 'c',
      default: false,
      type: 'boolean',
      describe: 'export pages for every clicks',
    })
    .option('executable-path', {
      type: 'string',
      describe: 'executable to override playwright bundled browser',
    })
    .option('with-toc', {
      default: false,
      type: 'boolean',
      describe: 'export pages with outline',
    })
    .strict()
    .help(),
  async ({
    entry,
    theme,
    output,
    format,
    timeout,
    range,
    dark,
    'with-clicks': withClicks,
    'executable-path': executablePath,
    'with-toc': withTOC,
  }) => {
    process.env.NODE_ENV = 'production'
    const { exportSlides } = await import('./export')
    const port = await findFreePort(12445)
    const options = await resolveOptions({ entry, theme }, 'build')
    output = output || options.data.config.exportFilename || `${path.basename(entry, '.md')}-export`
    const server = await createServer(
      options,
      {
        server: { port },
        clearScreen: false,
      },
    )
    await server.listen(port)
    printInfo(options)
    parser.filterDisabled(options.data)
    const width = options.data.config.canvasWidth
    const height = Math.round(width / options.data.config.aspectRatio)
    output = await exportSlides({
      port,
      slides: options.data.cards,
      total: options.data.cards.length,
      range,
      format: format as any,
      output,
      timeout,
      dark,
      routerMode: options.data.config.routerMode,
      width,
      height,
      withClicks,
      executablePath,
      withTOC,
    })
    console.log(`${p.green('  ✓ ')}${p.dim('exported to ')}./${output}\n`)
    server.close()
    process.exit(0)
  },
)

cli.command(
  'export-notes [entry]',
  'Export slide notes to PDF',
  args => args
    .positional('entry', {
      default: 'slides.md',
      type: 'string',
      describe: 'path to the slides markdown entry',
    })
    .option('output', {
      type: 'string',
      describe: 'path to the output',
    })
    .option('timeout', {
      default: 30000,
      type: 'number',
      describe: 'timeout for rendering the print page',
    })
    .strict()
    .help(),
  async ({
    entry,
    output,
    timeout,
  }) => {
    process.env.NODE_ENV = 'production'
    const { exportNotes } = await import('./export')

    const port = await findFreePort(12445)
    const options = await resolveOptions({ entry }, 'build')

    if (!output)
      output = options.data.config.exportFilename ? `${options.data.config.exportFilename}-notes` : `${path.basename(entry, '.md')}-export-notes`

    const server = await createServer(
      options,
      {
        server: { port },
        clearScreen: false,
      },
    )
    await server.listen(port)

    printInfo(options)
    parser.filterDisabled(options.data)

    output = await exportNotes({
      port,
      output,
      timeout,
    })
    console.log(`${p.green('  ✓ ')}${p.dim('exported to ')}./${output}\n`)

    server.close()
    process.exit(0)
  },
)

cli
  .help()
  .parse()

function commonOptions(args: Argv<{}>) {
  return args
    .positional('entry', {
      default: 'slides.md',
      type: 'string',
      describe: 'path to the slides markdown entry',
    })
    .option('theme', {
      alias: 't',
      type: 'string',
      describe: 'override theme',
    })
}

function printInfo(options: ResolvedSlidevOptions, port?: number, remote?: string) {
  console.log()
  console.log()
  console.log(`  ${p.cyan('●') + p.blue('■') + p.yellow('▲')}`)
  console.log(`${p.bold('  Slidev')}  ${p.blue(`v${version}`)} ${isInstalledGlobally ? p.yellow('(global)') : ''}`)
  console.log()
  console.log(p.dim('  theme   ') + (options.theme ? p.green(options.theme) : p.gray('none')))
  console.log(p.dim('  entry   ') + p.dim(path.dirname(options.entry) + path.sep) + path.basename(options.entry))
  if (port) {
    const query = remote ? `?password=${remote}` : ''
    const presenterPath = `${options.data.config.routerMode === 'hash' ? '/#/' : '/'}presenter/${query}`
    console.log()
    console.log(`${p.dim('  public slide show ')}  > ${p.cyan(`http://localhost:${p.bold(port)}/`)}`)
    if (query)
      console.log(`${p.dim('  private slide show ')} > ${p.cyan(`http://localhost:${p.bold(port)}/${query}`)}`)
    console.log(`${p.dim('  presenter mode ')}     > ${p.blue(`http://localhost:${p.bold(port)}${presenterPath}`)}`)
    if (options.inspect)
      console.log(`${p.dim('  inspector')}           > ${p.yellow(`http://localhost:${p.bold(port)}/__inspect/`)}`)

    if (remote !== undefined) {
      Object.values(os.networkInterfaces())
        .forEach(v => (v || [])
          .filter(details => String(details.family).slice(-1) === '4' && !details.address.includes('127.0.0.1'))
          .forEach(({ address }) => {
            console.log(`${p.dim('  remote control ')}     > ${p.blue(`http://${address}:${port}${presenterPath}`)}`)
          }),
        )
    }
    else {
      console.log(`${p.dim('  remote control ')}     > ${p.dim('pass --remote to enable')}`)
    }

    console.log()
    console.log(`${p.dim('  shortcuts ')}          > ${p.underline('r')}${p.dim('estart | ')}${p.underline('o')}${p.dim('pen | ')}${p.underline('e')}${p.dim('dit')}`)
  }

  console.log()
  verifyConfig(options.data.config, options.data.themeMeta, v => console.warn(p.yellow(`  ! ${v}`)))
  console.log()
}

function isPortFree(port: number) {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      socket.write('Echo server\r\n')
      socket.pipe(socket)
    })

    server.listen(port, '127.0.0.1')
    server.on('error', () => {
      resolve(false)
    })
    server.on('listening', () => {
      server.close()
      resolve(true)
    })
  })
}

async function findFreePort(start: number): Promise<number> {
  if (await isPortFree(start))
    return start
  return findFreePort(start + 1)
}
