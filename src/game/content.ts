export type Position = { x: number; z: number };
export type Department = "bio" | "cyber";
export type QuestId =
  | "water"
  | "seed"
  | "habitat"
  | "phishing"
  | "network"
  | "cipher";

export interface Quest {
  id: QuestId;
  title: string;
  department: Department;
  location: string;
  npc: string;
  position: Position;
  summary: string;
  brief: string;
  hint: string;
  success: string;
  reward: string;
}

export interface Landmark {
  id: string;
  name: string;
  position: Position;
  width: number;
  depth: number;
  height: number;
  style:
    | "gothic"
    | "library"
    | "science"
    | "modern"
    | "brick"
    | "greenhouse"
    | "gate"
    | "pond"
    | "plaza";
  color: string;
}

export const GAME_TITLE = "121분의 1: 캠퍼스의 신호";
export const SPAWN_POSITION: Position = { x: 0, z: 58 };
export const GUIDE_POSITION: Position = { x: 0, z: 48 };
export const FINALE_POSITION: Position = { x: 0, z: -6 };

export const STORY = {
  introduction:
    "오늘 하루, 다른 과로 살아보기. 전공 교류제의 공동 작품 ‘이어봄’이 리허설 중 멈췄다. 여섯 부스의 확인 신호를 다시 모아, 생명과 정보가 함께 밝히는 축제를 완성하자.",
  guideName: "호연",
  guide:
    "어서 와! 오늘 교류제의 공동 작품은 ‘이어봄’이야. 생명의 정원과 빛의 네트워크가 함께 움직이는 장치지. 그런데 리허설 중 연결이 끊기면서 여섯 부스의 확인 신호가 사라졌어. 생명과학 연구팀과 정보보안 동아리를 만나 관찰과 안전 점검을 도와줄래? 여섯 의뢰는 서로 독립적이니 어디부터 가도 좋아. 서두를 필요 없어. 신호를 모두 모으면 중앙광장에서 함께 불빛을 켜자!",
  order:
    "추천 경로는 있지만, 정답인 순서는 없어요. 원하는 장소부터 자유롭게 탐험하세요.",
  finaleLocked:
    "아직 잠든 신호가 있어요. 여섯 가지 의뢰를 모두 해결하면 이곳에서 축제의 불빛을 켤 수 있어요.",
  finale:
    "정원의 균형을 살피고, 기록을 복원하고, 서로의 연결을 지켰어요. 생명과학의 세 신호와 정보보안의 세 신호가 함께 모여 공동 작품 ‘이어봄’을 다시 깨웁니다. 혼자서는 만들 수 없던 축제의 불빛을 이제 함께 켜 볼까요? 오늘, 당신의 세계는 전공 하나만큼 넓어졌습니다.",
  campusNote:
    "고려대학교의 석조 건축과 캠퍼스 분위기에서 영감을 얻은 가상의 캠퍼스입니다.",
} as const;

