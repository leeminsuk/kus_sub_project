import type { Position } from "./content";

export type DiscoveryId = "tiger" | "book" | "bench" | "echo";

export interface Discovery {
  id: DiscoveryId;
  title: string;
  position: Position;
  prompt: string;
  description: string;
  reward: string;
}

/** Optional finds never gate the six main quests or the ending. */
export const DISCOVERIES: Discovery[] = [
  {
    id: "tiger",
    title: "호랑이가 남긴 발자국",
    position: { x: -11, z: 46 },
    prompt: "황금 발자국 살펴보기",
    description:
      "호랑이 조형물 아래, 작은 발자국이 반짝여요. 힘차게 걷되 자기만의 속도를 잊지 말라는 선배들의 장난스러운 메시지예요. 발자국을 따라 마음속으로 하나, 둘, 하나를 세어 보세요.",
    reward: "숨은 기념품 · 용기의 발자국",
  },
  {
    id: "book",
    title: "아무도 빌리지 않은 책",
    position: { x: -57, z: -18.5 },
    prompt: "책갈피 속 쪽지 읽기",
    description:
      "도서관 앞 책에는 마지막 장만 비어 있어요. “가장 좋은 질문은 아직 배우지 않은 분야에서 시작된다.” 다음 페이지의 저자 칸에 당신의 이름이 들어갈 자리가 남아 있네요.",
    reward: "숨은 기념품 · 경계 없는 책갈피",
  },
  {
    id: "bench",
    title: "잠깐 쉬어 가는 용기",
    position: { x: 39, z: 45 },
    prompt: "벤치 옆 은행잎 줍기",
    description:
      "연못을 바라보는 벤치에 금빛 은행잎이 내려앉았어요. 해야 할 일을 잠깐 잊고 물결을 바라보세요. 쉬어 가는 시간도 탐험의 일부랍니다.",
    reward: "숨은 기념품 · 오후의 은행잎",
  },
  {
    id: "echo",
    title: "지도 밖의 작은 메아리",
    position: { x: -62, z: -61 },
    prompt: "숲속 풍경 소리 듣기",
    description:
      "북서쪽 나무 사이에서 작은 풍경을 발견했어요. 바람이 불 때마다 낯선 음이 어울려 하나의 화음이 돼요. 서로 다른 전공도 이렇게 만날 수 있겠죠?",
    reward: "숨은 기념품 · 숲의 공명",
  },
];

export const DISCOVERY_BY_ID = Object.fromEntries(
  DISCOVERIES.map((item) => [item.id, item]),
) as Record<DiscoveryId, Discovery>;

export const isDiscoveryId = (value: unknown): value is DiscoveryId =>
  typeof value === "string" && DISCOVERIES.some((item) => item.id === value);
