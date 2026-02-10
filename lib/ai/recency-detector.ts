interface RecencyDetectorInput {
  userMessage: string
  customPrompt?: string
  targetMessageContent?: string
}

const FORCE_WEB_SEARCH_PHRASES = [
  'search web',
  'search the web',
  'look it up online',
  'browse the web',
  'check online',
  'use internet'
]

const DISABLE_WEB_SEARCH_PHRASES = [
  'no web search',
  'without web search',
  'do not search web',
  "don't search web",
  'dont search web',
  'without internet',
  'offline only'
]

const RECENCY_PATTERNS = [
  /\blatest\b/i,
  /\brecent\b/i,
  /\bcurrent\b/i,
  /\btoday\b/i,
  /\byesterday\b/i,
  /\bthis week\b/i,
  /\bthis month\b/i,
  /\bthis year\b/i,
  /\bbreaking news\b/i,
  /\bjust announced\b/i,
  /\bup[- ]to[- ]date\b/i,
  /\bright now\b/i,
  /\bprice of\b/i,
  /\bstock price\b/i,
  /\bweather\b/i,
  /\bscore\b/i,
  /\belection\b/i,
  /\bwho is (the )?(president|ceo|prime minister)\b/i
]

export const shouldUseWebSearch = ({
  userMessage,
  customPrompt,
  targetMessageContent
}: RecencyDetectorInput): boolean => {
  const combinedText = [userMessage, customPrompt, targetMessageContent]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!combinedText.trim()) return false

  if (
    FORCE_WEB_SEARCH_PHRASES.some((phrase) => combinedText.includes(phrase))
  ) {
    return true
  }

  if (
    DISABLE_WEB_SEARCH_PHRASES.some((phrase) => combinedText.includes(phrase))
  ) {
    return false
  }

  return RECENCY_PATTERNS.some((pattern) => pattern.test(combinedText))
}