export const QUESTS: Quest[] = [
  {
    id: "water",
    title: "연못의 작은 균형",
    department: "bio",
    location: "생태 연못",
    npc: "생태 연구원 · 유진",
    position: { x: 25, z: 40 },
    summary: "연못의 세 가지 환경 수치를 조절하세요.",
    brief:
      "축제 정원의 물 순환 장치가 멈췄어요. 연구팀이 정한 실험 조건에 맞게 온도, 산도, 용존 산소를 조절해 주세요. 한 가지 수치만 좋아서는 균형이 맞지 않아요.",
    hint: "목표 범위: 수온 18–24°C, pH 6.5–7.5, 용존 산소 6–9 mg/L. 모두 초록 범위에 들어가면 확인하세요.",
    success:
      "물속 생명들이 다시 움직이기 시작했어요. 작은 균형을 찾아 주었네요!",
    reward: "생명의 신호 01 · 균형",
  },
  {
    id: "seed",
    title: "씨앗에 적힌 편지",
    department: "bio",
    location: "은행 온실",
    npc: "식물 연구원 · 다온",
    position: { x: -25, z: -46 },
    summary: "DNA의 짝 규칙으로 씨앗 기록을 복원하세요.",
    brief:
      "온실의 씨앗 표본에서 DNA 기록 일부가 지워졌어요. 마주 보는 가닥의 염기는 A와 T, C와 G가 짝을 이뤄요. 남아 있는 가닥에 맞춰 빈칸을 채워 주세요.",
    hint: "A ↔ T, C ↔ G. 위쪽 가닥이 T라면 바로 아래에는 A를 놓으세요. 왼쪽부터 자리를 맞춥니다.",
    success:
      "씨앗 표본의 기록이 복원됐어요. 아주 작은 규칙으로 긴 이야기를 읽어 냈네요.",
    reward: "생명의 신호 02 · 발견",
  },
  {
    id: "habitat",
    title: "함께 살아가는 정원",
    department: "bio",
    location: "생명과학관",
    npc: "정원 연구원 · 해솔",
    position: { x: 44, z: -19 },
    summary: "생태 정원에 필요한 세 역할을 고르세요.",
    brief:
      "정원을 꾸미는 데는 예쁜 꽃만 있으면 될까요? 꽃을 피우는 식물, 꽃가루를 옮기는 동물, 낙엽을 분해하는 생물. 서로 돕는 세 가지 역할을 하나씩 골라 작은 생태계를 완성해 주세요.",
    hint: "먹이와 꽃을 제공하는 들꽃, 꽃가루를 옮기는 벌, 낙엽을 분해하는 지렁이가 필요해요.",
    success:
      "꽃과 벌, 흙속의 생명이 연결됐어요. 혼자서는 만들 수 없는 정원이 완성됐네요.",
    reward: "생명의 신호 03 · 공존",
  },
  {
    id: "phishing",
    title: "수상한 축제 초대장",
    department: "cyber",
    location: "학생회관",
    npc: "학생회 보안 담당 · 서준",
    position: { x: -44, z: 16 },
    summary: "다섯 개의 메시지에서 위험한 요청을 구별하세요.",
    brief:
      "축제 참가자에게 가짜 장학금 문자가 섞여 들어왔어요. 다섯 메시지를 살펴보고, 의심스러운 요청이 있는지 판단해 주세요. 이름이 그럴듯해도 링크나 비밀번호 요구는 다시 확인해야 해요.",
    hint: "급하게 입금을 요구하거나, 비밀번호를 보내 달라고 하거나, 낯선 링크로 유도하면 의심하세요. 안내가 평범해 보여도 공식 포털에 직접 접속해 확인하는 습관이 좋아요.",
    success:
      "가짜 초대장을 걸러 냈어요. 한 번 더 확인하는 습관이 모두의 정보를 지켰네요.",
    reward: "정보의 신호 01 · 통찰",
  },
  {
    id: "network",
    title: "끊어진 신호를 잇다",
    department: "cyber",
    location: "미래정보관",
    npc: "네트워크 연구원 · 민서",
    position: { x: 44, z: 16 },
    summary: "축제 서버까지 안전한 연결 경로를 만드세요.",
    brief:
      "축제의 신호가 잘못된 경로로 흘러가고 있어요. 캠퍼스 단말에서 출발해 방화벽으로 불필요한 접근을 걸러 내고, 인증 게이트에서 권한을 확인한 뒤 축제 서버에 도착하도록 연결해 주세요.",
    hint: "캠퍼스 단말 → 방화벽 → 인증 게이트 → 축제 서버. 외부 중계소와 공개 저장소는 이번 연결의 목적지가 아니에요.",
    success:
      "축제 서버와 연결됐어요. 접근을 거르고 권한을 확인하니 신호가 제자리를 찾았네요.",
    reward: "정보의 신호 02 · 연결",
  },
  {
    id: "cipher",
    title: "도서관의 마지막 암호",
    department: "cyber",
    location: "중앙도서관",
    npc: "기록 보관자 · 지우",
    position: { x: -44, z: -19 },
    summary: "알파벳 이동 규칙으로 기록 보관함을 여세요.",
    brief:
      "오래된 교류제 기록 속에 ‘이어봄’의 기록 확인 신호가 있어요. 보관자가 글자를 알파벳 세 칸 뒤로 옮겨 메시지를 남겼대요. 암호를 반대로 세 칸씩 이동해서 원래 단어를 찾아 주세요.",
    hint: "암호화할 때 A → D가 되었으니, 풀 때는 D → A예요. FDPSXV를 세 칸씩 되돌리세요.",
    success:
      "CAMPUS, 우리가 함께 걷는 곳. 기록 보관함이 열리며 기록 속 신호가 돌아왔어요.",
    reward: "정보의 신호 03 · 해석",
  },
];

