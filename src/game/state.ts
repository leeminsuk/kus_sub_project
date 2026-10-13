import {
  QUEST_BY_ID,
  QUEST_IDS,
  SPAWN_POSITION,
  type Department,
  type Position,
  type QuestId,
} from "./content";
import { DISCOVERIES, type DiscoveryId } from "./discoveries";

export const STORAGE_KEY = "kus-campus-signals-v1";
export const SAVE_VERSION = 1 as const;

export interface QuestResult {
  score: number;
  completedAt: number;
  attempts: number;
}

export interface GameState {
  version: typeof SAVE_VERSION;
  nickname: string;
  major: string;
  started: boolean;
  completed: Partial<Record<QuestId, QuestResult>>;
  trackedQuest: QuestId | null;
  position: Position;
  endingSeen: boolean;
  discoveries: DiscoveryId[];
  secretFound: boolean;
}

export interface AdventureProgress {
  completed: number;
  total: number;
  bio: number;
  cyber: number;
  percent: number;
  readyForFinale: boolean;
  totalScore: number;
  averageScore: number;
}

export interface ResultArchetype {
  title: string;
  description: string;
  bioScore: number;
  cyberScore: number;
  totalScore: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isQuestId = (value: unknown): value is QuestId =>
  typeof value === "string" && QUEST_IDS.includes(value as QuestId);

const finite = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const bounded = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number => Math.min(max, Math.max(min, finite(value, fallback)));

const cleanText = (value: unknown, fallback: string, max: number): string => {
  if (typeof value !== "string") return fallback;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
  return cleaned || fallback;
};

export function createInitialState(
  nickname = "캠퍼스 탐험가",
  major = "전공 탐색 중",
): GameState {
  return {
    version: SAVE_VERSION,
    nickname: cleanText(nickname, "캠퍼스 탐험가", 18),
    major: cleanText(major, "전공 탐색 중", 32),
    started: false,
    completed: {},
    trackedQuest: "water",
    position: { ...SPAWN_POSITION },
    endingSeen: false,
    discoveries: [],
    secretFound: false,
  };
}

/** Recover only known fields; malformed or future-version saves reset safely. */
export function sanitizeState(input: unknown): GameState {
  const initial = createInitialState();
  if (!isRecord(input) || input.version !== SAVE_VERSION) return initial;
  const completed: GameState["completed"] = {};
  if (isRecord(input.completed)) {
    for (const id of QUEST_IDS) {
      const result = input.completed[id];
      if (
        !isRecord(result) ||
        typeof result.score !== "number" ||
        !Number.isFinite(result.score)
      )
        continue;
      completed[id] = {
        score: Math.round(bounded(result.score, 0, 100, 0)),
        completedAt: Math.round(
          bounded(result.completedAt, 0, 8_640_000_000_000_000, 0),
        ),
        attempts: Math.round(bounded(result.attempts, 1, 1_000_000, 1)),
      };
    }
  }
  const position = isRecord(input.position) ? input.position : {};
  const state: GameState = {
    version: SAVE_VERSION,
    nickname: cleanText(input.nickname, initial.nickname, 18),
    major: cleanText(input.major, initial.major, 32),
    started: input.started === true,
    completed,
    trackedQuest:
      input.trackedQuest === null
        ? null
        : isQuestId(input.trackedQuest)
          ? input.trackedQuest
          : initial.trackedQuest,
    position: {
      x: bounded(position.x, -76, 76, SPAWN_POSITION.x),
      z: bounded(position.z, -76, 76, SPAWN_POSITION.z),
    },
    endingSeen: false,
    discoveries: Array.isArray(input.discoveries)
      ? DISCOVERIES.filter(
          (item) =>
            input.discoveries instanceof Array &&
            input.discoveries.includes(item.id),
        ).map((item) => item.id)
      : [],
    secretFound: false,
  };
  state.endingSeen =
    input.endingSeen === true && getProgress(state).readyForFinale;
  state.secretFound =
    input.secretFound === true && state.discoveries.includes("tiger");
  return state;
}

export function recordDiscovery(state: GameState, id: DiscoveryId): GameState {
  if (
    !DISCOVERIES.some((item) => item.id === id) ||
    state.discoveries.includes(id)
  )
    return state;
  return { ...state, discoveries: [...state.discoveries, id] };
}

/** A replay keeps the best score, increments attempts, and never relocks the ending. */
export function completeQuest(
  state: GameState,
  id: QuestId,
  score: number,
  now = Date.now(),
): GameState {
  if (!isQuestId(id)) return state;
  const previous = state.completed[id];
  const next: GameState = {
    ...state,
    started: true,
    completed: {
      ...state.completed,
      [id]: {
        score: Math.max(
          previous?.score ?? 0,
          Math.round(bounded(score, 0, 100, 0)),
        ),
        completedAt:
          previous?.completedAt ?? Math.max(0, Math.round(finite(now, 0))),
        attempts: (previous?.attempts ?? 0) + 1,
      },
    },
  };
  if (next.trackedQuest === id) {
    next.trackedQuest =
      QUEST_IDS.find((questId) => !next.completed[questId]) ?? null;
  }
  return next;
}

export function getProgress(state: GameState): AdventureProgress {
  const completedIds = QUEST_IDS.filter((id) => state.completed[id]);
  const totalScore = completedIds.reduce(
    (sum, id) => sum + (state.completed[id]?.score ?? 0),
    0,
  );
  return {
    completed: completedIds.length,
    total: QUEST_IDS.length,
    bio: completedIds.filter((id) => QUEST_BY_ID[id].department === "bio")
      .length,
    cyber: completedIds.filter((id) => QUEST_BY_ID[id].department === "cyber")
      .length,
    percent: Math.round((completedIds.length / QUEST_IDS.length) * 100),
    readyForFinale: completedIds.length === QUEST_IDS.length,
    totalScore,
    averageScore: completedIds.length
      ? Math.round(totalScore / completedIds.length)
      : 0,
  };
}

export function finishAdventure(state: GameState): GameState {
  return getProgress(state).readyForFinale
    ? { ...state, endingSeen: true }
    : state;
}

export function getResultArchetype(state: GameState): ResultArchetype {
  const departmentScore = (department: Department) => {
    const ids = QUEST_IDS.filter(
      (id) => QUEST_BY_ID[id].department === department,
    );
    return Math.round(
      ids.reduce((sum, id) => sum + (state.completed[id]?.score ?? 0), 0) /
        ids.length,
    );
  };
  const bioScore = departmentScore("bio");
  const cyberScore = departmentScore("cyber");
  const difference = bioScore - cyberScore;
  const profile =
    difference > 12
      ? {
          title: "생명의 언어를 읽는 탐험가",
          description:
            "작은 변화를 놓치지 않는 관찰력으로 새로운 연결을 만들었어요. 오늘의 발견은 다른 전공을 이해하는 첫걸음이에요.",
        }
      : difference < -12
        ? {
            title: "숨은 신호를 찾는 탐험가",
            description:
              "당연해 보이는 일에도 질문을 던지는 판단력으로 캠퍼스를 지켰어요. 오늘의 통찰이 다음 도전의 길을 밝혀 줄 거예요.",
          }
        : {
            title: "경계를 넘는 융합 탐험가",
            description:
              "생명을 살피는 눈과 정보를 읽는 눈을 함께 길렀어요. 서로 다른 세계를 연결하는 당신의 다음 하루가 기대돼요.",
          };
  return {
    ...profile,
    bioScore,
    cyberScore,
    totalScore: getProgress(state).totalScore,
  };
}

export function serializeState(state: GameState): string {
  return JSON.stringify(sanitizeState(state));
}

/** Invalid JSON and unrelated files fail explicitly instead of replacing progress. */
export function importState(raw: string): GameState {
  if (raw.length > 100_000) throw new Error("저장 파일이 너무 큽니다.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("올바른 JSON 저장 파일이 아닙니다.");
  }
  if (
    !isRecord(parsed) ||
    parsed.version !== SAVE_VERSION ||
    !isRecord(parsed.completed) ||
    typeof parsed.started !== "boolean"
  ) {
    throw new Error("캠퍼스의 신호 저장 파일을 선택해 주세요.");
  }
  return sanitizeState(parsed);
}
