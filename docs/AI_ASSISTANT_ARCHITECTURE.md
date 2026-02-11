# AI Assistant Architecture

This document provides a comprehensive overview of how the AI assistant works
in the realtime chat application, including streaming flow, model/search
routing, feature flags, and message persistence/broadcast behavior.

## AI Module Layout

The AI assistant uses a layered module split:

1. `app/api/ai/stream/route.ts`

- Auth, validation, prompt assembly, stream orchestration, persistence, and
  broadcast.

2. `lib/ai/*`

- Runtime building blocks for model selection, recency detection, web search,
  stream handling, backend/provider strategy, and feature-flag resolution.

3. `hooks/chat/use-ai-chat.tsx`

- Client-side SSE consumption and UI state management (`start`/`content`/
  `complete` events).

4. `components/chat/*`

- User interaction surfaces for AI mode, private/public behavior, and
  "Respond with AI" draft generation from a selected message.

## Change Timeline (AI Enhancements)

The core AI enhancement set landed on **February 10, 2026** (JST) and was merged
through **PR #25 (`feat/ai-input-reply`)**:

1. `a9e66b5` (2026-02-10T19:28:01+09:00)
- Added internet-aware AI behavior, model selector, and AI reply draft input
  flow.

2. `a770abe` (2026-02-10T19:39:52+09:00)
- Added recency-aware routing improvements for up-to-date prompts.

3. `cee8eb0` (2026-02-10T20:37:03+09:00)
- Added alternative backend/provider strategy with feature-flagged routing.

4. `c4925e7`
- Merge commit for PR #25 into `main`.

## Table of Contents