export const QUEST_IDS = QUESTS.map((quest) => quest.id);
export const QUEST_BY_ID = Object.fromEntries(
  QUESTS.map((quest) => [quest.id, quest]),
) as Record<QuestId, Quest>;

export const LANDMARKS: Landmark[] = [
  {
    id: "main",
    name: "본관",
    position: { x: 0, z: -53 },
    width: 32,
    depth: 16,
    height: 26.34,
    style: "gothic",
    color: "#d9d1b9",
  },
  {
    id: "library",
    name: "중앙도서관",
    position: { x: -46, z: -33 },
    width: 26,
    depth: 18,
    height: 14.8,
    style: "library",
    color: "#d9d1b9",
  },
  {
    id: "science",
    name: "생명과학관",
    position: { x: 46, z: -33 },
    width: 26,
    depth: 18,
    height: 17.7,
    style: "science",
    color: "#d9d1b9",
  },
  {
    id: "future",
    name: "미래정보관",
    position: { x: 46, z: 30 },
    width: 26,
    depth: 18,
    height: 12.43,
    style: "modern",
    color: "#dbe0d1",
  },
  {
    id: "student",
    name: "학생회관",
    position: { x: -46, z: 30 },
    width: 26,
    depth: 18,
    height: 11.3,
    style: "gothic",
    color: "#d9d1b9",
  },
  {
    id: "greenhouse",
    name: "은행 온실",
    position: { x: -25, z: -55.5 },
    width: 11.8,
    depth: 10.8,
    height: 8.1,
    style: "greenhouse",
    color: "#b6cec0",
  },
  {
    id: "gate",
    name: "캠퍼스 정문",
    position: { x: 0, z: 65 },
    width: 46,
    depth: 4.1,
    height: 8.75,
    style: "gate",
    color: "#d9d1b9",
  },
  {
    id: "pond",
    name: "생태 연못",
    position: { x: 25, z: 49 },
    width: 19.2,
    depth: 19.2,
    height: 0.25,
    style: "pond",
    color: "#72acb3",
  },
  {
    id: "plaza",
    name: "교류제 광장",
    position: { x: 0, z: -3 },
    width: 38.8,
    depth: 38.8,
    height: 0.13,
    style: "plaza",
    color: "#ede4cf",
  },
];

export const BIO_WATER = {
  parameters: [
    {
      id: "temperature",
      label: "수온",
      min: 10,
      max: 35,
      step: 1,
      targetMin: 18,
      targetMax: 24,
      initial: 29,
      unit: "°C",
    },
    {
      id: "ph",
      label: "산도 (pH)",
      min: 4,
      max: 10,
      step: 0.1,
      targetMin: 6.5,
      targetMax: 7.5,
      initial: 5.2,
      unit: "",
    },
    {
      id: "oxygen",
      label: "용존 산소",
      min: 1,
      max: 12,
      step: 0.5,
      targetMin: 6,
      targetMax: 9,
      initial: 3,
      unit: "mg/L",
    },
  ],
  explanation:
    "온도·산도·산소는 함께 생물이 살아갈 환경을 만들어요. 이 수치는 게임 속 연구팀의 실험 조건이며, 모든 실제 연못에 적용되는 기준은 아니에요.",
} as const;

