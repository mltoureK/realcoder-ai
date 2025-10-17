# Quiz Generation Pipeline

This document explains how the quiz generator assembles questions from repository code, how to tune the pipeline, and how to debug plugin-specific issues (for example, the current investigation into stalled function-variant output).

---

## High-Level Flow

1. **Client Request**  
   `src/app/api/generateQuiz/route.ts` receives the POST payload (`code`, `numQuestions`, optional `stream` flag, etc.) and logs high-level metadata.

2. **File Parsing**  
   The incoming `code` bundle is split into virtual files via a comment delimiter (`// filename.ext`). Each file is scored so function-rich TypeScript/JavaScript sources are prioritized.

3. **Function Extraction**  
   - Non-streaming: `extractFunctionsFromFiles` → `extractFunctionsFromFile` (both in `src/lib/function-extractor.ts`).  
   - Streaming path: `extractFunctionsFromFilesStreaming` yields batches that can be consumed while extraction continues.
   - Each file invokes OpenAI with a **size-based timeout** (`max(30s, fileLength/200)` clamped to 90s). The recent logging additions emit entries like `⏱️ src/foo.ts: completed (3 functions) after 12.5s`, which helps spot timeouts or oversized files.

4. **Chunk Building**  
   `functionsToChunks` converts every extracted function into a chunk string prefixed with metadata. These chunks are the canonical units that question plugins consume.

5. **Question Orchestration**  
   `src/lib/question-plugins/orchestrator.ts` schedules OpenAI calls:  
   - It shuffles the chunk list and now keeps a rotating queue to avoid back-to-back questions about the same function.  
   - It reads `QUESTION_DISTRIBUTION` to decide how many calls to allocate to each plugin.  
   - The orchestrator fires the plugin `generate` methods with concurrency, retry, and timeout settings defined by `settings`.

6. **Plugin Responses → UI Mapping**  
   Raw plugin payloads are normalized in the route handler (see `mapToUi`) and turned into quiz session objects returned to the client. The helper also shuffles function-variant answer choices and balances verbosity for consistency.

---

## Key Configuration Points

| Concern | File / Env | Notes |
| --- | --- | --- |
| **Question mix** | `src/lib/question-plugins/question-distribution-config.ts` | Controls total API calls per quiz by plugin type. |
| **Timeout defaults** | `src/app/api/generateQuiz/route.ts` (`settings.timeouts`) | Can be overridden with env vars such as `OPENAI_TIMEOUT_FUNCTION_VARIANT_MS`. |
| **Concurrency + max calls** | Same `settings` object | `OPENAI_CONCURRENCY` and `OPENAI_MAX_CALLS_PER_REQUEST` env vars customize these. |
| **Chunk logging** | `src/lib/chunk-logger.ts` | Aggregates which chunks were used and how many questions each plugin produced. |
| **Streaming vs non-streaming** | `stream=1` query param | Streaming path starts emitting questions after the first extraction batch. |

---

## Current Debug Configuration (Function Variant Focus)

To diagnose function-variant failures, the distribution has been temporarily set to route **all 15 API calls** to the function-variant plugin:

```
// src/lib/question-plugins/question-distribution-config.ts
[
  { type: 'function-variant', count: 15 },
  { type: 'select-all', count: 0 },
  { type: 'order-sequence', count: 0 },
  { type: 'true-false', count: 0 },
  { type: 'multiple-choice', count: 0 },
]
```

Because the orchestrator still instantiates all plugins, the ones with a zero count are simply skipped during scheduling. This ensures the generator only makes function-variant calls until the debugging phase is complete.

### Diagnosing Missing Variant Questions

1. **Check server logs**  
   Look for lines such as `📞 API Call` (start), `📊 FunctionVariant: Generated X questions` (result), or `⏰ Timeout extracting functions…` (upstream extraction failures). The plugin catches `AbortError`, so a run that times out returns zero questions without throwing.

2. **Inspect chunk availability**  
   Ensure `functionsToChunks` is producing enough chunks. If extraction returns zero functions (e.g., due to timeouts or filtered files), the orchestrator has nothing to feed the plugins.

3. **Experiment with timeouts**  
   Increase `OPENAI_TIMEOUT_FUNCTION_VARIANT_MS` (for example, back to 25000 or 30000) if the default 15s budget is too aggressive, especially while debugging.

4. **Compare streaming vs non-streaming**  
   If you are testing via the streaming endpoint, confirm that batches are arriving; variant generation may not start until the first batch of extracted functions completes.

---

## Restoring Normal Operation

Once function-variant generation is validated:

1. Rebalance `QUESTION_DISTRIBUTION` to the desired mix (see `docs/QUESTION_DISTRIBUTION_CONFIG.md` for the previous default).
2. Adjust timeouts back to production-friendly values if you increased them for debugging.
3. Retain the new extractor timing logs; they are lightweight and helpful for future tuning.

---

## Useful Commands / Tips

- **Tail Next.js API logs** during a quiz run to watch plugin output: `yarn dev` (or your PM2 setup) provides the console entries described above.
- **Force a single chunk** by crafting a minimal code bundle with one function to reproduce plugin behavior deterministically.
- **Review chunk logger output** (`.cache/chunk-logs/**`) if you need historical insight into which chunks produced successful questions.

---

Document last updated: _while investigating function-variant generation timeouts._ If you extend or adjust the pipeline, add a note here to keep the debugging trail fresh.
