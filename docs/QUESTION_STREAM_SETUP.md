# Question Stream Setup

This guide walks through the pieces you need to keep the quiz UI responsive while new questions stream in from the `/api/generateQuiz` endpoint.

## Prerequisites
- Configure `OPENAI_API_KEY` (and optional tuning env vars such as `OPENAI_CONCURRENCY`, `OPENAI_MAX_CALLS_PER_REQUEST`, or the per-type timeout vars). The API handler short‑circuits with a `400` if the key is missing.
- Parse repository code into `// fileName\n<contents>` blocks before calling the API. The server route depends on that format to split files.
- Client must run in a browser environment (streamed reads rely on `ReadableStreamDefaultReader`).

## API Contract
- **Endpoint:** `POST /api/generateQuiz?stream=1`
- **Payload:** 
  ```jsonc
  {
    "code": "<concatenated repo files>",
    "questionTypes": ["function-variant", "multiple-choice", "order-sequence", "true-false", "select-all"],
    "difficulty": "medium",
    "numQuestions": 15,
    "repositoryInfo": { "owner": "foo", "repo": "bar", "branch": "main" }
  }
  ```
- **Response:** newline-delimited JSON (`application/x-ndjson`). Events arrive in this order:
  - `{ "type": "meta", "expectedTotal": <int> }`
  - `{ "type": "question", "question": { ...uiQuestion } }` per generated question
  - `{ "type": "done", "count": <int> }` when generation completes
  - `{ "type": "error", "message": "stream-failed" }` if something goes wrong
- The route progressively extracts functions via `extractFunctionsFromFilesStreaming`, turns them into chunks, and pipes each generated question immediately. If no functions are found, it falls back to raw file snippets before finally closing the stream.

## Client Flow (see `src/app/page.tsx`)
1. **Cache pre-check:** Call the helper that wraps `getCachedQuestions` twice (once without `userId`, once with it) so you have both the total cached pool and the filtered subset when “Hide questions I’ve already passed” is enabled. Persist both counts in state so the toggle can instantly swap the displayed number (and show how many questions were hidden). Depending on the subset size you either:
   - Serve only cached (≥50),
   - Seed the UI with all cached (8–49) and keep streaming,
   - Seed with up to 10 cached (<8) and merge with stream later,
   - Fall back to pure streaming if none exist.
2. **Flag cached seed:** When you plan to stream on top of cached results, stash them on `window.__cachedQuestionsToMerge`. This informs downstream update logic to append streamed questions instead of replacing the cached session.
3. **Kick off fetch:** Use `fetch('/api/generateQuiz?stream=1', { method: 'POST', body: JSON.stringify(payload) })`. Abort if `response.ok` is false or `response.body` is missing.
4. **Initial session:** Build a minimal session object and call `setQuizSession`. If you are merging with cached questions, keep the existing cached session and just set `isStreaming: true` so the UI shows the spinner while retaining the original list.
5. **Stream reader loop:**
   ```ts
   const reader = response.body.getReader();
   const decoder = new TextDecoder();
   let buffer = '';
   while (true) {
     const { value, done } = await reader.read();
     if (done) break;
     buffer += decoder.decode(value, { stream: true });
     let idx;
     while ((idx = buffer.indexOf('\n')) >= 0) {
       const line = buffer.slice(0, idx).trim();
       buffer = buffer.slice(idx + 1);
       if (!line) continue;
       const evt = JSON.parse(line);
       // handle meta/question/done/error
     }
   }
   ```
6. **Question handling:** In the `question` branch, append the new question to `prev.questions`. If cached questions are present (`window.__cachedQuestionsToMerge`), append to that existing list and keep `isStreaming` true so the UI indicates the merge.
7. **Completion:** On `done` clear `window.__cachedQuestionsToMerge`, flip `isStreaming` to false, and optionally rename the session (e.g., `"Community Reviewed + AI Quiz"`).

## UI Signals
- `showLoadingOverlay` hides as soon as the first streamed question arrives (we do this when `total === 1`).
- Cached mixes use the `isCached` flag to display the “Community Reviewed” badge; retain that flag when seeding the session.
- `cachedQuestionCount` drives helper text in the CTA. Update it immediately after every cache fetch so the user sees accurate counts.

## Troubleshooting
- **Empty stream:** If neither functions nor raw chunks produce questions, ensure the `code` payload contains delimiters (`// fileName`). Without them the extractor yields zero files.
- **Overlay never hides:** Confirm you call `setShowLoadingOverlay(false)` after the first question event, even when merging cached questions.
- **Missing cached merge:** Verify `window.__cachedQuestionsToMerge` remains populated until the `done` event fires; clearing it early causes the UI to reinitialize and drop the cached entries.