export const DNA_PUZZLE = {
  template: "TACGGA",
  target: "ATGCCT",
  bases: ["A", "T", "C", "G"],
  explanation:
    "DNA의 두 가닥은 A와 T, C와 G가 서로 짝을 이뤄요. 이 화면은 마주 보는 자리를 위아래로 맞춘 모형이에요.",
} as const;

export const HABITAT_PUZZLE = {
  species: [
    {
      id: "wildflower",
      name: "토종 들꽃",
      role: "생산자",
      description: "햇빛으로 자라며 꽃가루와 꿀을 제공해요.",
      native: true,
      icon: "✿",
    },
    {
      id: "bee",
      name: "꽃벌",
      role: "수분 매개자",
      description: "꽃을 오가며 꽃가루를 옮겨요.",
      native: true,
      icon: "◈",
    },
    {
      id: "earthworm",
      name: "지렁이",
      role: "분해를 돕는 생물",
      description: "낙엽 같은 유기물을 먹고 흙속 순환을 도와요.",
      native: true,
      icon: "〰",
    },
    {
      id: "plastic",
      name: "플라스틱 꽃",
      role: "장식물",
      description: "모양은 화려하지만 꿀과 꽃가루를 만들지 못해요.",
      native: false,
      icon: "✦",
    },
    {
      id: "lamp",
      name: "정원 조명",
      role: "시설물",
      description: "정원을 밝혀 주지만 생태계의 세 역할을 대신하지 못해요.",
      native: false,
      icon: "☼",
    },
    {
      id: "robot",
      name: "청소 로봇",
      role: "시설물",
      description: "길을 청소하지만 낙엽을 흙의 양분으로 돌려주지는 못해요.",
      native: false,
      icon: "▣",
    },
  ],
  requiredIds: ["wildflower", "bee", "earthworm"],
  explanation:
    "생산자, 수분 매개자, 분해를 돕는 생물이 서로 연결되어 정원이 유지돼요. 실제 생태계에는 이보다 훨씬 다양한 생물과 관계가 있어요.",
} as const;

