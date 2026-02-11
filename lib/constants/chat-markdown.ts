import { common, createLowlight } from 'lowlight'

export const SANITIZE_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'a'
]

export const FAVICON_SERVICE_BASE_URL =
  'https://www.google.com/s2/favicons?domain='

export const SANITIZE_ALLOWED_ATTR = ['href', 'target', 'rel']
export const lowlight = createLowlight(common)
export const SOURCES_MAX_COUNT = 3
export const SOURCES_PREFIX_REGEX =
  /^\s*(?:\*\*|__)?\s*sources\s*:\s*(?:\*\*|__)?\s*/i
export const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g
