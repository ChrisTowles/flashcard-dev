/* __imports__ */

import type { MermaidOptions } from '@flashcard-dev/types'
import { defineMermaidSetup } from '@flashcard-dev/types'

export default defineMermaidSetup(() => {
  // eslint-disable-next-line prefer-const
  let injection_return: MermaidOptions = {
    theme: 'default',
  }

  /* __injections__ */

  return injection_return
})
