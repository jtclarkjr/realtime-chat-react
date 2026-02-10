import Anthropic from '@anthropic-ai/sdk'

export const extractTextFromBlocks = (
  blocks: Anthropic.ContentBlock[]
): string =>
  blocks
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()

export const getMessageTextContent = (message: Anthropic.Message): string => {
  return extractTextFromBlocks(message.content)
}

export const appendSourcesIfMissing = (
  content: string,
  sourcesMarkdown: string
): string => {
  if (!sourcesMarkdown) return content.trim()
  if (/^\s*sources\s*:/im.test(content)) return content.trim()
  return `${content.trim()}\n\n${sourcesMarkdown}`
}

export const enqueueContentByChunks = (
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  messageId: string,
  fullContent: string
) => {
  if (!fullContent.trim()) return

  let assembledContent = ''
  const chunkSize = 160
  for (let i = 0; i < fullContent.length; i += chunkSize) {
    const contentChunk = fullContent.slice(i, i + chunkSize)
    assembledContent += contentChunk
    const streamData = {
      type: 'content',
      messageId,
      content: contentChunk,
      fullContent: assembledContent
    }
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`)
    )
  }
}

export const streamAnthropicTextToSSE = async ({
  stream,
  controller,
  encoder,
  messageId
}: {
  stream: AsyncIterable<Anthropic.RawMessageStreamEvent>
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
  messageId: string
}): Promise<string> => {
  let fullContent = ''

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      const content = chunk.delta.text
      if (!content) continue

      fullContent += content
      const streamData = {
        type: 'content',
        messageId,
        content,
        fullContent
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`)
      )
    }
  }

  return fullContent
}
