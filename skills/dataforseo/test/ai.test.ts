import assert from "node:assert/strict";
import test from "node:test";
import { runLlmAsk } from "../src/commands/ai.js";

const askOptions = {
  engine: "chatgpt",
  prompt: "Which email platform?",
  location: 2724,
  language: "es",
  useCache: false,
};

function apiResult() {
  return [{
    model_name: "gpt-4o-mini",
    money_spent: 0.01,
    items: [{
      type: "message",
      sections: [{ type: "text", text: "Easymailing" }],
    }],
  }];
}

test("cache-disabled llm ask neither reads nor writes cache", async () => {
  let cacheReads = 0;
  let cacheWrites = 0;
  let requests = 0;

  const result = await runLlmAsk(askOptions, {
    request: async () => {
      requests++;
      return apiResult();
    },
    cache: {
      get: () => {
        cacheReads++;
        return null;
      },
      set: () => {
        cacheWrites++;
      },
    },
  });

  assert.equal(result.answer, "Easymailing");
  assert.equal(requests, 1);
  assert.equal(cacheReads, 0);
  assert.equal(cacheWrites, 0);
});

test("cache-enabled llm ask preserves read-through and write-through behavior", async () => {
  let cacheReads = 0;
  let cacheWrites = 0;

  await runLlmAsk({ ...askOptions, useCache: true }, {
    request: async () => apiResult(),
    cache: {
      get: () => {
        cacheReads++;
        return null;
      },
      set: () => {
        cacheWrites++;
      },
    },
  });

  assert.equal(cacheReads, 1);
  assert.equal(cacheWrites, 1);
});