- [System Overview](#system-overview)
- [AI Flow Layers](#ai-flow-layers)
- [Client to API Stream Flow](#client-to-api-stream-flow)
- [Prompt and Context Assembly](#prompt-and-context-assembly)
- [Model Selection Flow](#model-selection-flow)
- [Web Search and Recency Flow](#web-search-and-recency-flow)
- [Backend Strategy and Provider Routing](#backend-strategy-and-provider-routing)
- [Message Persistence and Broadcast Flow](#message-persistence-and-broadcast-flow)
- [AI Reply Draft Flow](#ai-reply-draft-flow)
- [SSE Event Contract](#sse-event-contract)
- [Failure Handling and Fallbacks](#failure-handling-and-fallbacks)

## System Overview

The assistant is a streaming pipeline with runtime strategy routing:

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Chat UI]
        Hook[useAIChat]
        Stream[SSE Reader]
    end

    subgraph "API Layer"
        Route["/api/ai/stream"]
        Strategy[generateAIResponse]
        Persist[sendAIMessage + markMessageAsAITrigger]
    end

    subgraph "AI Layer"
        Model[Model Selector]
        Recency[Recency Detector]
        Prompt[Prompt Builder + Time Context]
        Flags[Feature Flags Runtime]
        Search[Tavily / Anthropic Web Search]
    end

    subgraph "Data + Realtime"
        DB[(Supabase Postgres)]
        RT[Supabase Realtime Channel]
    end

    UI --> Hook
    Hook --> Stream
    Hook -->|POST| Route
    Route --> Model
    Route --> Recency
    Route --> Prompt
    Route --> Flags
    Route --> Strategy
    Strategy --> Search
    Strategy --> Route
    Route --> Persist
    Persist --> DB
    Persist --> RT
    RT --> UI
```

## AI Flow Layers

### Layer 1: Client Interaction

1. User enables AI mode from `AIBadge` in chat input.
2. User submits a message or chooses "Respond with AI" from message options.
3. `useAIChat` sends request and listens to SSE events.

### Layer 2: API Gateway

1. `requireNonAnonymousAuth` enforces authenticated, non-anonymous access.
2. Zod schema validation (`aiStreamRequestSchema`) verifies payload shape and
   limits.
3. Route builds prompt/messages and selects model + strategy.

### Layer 3: AI Strategy Execution

1. Strategy chooses backend mode (`anthropic_tavily`,
   `anthropic_native_web`, `vercel_ai_sdk`).
2. Recency detector decides whether web search should be attempted.
3. Generation returns either:
- Native token stream (`native_stream`) or
- Full text chunked into SSE (`chunked`).

### Layer 4: Persistence and Realtime

1. If `draftOnly` is false, final AI content is stored via `sendAIMessage`.
2. Trigger message can be marked (`markMessageAsAITrigger`).
3. Public AI messages are broadcast to room channel; private AI messages are not
   broadcast.

## Client to API Stream Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as RealtimeChat / ChatInput
    participant Hook as useAIChat
    participant API as POST /api/ai/stream
    participant SSE as SSE Stream

    User->>UI: Submit message in AI mode
    UI->>Hook: sendAIMessage(...)
    Hook->>API: POST stream request
    API-->>SSE: data: {type:"start", messageId, user}
    SSE-->>Hook: start
    API-->>SSE: data: {type:"content", fullContent, ...} (repeated)
    SSE-->>Hook: content updates
    API-->>SSE: data: {type:"complete", fullContent, messageId, createdAt}
    SSE-->>Hook: complete
    Hook-->>UI: replace streaming state with completed message
```

## Prompt and Context Assembly

The server builds prompt context from:

1. Base system prompt:
- `AI_STREAM_SYSTEM_PROMPT` for plain text
- `AI_STREAM_MARKDOWN_SYSTEM_PROMPT` for markdown

2. Optional web-search policy instructions:
- Appended only when recency/search is requested and enabled

3. Current-time context:
- UTC ISO + UTC text injected into `CURRENT_TIME_CONTEXT_TEMPLATE`
- Relative time words (today/yesterday/last week) should anchor to this context

4. Conversation context:
- `previousMessages` mapped into Anthropic message format
- Current user input appended as final user turn

5. Reply-draft mode context:
- If `targetMessageId + targetMessageContent` are present, route creates a
  constrained drafting instruction so output is only the reply text.

## Model Selection Flow

```mermaid
flowchart TD
    A[Input: message + customPrompt + targetMessageContent] --> B{Code intent detected?}
    B -->|Yes| C[Use code model]
    B -->|No| D[Use default model]

    C --> E[AI_STREAM_CODE_MODEL or env override]
    D --> F[AI_STREAM_DEFAULT_MODEL or fallback]

    E --> G[Validated against allow-list]
    F --> G
```

Routing logic (`resolveAIModel`) uses:

1. Code patterns (fenced blocks, function/class syntax, stack traces, import/export)
2. Action hints (implement/debug/refactor/show code)
3. Language hints (TypeScript, Python, Go, Rust, etc.)
4. Concept-only hints to avoid code model for explanation-only prompts

## Web Search and Recency Flow

```mermaid
flowchart TD
    A[User input + custom prompt + target message] --> B{Force/disable phrases?}
    B -->|Force phrase found| C[Use web search]
    B -->|Disable phrase found| D[Skip web search]
    B -->|No override| E{Recency or model-release signal?}
    E -->|Yes| C
    E -->|No| D
```

Recency detector (`shouldUseWebSearch`) triggers on patterns like:

1. `latest`, `today`, `current`, `price`, `weather`, `score`, `breaking news`
2. Leadership/title queries (`who is the president/ceo/prime minister`)
3. Model/version release signals (model names + version/release keywords)

Tavily path behavior:

1. Query sent via `searchWeb()`.
2. Results are normalized/sanitized and sorted by published date (newest first).
3. Source links are appended as a markdown `Sources:` line when available.
4. Quota/rate errors trigger temporary cooldown (`disableTavilyTemporarily`) and
   fallback to non-search generation.

## Backend Strategy and Provider Routing

```mermaid
flowchart TD
    A[Flags + recency decision] --> B{backendMode}

    B -->|vercel_ai_sdk| C[Vercel AI SDK generation]
    B -->|anthropic_native_web| D[Anthropic direct generation]
    B -->|anthropic_tavily| E[Anthropic direct + Tavily tool path]

    C --> F{searchDriver}
    D --> F
    E --> F

    F -->|anthropic_web_search| G[Anthropic native web search tool]
    F -->|tavily| H[Tavily tool]

    G --> I[Chunked SSE output]
    H --> I
```

Strategy entrypoint is `generateAIResponse()` and returns either:

1. `native_stream`: direct Anthropic token stream
2. `chunked`: full response split into chunks for SSE emission

Feature flags are resolved through runtime logic (`getEffectiveAIFlags`) with:

1. Backend mode
2. Search driver
3. Fail-open behavior
4. SDK enable/provider
5. Migration mode (`shadow` vs `active`)

## Message Persistence and Broadcast Flow

```mermaid
sequenceDiagram
    participant API as /api/ai/stream
    participant DB as sendAIMessage
    participant Trigger as markMessageAsAITrigger
    participant RT as Supabase Realtime
    participant Clients as Room Clients

    API->>DB: Persist AI message (unless draftOnly)
    API->>Trigger: Mark trigger message (optional)

    alt Private AI response
        API-->>Clients: No broadcast
    else Public AI response
        API->>RT: httpSend('message', broadcastMessage)
        RT-->>Clients: message event
    end
```

Broadcast path has primary + fallback sender:

1. Primary: service-role Supabase client
2. Fallback: request-bound Supabase client

## AI Reply Draft Flow

This feature powers "Respond with AI" from message context menus.

```mermaid
sequenceDiagram
    participant User
    participant Menu as MessageOptions
    participant Chat as RealtimeChat
    participant Hook as useAIChat.generateReplyDraft
    participant API as /api/ai/stream

    User->>Menu: Click "Respond with AI"
    Menu->>Chat: onReplyWithAI(selectedMessage)
    Chat->>Hook: generateReplyDraft({targetMessage, customPrompt?})
    Hook->>API: POST with draftOnly=true and target message fields
    API-->>Hook: Streamed draft text
    Hook-->>Chat: Final generated draft string
    Chat->>Chat: setNewMessage(draft)
    Chat-->>User: Draft inserted in input for review/edit/send
```

Behavior details:

1. Draft generation does not persist a chat message (`draftOnly=true`).
2. Output is inserted into input box; user controls final send.
3. Optional custom prompt lets user constrain tone/style/length.

## SSE Event Contract

The stream emits line-delimited events:

1. `start`
- Contains temporary message ID and AI user metadata.

2. `content`
- Contains incremental chunk and cumulative `fullContent`.

3. `complete`
- Contains final content, persisted message ID (or temp ID for draft), and
  created timestamp.

4. `error`
- Contains formatted error text.

Client parsing in `useAIChat` updates streaming state in-place until completion.

## Failure Handling and Fallbacks

Key resilience behavior:

1. Request-level guards
- Auth check, payload validation, self-user enforcement, API key checks.

2. Search fallback
- Tavily quota/rate limits trigger cooldown and fallback to non-search path.

3. Strategy fallback
- `vercel_ai_sdk` mode can fail-open to alternate generation depending on
  `failOpen` flag.

4. Broadcast fallback
- If service broadcast fails, fallback client broadcast is attempted.

5. Client fallback
- On stream/API error, chat renders a user-visible AI error message.

This keeps the chat flow responsive even when search/tools/providers are
partially unavailable.
