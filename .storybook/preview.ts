import type { Preview } from '@storybook/nextjs'
// @ts-expect-error - CSS imports are handled by webpack
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
}

export default preview
