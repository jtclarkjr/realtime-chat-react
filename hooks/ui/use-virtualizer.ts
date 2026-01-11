'use client'

import { useEffect, useLayoutEffect, useReducer, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualizerOptions
} from '@tanstack/virtual-core'

const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect

type UseVirtualizerOptions<
  TScrollElement extends Element | Window,
  TItemElement extends Element
> = VirtualizerOptions<TScrollElement, TItemElement> & {
  useFlushSync?: boolean
}

function useVirtualizerBase<
  TScrollElement extends Element | Window,
  TItemElement extends Element
>(
  options: UseVirtualizerOptions<TScrollElement, TItemElement>
): Virtualizer<TScrollElement, TItemElement> {
  const { useFlushSync = true, ...rest } = options
  const rerender = useReducer(() => ({}), {})[1]
  const resolvedOptions = {
    ...rest,
    onChange: (
      instance: Virtualizer<TScrollElement, TItemElement>,
      sync: boolean
    ) => {
      if (useFlushSync && sync) {
        flushSync(rerender)
      } else {
        rerender()
      }
      options.onChange?.(instance, sync)
    }
  }

  const [instance] = useState(() => new Virtualizer(resolvedOptions))
  instance.setOptions(resolvedOptions)

  useIsomorphicLayoutEffect(() => instance._didMount(), [])
  useIsomorphicLayoutEffect(() => instance._willUpdate())

  return instance
}

export function useVirtualizer<
  TScrollElement extends Element,
  TItemElement extends Element
>(
  options: Omit<
    VirtualizerOptions<TScrollElement, TItemElement>,
    'observeElementRect' | 'observeElementOffset' | 'scrollToFn'
  >
): Virtualizer<TScrollElement, TItemElement> {
  return useVirtualizerBase({
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options
  })
}
