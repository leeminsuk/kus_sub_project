import assert from "node:assert/strict";
import { test } from "node:test";
import { QUEST_IDS } from "./content";
import {
  createInitialState,
  completeQuest,
  finishAdventure,
  getProgress,
  getResultArchetype,
  sanitizeState,
  recordDiscovery,
  serializeState,
  importState,
} from "./state";

test("quests can finish in reverse order and the ending requires all six", () => {
  let state = createInitialState("테스터");
  assert.equal(finishAdventure(state).endingSeen, false);
  for (const id of [...QUEST_IDS].reverse()) {
    assert.equal(getProgress(state).readyForFinale, false);
    state = completeQuest(state, id, 85, 1_700_000_000_000);
  }
  assert.equal(getProgress(state).completed, 6);
  assert.equal(getProgress(state).readyForFinale, true);
  assert.equal(finishAdventure(state).endingSeen, true);
  assert.equal(getResultArchetype(state).title, "경계를 넘는 융합 탐험가");
});

test("replay keeps the best score without duplicate completion", () => {
  let state = completeQuest(createInitialState(), "cipher", 60, 10);
  state = completeQuest(state, "cipher", 100, 20);
  state = completeQuest(state, "cipher", 40, 30);
  assert.equal(getProgress(state).completed, 1);
  assert.deepEqual(state.completed.cipher, {
    score: 100,
    completedAt: 10,
    attempts: 3,
  });
});

test("failed phishing answers still permit story completion with an honest score", () => {
  let state = createInitialState();
  for (const id of QUEST_IDS)
    state = completeQuest(state, id, id === "phishing" ? 0 : 100, 20);
  assert.equal(getProgress(state).readyForFinale, true);
  assert.equal(getProgress(state).totalScore, 500);
  assert.equal(state.completed.phishing?.score, 0);
});

test("completed progress round-trips and imported values are bounded", () => {
  const state = completeQuest(
    createInitialState("민수", "컴퓨터학과"),
    "water",
    96,
    1_700_000_000_000,
  );
  assert.deepEqual(importState(serializeState(state)), state);
  const cleaned = sanitizeState({
    ...state,
    endingSeen: true,
    position: { x: Infinity, z: -900 },
    completed: { water: { score: 400, attempts: -20 }, other: { score: 100 } },
  });
  assert.equal(cleaned.endingSeen, false);
  assert.equal(cleaned.position.x, 0);
  assert.equal(cleaned.position.z, -76);
  assert.deepEqual(Object.keys(cleaned.completed), ["water"]);
  assert.equal(cleaned.completed.water?.score, 100);
  assert.equal(cleaned.completed.water?.attempts, 1);
});

test("unrelated, invalid, and oversized save files cannot replace progress", () => {
  assert.throws(() => importState("{broken"));
  assert.throws(() => importState('{"version":1}'));
  assert.throws(() =>
    importState('{"version":2,"completed":{},"started":true}'),
  );
  assert.throws(() => importState(" ".repeat(100_001)));
  assert.deepEqual(sanitizeState(null), createInitialState());
});

test("finishing a tracked quest recommends an unfinished quest without gating any", () => {
  const state = completeQuest(createInitialState(), "water", 100, 20);
  assert.equal(state.trackedQuest, "seed");
  const another = completeQuest(state, "cipher", 90, 30);
  assert.equal(another.trackedQuest, "seed");
  assert.equal(another.completed.cipher?.score, 90);
});

test("optional discoveries and the secret persist without gating the finale", () => {
  let state = createInitialState();
  state = recordDiscovery(state, "book");
  state = recordDiscovery(state, "book");
  assert.deepEqual(state.discoveries, ["book"]);
  assert.equal(getProgress(state).completed, 0);
  assert.equal(
    sanitizeState({ ...state, secretFound: true }).secretFound,
    false,
  );
  state = { ...recordDiscovery(state, "tiger"), secretFound: true };
  assert.equal(importState(serializeState(state)).secretFound, true);
  assert.equal(getProgress(state).readyForFinale, false);
  const legacy = { ...createInitialState() } as Record<string, unknown>;
  delete legacy.discoveries;
  delete legacy.secretFound;
  assert.deepEqual(sanitizeState(legacy).discoveries, []);
});
