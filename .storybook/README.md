# Storybook for UI Components

This directory contains Storybook configuration for the shadcn UI components
used in this project.

## Running Storybook

To start Storybook in development mode:

```bash
bun run storybook
```

This will start Storybook on [http://localhost:6006](http://localhost:6006)

## Building Storybook

To build a static version of Storybook:

```bash
bun run build-storybook
```

To start Storybook in production:

Storybook live demo is deployed to:
[realtime-chat-storybook.vercel.app](https://realtime-chat-storybook.vercel.app)

## Available Stories

The following UI components have comprehensive Storybook stories:

### Form Components

- **Button** - All variants (default, destructive, outline, secondary, ghost,
  link, discord, github, apple, text-danger) and sizes
- **Input** - Text inputs with various states (disabled, required, invalid, with
  icons)
- **Textarea** - Multi-line text inputs with different configurations
- **Select** - Dropdown selects with groups, disabled items, and custom styling

### Data Display

- **Avatar** - User avatars with images, fallbacks, and custom sizes
- **Spinner** - Loading indicators in different sizes and variants

### Overlays

- **Dialog** - Modal dialogs with forms, footers, and custom widths
- **Popover** - Contextual popovers with different placements and content

## Component Stories Location

All component stories are organized in the `components/ui/stories/` folder.

## Configuration Files

- `main.ts` - Main Storybook configuration
- `preview.ts` - Global preview configuration (includes Tailwind CSS)

## Features

- Automatic documentation generation
- Interactive controls for component props
- Accessibility testing with @storybook/addon-a11y
- Full Next.js and Tailwind CSS support
- Dark mode support (inherited from the app)

## Adding New Stories

To add a new story for a component:

1. Create a new file `components/ui/[component-name].stories.tsx`
2. Import the component and Storybook types
3. Define the meta configuration with title, component, and parameters
4. Export story objects showcasing different variants and use cases

Example:

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from './my-component'

const meta = {
  title: 'UI/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof MyComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // component props
  }
}
```
