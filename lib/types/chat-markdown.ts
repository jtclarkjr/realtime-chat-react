export interface ExtractedSource {
  label: string
  url: string
  domain: string
}

export interface ParsedContent {
  bodyMarkdown: string
  sources: ExtractedSource[]
}
