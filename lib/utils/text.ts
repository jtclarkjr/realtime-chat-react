const LONG_RUN_REGEX = /\S{50,}/g
const ZWS = '\u200B'

/**
 * Insert zero-width spaces between every character in long unbreakable text
 * runs (50+ chars without whitespace) so that every browser — including
 * Safari/WebKit — can line-wrap them flush to the container edge.
 */
export const insertBreakOpportunities = (text: string): string => {
  if (!text || !LONG_RUN_REGEX.test(text)) return text

  LONG_RUN_REGEX.lastIndex = 0

  return text.replace(LONG_RUN_REGEX, (match) => [...match].join(ZWS))
}