export const PHISHING_MESSAGES = [
  {
    id: "scholarship",
    sender: "[교류제 장학팀]",
    body: "축하합니다! 특별 장학금 대상자로 선정되었습니다. 10분 안에 접수비 30,000원을 송금해야 자격이 유지됩니다.",
    isPhishing: true,
    clues: [
      {
        id: "urgent",
        text: "10분 안에",
        suspicious: true,
        explanation: "생각할 틈 없이 행동하도록 재촉하는 표현이에요.",
      },
      {
        id: "payment",
        text: "접수비 30,000원 송금",
        suspicious: true,
        explanation:
          "장학금을 받기 전에 돈을 보내라는 요청은 공식 담당 부서에 따로 확인해야 해요.",
      },
      {
        id: "sender",
        text: "교류제 장학팀",
        suspicious: false,
        explanation: "발신자 이름만으로 진짜인지 확인할 수는 없어요.",
      },
    ],
  },
  {
    id: "portal",
    sender: "[학생지원 안내]",
    body: "교류제 참가 확인서가 준비되었습니다. 평소 이용하던 학교 포털에 직접 접속하여 학생지원 메뉴에서 확인해 주세요. 이 문자에는 회신하지 않으셔도 됩니다.",
    isPhishing: false,
    clues: [
      {
        id: "direct",
        text: "학교 포털에 직접 접속",
        suspicious: false,
        explanation:
          "메시지의 낯선 링크를 따라가지 않고, 알고 있는 공식 경로에서 확인하라는 안내예요.",
      },
      {
        id: "noReply",
        text: "회신하지 않으셔도 됩니다",
        suspicious: false,
        explanation:
          "이 메시지는 비밀번호나 금전, 개인 정보를 요구하지 않아요. 내용은 포털에서 직접 확인하세요.",
      },
    ],
  },
  {
    id: "password",
    sender: "[캠퍼스 IT지원]",
    body: "축제 서버 복구 작업 중입니다. 계정을 복구하려면 학번과 포털 비밀번호를 이 문자로 보내 주세요. 담당자가 대신 로그인하겠습니다.",
    isPhishing: true,
    clues: [
      {
        id: "secret",
        text: "포털 비밀번호를 문자로",
        suspicious: true,
        explanation:
          "비밀번호를 다른 사람에게 보내면 계정 접근 권한을 넘기게 돼요.",
      },
      {
        id: "login",
        text: "담당자가 대신 로그인",
        suspicious: true,
        explanation:
          "지원 담당자를 자처해도 비밀번호를 넘기지 말고 공식 지원 창구로 확인하세요.",
      },
    ],
  },
  {
    id: "delivery",
    sender: "[축제 굿즈 배송]",
    body: "배송지가 누락되어 오늘 반송 예정입니다. campus-gift.example/claim 에서 주민등록번호와 카드 번호를 입력하면 즉시 재배송됩니다.",
    isPhishing: true,
    clues: [
      {
        id: "personal",
        text: "주민등록번호와 카드 번호",
        suspicious: true,
        explanation:
          "배송지 수정이라는 목적과 무관한 민감한 정보를 요구하고 있어요.",
      },
      {
        id: "link",
        text: "campus-gift.example/claim",
        suspicious: true,
        explanation:
          "문자 속 낯선 링크로 이동하지 말고, 실제 이용한 배송 서비스에서 직접 확인하세요. 표시된 주소는 게임용 가상 주소예요.",
      },
    ],
  },
  {
    id: "lost",
    sender: "[학생회 분실물 안내]",
    body: "학생회관에서 발견된 분실물은 안내 데스크에서 보관 중입니다. 직접 방문해 물건의 특징을 알려 주세요. 운영 시간은 학생회관 게시판에서 확인할 수 있습니다.",
    isPhishing: false,
    clues: [
      {
        id: "visit",
        text: "안내 데스크에 직접 방문",
        suspicious: false,
        explanation:
          "온라인으로 비밀 정보나 돈을 보내라고 하지 않고, 확인 가능한 장소를 안내하고 있어요.",
      },
      {
        id: "board",
        text: "학생회관 게시판에서 확인",
        suspicious: false,
        explanation:
          "별도 경로로 내용을 확인할 수 있어요. 평범해 보이는 문자도 실제 안내와 일치하는지 확인하면 좋아요.",
      },
    ],
  },
] as const;

export const NETWORK_PUZZLE = {
  nodes: [
    {
      id: "terminal",
      label: "캠퍼스 단말",
      description: "신호가 출발하는 곳",
      column: 0,
      row: 1,
    },
    {
      id: "firewall",
      label: "방화벽",
      description: "접근 규칙에 따라 트래픽 검사",
      column: 1,
      row: 0,
    },
    {
      id: "relay",
      label: "외부 중계소",
      description: "관리하지 않는 외부 경로",
      column: 1,
      row: 2,
    },
    {
      id: "auth",
      label: "인증 게이트",
      description: "사용자와 접근 권한 확인",
      column: 2,
      row: 0,
    },
    {
      id: "public",
      label: "공개 저장소",
      description: "누구나 읽을 수 있는 공간",
      column: 2,
      row: 2,
    },
    {
      id: "server",
      label: "축제 서버",
      description: "허가받은 신호의 목적지",
      column: 3,
      row: 1,
    },
  ],
  correctPath: ["terminal", "firewall", "auth", "server"],
  explanation:
    "이 모형의 경로는 접근 규칙을 검사한 뒤 사용자 권한을 확인하도록 설계했어요. 실제 보안에는 암호화, 업데이트, 모니터링 등 여러 보호 장치가 함께 필요해요.",
} as const;

export const CIPHER_PUZZLE = {
  encoded: "FDPSXV",
  shift: 3,
  answer: "CAMPUS",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  explanation:
    "카이사르 암호는 알파벳을 일정한 칸 수만큼 옮기는 오래된 치환 암호예요. 규칙을 배우는 퍼즐로 적합하지만 현대의 비밀 정보를 보호하기에는 쉽게 풀려요.",
} as const;
