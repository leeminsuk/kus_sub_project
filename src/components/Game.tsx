"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Camera,
  Check,
  CheckCheck,
  ChevronRight,
  Compass,
  Download,
  Flag,
  Leaf,
  Map,
  MapPin,
  Maximize2,
  PawPrint,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  QUESTS,
  QUEST_BY_ID,
  QUEST_IDS,
  LANDMARKS,
  STORY,
  FINALE_POSITION,
  type Position,
  type QuestId,
} from "@/game/content";
import {
  completeQuest,
  createInitialState,
  finishAdventure,
  getProgress,
  getResultArchetype,
  importState,
  recordDiscovery,
  sanitizeState,
  serializeState,
  STORAGE_KEY,
  type GameState,
} from "@/game/state";
import type { CampusEngine, FrameInfo, Nearby } from "@/game/engine";
import QuestChallenge from "./QuestChallenge";
import {
  DISCOVERIES,
  DISCOVERY_BY_ID,
  type DiscoveryId,
} from "@/game/discoveries";

type Panel =
  | "intro"
  | "enroll"
  | "journal"
  | "map"
  | "settings"
  | "guide"
  | "finale"
  | "result"
  | "reset"
  | "discovery"
  | null;
const emptyFrame: FrameInfo = {
  position: { x: 0, z: 58 },
  nearby: null,
  fps: 0,
  moving: false,
};
function downloadFile(content: Blob | string, name: string) {
  const url =
    typeof content === "string" ? content : URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  if (typeof content !== "string")
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CampusMap({
  position,
  completed,
  tracked,
  large = false,
  onSelect,
}: {
  position: Position;
  completed: GameState["completed"];
  tracked: QuestId | null;
  large?: boolean;
  onSelect?: (id: QuestId) => void;
}) {
  return (
    <svg
      viewBox="-83 -83 166 166"
      role="img"
      aria-label="캠퍼스 지도와 현재 위치"
      className={large ? "campus-map large" : "campus-map"}
    >
      <rect x="-83" y="-83" width="166" height="166" rx="8" fill="#dce5cf" />
      <path
        d="M-69 -66Q-87 0 -66 70M69 -66Q86 0 66 70"
        stroke="#a9c1a1"
        strokeWidth="9"
        fill="none"
      />
      <path
        d="M0 76V-71M-67 -15H67M-67 15H67M-44 -55V52M44 -55V52"
        stroke="#faf4df"
        strokeWidth="7"
        fill="none"
      />
      <circle cx="0" cy="0" r="16" fill="#e7d6b6" />
      <circle
        cx="0"
        cy="0"
        r="9"
        fill="none"
        stroke="#c2a577"
        strokeWidth="1"
      />
      {LANDMARKS.filter((l) => l.style !== "plaza").map((l) => (
        <g key={l.id}>
          <rect
            x={l.position.x - l.width / 2}
            y={l.position.z - l.depth / 2}
            width={l.width}
            height={l.depth}
            rx={l.style === "pond" ? 8 : 1.5}
            fill={l.style === "pond" ? "#83bebb" : l.color}
            stroke="#fff9e9"
            strokeWidth="1.1"
          />
          {large && (
            <text
              x={l.position.x}
              y={l.position.z + 1}
              textAnchor="middle"
              fill="#3b524a"
              fontSize="3.3"
              fontWeight="600"
            >
              {l.name}
            </text>
          )}
        </g>
      ))}
      {QUESTS.map((q) => (
        <g
          key={q.id}
          onClick={() => onSelect?.(q.id)}
          role={large ? "button" : undefined}
          tabIndex={large ? 0 : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.(q.id);
            }
          }}
          aria-label={`${q.title} 길 안내`}
          style={{ cursor: onSelect ? "pointer" : "default" }}
        >
          <circle
            cx={q.position.x}
            cy={q.position.z}
            r={large ? 6 : 5}
            fill="transparent"
          />
          {tracked === q.id && (
            <circle
              cx={q.position.x}
              cy={q.position.z}
              r="5"
              stroke="#b7914a"
              strokeWidth="1"
              fill="none"
            />
          )}
          <circle
            cx={q.position.x}
            cy={q.position.z}
            r="3"
            fill={
              completed[q.id]
                ? "#b3bda4"
                : q.department === "bio"
                  ? "#51886a"
                  : "#617eab"
            }
            stroke="#fff"
            strokeWidth="1"
          />
          {completed[q.id] && (
            <path
              d={`M${q.position.x - 1.3} ${q.position.z}l1 1 2-2`}
              fill="none"
              stroke="#fff"
              strokeWidth=".7"
            />
          )}
        </g>
      ))}
      <circle
        cx={position.x}
        cy={position.z}
        r="6"
        fill="#a62c4c"
        opacity=".15"
      />
      <circle
        cx={position.x}
        cy={position.z}
        r="2.8"
        fill="#a62c4c"
        stroke="white"
        strokeWidth="1.2"
      />
      <text x="70" y="-70" fill="#385e50" fontSize="6" textAnchor="middle">
        N
      </text>
      <path d="M70 -66l-2 5h4z" fill="#385e50" />
    </svg>
  );
}
function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <span className="brand-emblem">
        121<span>1</span>
      </span>
      <div>
        <strong>캠퍼스의 신호</strong>
        <span>A DAY BEYOND YOUR MAJOR</span>
      </div>
    </div>
  );
}

export default function Game() {
  const viewport = useRef<HTMLDivElement>(null);
  const engine = useRef<CampusEngine | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const interactionRef = useRef<(id: NonNullable<Nearby>) => void>(() => {});
  const [state, setState] = useState<GameState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [panel, setPanel] = useState<Panel>("intro");
  const [quest, setQuest] = useState<QuestId | null>(null);
  const [frame, setFrame] = useState(emptyFrame);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nickname, setNickname] = useState("");
  const [major, setMajor] = useState("");
  const [sound, setSound] = useState(false);
  const [help, setHelp] = useState(true);
  const [photo, setPhoto] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryId>("tiger");
  const [pawSteps, setPawSteps] = useState<string[]>([]);
  const [pawHint, setPawHint] = useState("");
  const [saveAvailable, setSaveAvailable] = useState(true);
  const audio = useRef<{
    ctx: AudioContext;
    timer: ReturnType<typeof setInterval>;
  } | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);
  const progress = getProgress(state);
  const result = getResultArchetype(state);
  const tracked = state.trackedQuest ? QUEST_BY_ID[state.trackedQuest] : null;
  const activeNearby =
    frame.nearby &&
    frame.nearby !== "guide" &&
    frame.nearby !== "finale" &&
    !frame.nearby.startsWith("discovery:")
      ? QUEST_BY_ID[frame.nearby as QuestId]
      : null;
  const nearbyDiscovery = frame.nearby?.startsWith("discovery:")
    ? DISCOVERY_BY_ID[frame.nearby.slice(10) as DiscoveryId]
    : null;
  stateRef.current = state;
  interactionRef.current = (id) => {
    if (id.startsWith("discovery:")) {
      if (id === "discovery:echo") playChime();
      setDiscovery(id.slice(10) as DiscoveryId);
      setPawSteps([]);
      setPawHint("");
      setPanel("discovery");
    } else if (id === "guide" || id === "finale") setPanel(id);
    else setQuest(id as QuestId);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = sanitizeState(JSON.parse(raw));
        stateRef.current = saved;
        setState(saved);
        setNickname(saved.nickname);
        setMajor(saved.major);
      }
    } catch {
      setSaveAvailable(false);
    }
    setHydrated(true);
    let dead = false;
    let instance: CampusEngine | null = null;
    import("@/game/engine")
      .then(({ CampusEngine: Engine }) => {
        if (dead || !viewport.current) return;
        try {
          instance = new Engine(viewport.current, {
            onFrame: (info) => setFrame(info),
            onInteract: (id) => interactionRef.current(id),
            onReady: () => {
              if (!dead) setReady(true);
            },
            onError: (message) => setError(message),
          });
          engine.current = instance;
          instance.setPosition(stateRef.current.position);
        } catch {
          setError(
            "이 브라우저에서 3D 화면을 시작하지 못했어요. WebGL을 지원하는 최신 Chrome 또는 Safari로 접속해 주세요.",
          );
        }
      })
      .catch(() => {
        if (!dead)
          setError(
            "3D 엔진을 불러오지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.",
          );
      });
    return () => {
      dead = true;
      instance?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    if (!engine.current) return;
    engine.current.setStarted(
      state.started && panel !== "intro" && panel !== "enroll",
    );
    engine.current.setPaused(!!panel || !!quest || photo);
    engine.current.setPhotoMode(photo);
    engine.current.setDiscoveries(state.discoveries);
    engine.current.setProgress(
      QUEST_IDS.filter((id) => !!state.completed[id]),
      state.endingSeen,
    );
    engine.current.setTracked(
      tracked?.position ?? (progress.readyForFinale ? FINALE_POSITION : null),
    );
  }, [
    state.started,
    state.completed,
    state.endingSeen,
    panel,
    quest,
    tracked,
    progress.readyForFinale,
    ready,
    photo,
    state.discoveries,
  ]);
  useEffect(() => {
    if (!hydrated) return;
    const save = () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          serializeState({
            ...stateRef.current,
            position:
              engine.current?.getPosition() ?? stateRef.current.position,
          }),
        );
      } catch {
        setSaveAvailable(false);
      }
    };
    save();
    const timer = setInterval(save, 1800);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [hydrated, state]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
      )
        return;
      if (!state.started || panel === "intro") return;
      if (photo) {
        if (e.code === "Escape" || e.code === "KeyP") setPhoto(false);
        return;
      }
      if (e.code === "KeyP" && !panel && !quest) setPhoto(true);
      if (e.code === "Escape") {
        if (quest) setQuest(null);
        else setPanel((p) => (p ? null : "settings"));
      }
      if (e.code === "KeyM" && !quest)
        setPanel((p) => (p === "map" ? null : "map"));
      if (e.code === "KeyJ" && !quest)
        setPanel((p) => (p === "journal" ? null : "journal"));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [state.started, panel, quest, photo]);
  useEffect(() => {
    if (!quest && (!panel || panel === "intro")) return;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    if (!dialog) return;
    const before =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const selector =
      'button:not(:disabled),input:not(:disabled),[tabindex="0"]';
    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null,
      );
    (
      dialog.querySelector<HTMLInputElement>("input:not([type=range])") ??
      focusable()[0]
    )?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0],
        last = elements[elements.length - 1];
      if (!first) return;
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      if (before?.isConnected) before.focus();
    };
  }, [panel, quest]);
  useEffect(
    () => () => {
      if (audio.current) {
        clearInterval(audio.current.timer);
        audio.current.ctx.close();
      }
    },
    [],
  );
  const playChime = () => {
    try {
      const ctx = new AudioContext();
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const at = ctx.currentTime + index * 0.22;
        osc.frequency.value = frequency;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.07, at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 2);
      });
      void ctx.resume();
      setTimeout(() => void ctx.close(), 3000);
    } catch {
      setNotice("바람에 세 가지 음이 하나의 화음으로 이어져요.");
    }
  };
  const toggleAudio = () => {
    if (audio.current) {
      clearInterval(audio.current.timer);
      audio.current.ctx.close();
      audio.current = null;
      setSound(false);
      return;
    }
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      gain.connect(ctx.destination);
      let note = 0;
      const notes = [261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66];
      const play = () => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = notes[note++ % notes.length];
        env.gain.setValueAtTime(0, ctx.currentTime);
        env.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.15);
        env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.7);
        osc.connect(env);
        env.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + 3);
      };
      void ctx.resume();
      play();
      audio.current = { ctx, timer: setInterval(play, 900) };
      setSound(true);
    } catch {
      setNotice("이 브라우저에서는 소리를 사용할 수 없어요.");
    }
  };
  const begin = () => {
    const next = { ...createInitialState(nickname, major), started: true };
    stateRef.current = next;
    setState(next);
    engine.current?.setPosition(next.position);
    setPanel("guide");
  };
  const follow = (id: QuestId) => {
    setState((s) => ({ ...s, trackedQuest: id }));
    setPanel(null);
    setNotice(`${QUEST_BY_ID[id].location}까지 빛을 따라가 보세요.`);
  };
  const completedQuest = (id: QuestId, score: number) => {
    setState((s) => completeQuest(s, id, score));
    setQuest(null);
    setNotice(`${QUEST_BY_ID[id].reward} 획득!`);
  };
  const backup = () =>
    downloadFile(
      new Blob(
        [
          serializeState({
            ...state,
            position: engine.current?.getPosition() ?? state.position,
          }),
        ],
        { type: "application/json" },
      ),
      "campus-signals-save.json",
    );
  const restore = async (file: File) => {
    try {
      if (file.size > 100_000) throw new Error("저장 파일이 너무 큽니다.");
      const restored = importState(await file.text());
      stateRef.current = restored;
      setState(restored);
      engine.current?.setPosition(restored.position);
      setPanel(restored.started ? null : "intro");
      setNotice("탐험 기록을 불러왔어요.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "파일을 확인해 주세요.");
    }
  };
  const downloadResult = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f5f1e5";
    ctx.fillRect(0, 0, 1200, 1500);
    ctx.fillStyle = "#153f34";
    ctx.fillRect(40, 40, 1120, 1420);
    ctx.strokeStyle = "#bda778";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 70, 1060, 1360);
    ctx.textAlign = "center";
    ctx.fillStyle = "#d5bd82";
    ctx.font = '25px "Noto Sans KR", sans-serif';
    ctx.fillText("A DAY BEYOND YOUR MAJOR", 600, 155);
    ctx.font = 'bold 88px "Gowun Batang", serif';
    ctx.fillStyle = "#fff7df";
    ctx.fillText("121분의 1", 600, 290);
    ctx.font = '30px "Noto Sans KR", sans-serif';
    ctx.fillText("캠퍼스의 신호 · 탐험 수료증", 600, 365);
    ctx.fillStyle = "#d5bd82";
    ctx.font = '110px "Gowun Batang", serif';
    ctx.fillText("✦", 600, 590);
    ctx.fillStyle = "#fff7df";
    ctx.font = 'bold 49px "Noto Sans KR", sans-serif';
    ctx.fillText(state.nickname, 600, 750);
    ctx.font = '34px "Noto Sans KR", sans-serif';
    ctx.fillText(result.title, 600, 830);
    ctx.fillStyle = "#bcd0bd";
    ctx.font = '26px "Noto Sans KR", sans-serif';
    ctx.fillText(state.major, 600, 895);
    ctx.fillStyle = "#f5edcf";
    ctx.font = 'bold 38px "Noto Sans KR", sans-serif';
    ctx.fillText(
      `생명과학 ${result.bioScore}  ·  정보보안 ${result.cyberScore}`,
      600,
      1060,
    );
    ctx.font = '27px "Noto Sans KR", sans-serif';
    ctx.fillText("6개의 신호를 되찾고, 전공의 경계를 넘다.", 600, 1180);
    ctx.fillStyle = "#a9bdad";
    ctx.font = '22px "Noto Sans KR", sans-serif';
    ctx.fillText("고려대학교에서 영감을 받은 가상의 캠퍼스", 600, 1360);
    downloadFile(canvas.toDataURL("image/png"), "나의-캠퍼스-탐험.png");
  };
  const paw = (side: string) => {
    const sequence = [...pawSteps, side];
    setPawSteps(sequence);
    if (sequence.length === 4) {
      if (sequence.join("") === "LRRL") {
        setState((s) => ({
          ...recordDiscovery(s, "tiger"),
          secretFound: true,
        }));
        setPawHint(
          "작은 발자국이 황금빛으로 반짝였어요. 캠퍼스의 숨은 친구가 되었습니다!",
        );
        setNotice("이스터에그 발견 · 121번째 호랑이");
      } else {
        setPawHint(
          "호랑이가 고개를 갸웃했어요. 도서관의 오래된 책에 단서가 있을지도?",
        );
        setPawSteps([]);
      }
    }
  };
  const takePhoto = () => {
    const data = engine.current?.capture();
    if (data) {
      downloadFile(data, "나의-캠퍼스-사진.png");
      setNotice("캠퍼스의 한 장면을 사진으로 남겼어요.");
    }
  };
  const moveTouch = (x: number, y: number) =>
    engine.current?.setTouchInput(x, y);
  return (
    <main className={`game-shell ${photo ? "photo-mode" : ""}`}>
      <div ref={viewport} className="world-viewport" />
      {panel === "intro" && <div className="intro-shade" />}
      <header className={`game-header ${panel === "intro" ? "on-intro" : ""}`}>
        <Brand small={panel !== "intro"} />
        {panel !== "intro" && state.started && (
          <div className="world-label">
            <span className="live-dot" /> ANAM CAMPUS{" "}
            <span>가을, 오후 3:00</span>
          </div>
        )}
        <nav aria-label="게임 메뉴" className="header-actions">
          {state.started && panel !== "intro" && (
            <>
              <button
                className={`icon-button ${panel === "map" ? "active" : ""}`}
                onClick={() => setPanel("map")}
                title="캠퍼스 지도 (M)"
                aria-label="캠퍼스 지도"
              >
                <Map size={21} />
              </button>
              <button
                className={`icon-button ${panel === "journal" ? "active" : ""}`}
                onClick={() => setPanel("journal")}
                title="퀘스트 노트 (J)"
                aria-label="퀘스트 노트"
              >
                <BookOpen size={21} />
              </button>
            </>
          )}
          <button
            className="icon-button"
            onClick={toggleAudio}
            title={sound ? "소리 끄기" : "배경 음악 켜기"}
            aria-label={sound ? "소리 끄기" : "배경 음악 켜기"}
          >
            {sound ? <Volume2 size={21} /> : <VolumeX size={21} />}
          </button>
          {state.started && panel !== "intro" && (
            <button
              className="icon-button"
              onClick={() => {
                setPanel(null);
                setQuest(null);
                setPhoto(true);
              }}
              title="사진 모드 (P)"
              aria-label="사진 모드"
            >
              <Camera size={21} />
            </button>
          )}
          {state.started && panel !== "intro" && (
            <button
              className="icon-button"
              onClick={() => setPanel("settings")}
              title="설정"
              aria-label="설정"
            >
              <Settings size={21} />
            </button>
          )}
        </nav>
      </header>
      {panel === "intro" && (
        <section className="intro-content">
          <div className="eyebrow">
            <span /> OPEN WORLD CAMPUS ADVENTURE
          </div>
          <h1>
            오늘은,
            <br />
            다른 전공으로.
          </h1>
          <p className="intro-description">
            익숙한 캠퍼스, 낯선 가능성.
            <br />
            여섯 개의 신호를 따라
            <br />
            당신의 세계를 한 뼘 넓혀 보세요.
          </p>
          <div className="intro-tags">
            <span>
              <Compass size={14} /> 자유로운 탐험
            </span>
            <span>
              <Leaf size={14} /> 두 개의 전공
            </span>
            <span>
              <Flag size={14} /> 여섯 개의 이야기
            </span>
          </div>
          <button
            className="enter-button"
            disabled={!ready}
            onClick={() =>
              state.started ? setPanel(null) : setPanel("enroll")
            }
          >
            <span>
              {!ready
                ? "캠퍼스를 준비하고 있어요"
                : state.started
                  ? "나의 탐험 이어가기"
                  : "캠퍼스에 들어가기"}
            </span>
            {ready ? <ArrowUpRight size={22} /> : <span className="spinner" />}
          </button>
          {state.started && (
            <button
              className="text-button intro-reset"
              onClick={() => setPanel("reset")}
            >
              새로운 하루 시작하기
            </button>
          )}
          <p className="intro-footnote">정해진 시간 없이, 나만의 속도로.</p>
        </section>
      )}
      {panel === "intro" && (
        <>
          <div className="intro-scene-caption">
            <span className="caption-line" />
            <span>
              고려대학교에서 영감을 받은
              <br />
              <strong>조금 다른 캠퍼스의 하루</strong>
            </span>
            <span className="coordinate">
              37°35′ N<br />
              127°01′ E
            </span>
          </div>
          <footer className="intro-footer">
            <span>
              121분의 1 <span className="muted">— CAMPUS SIGNALS</span>
            </span>
            <span>
              WASD / 방향키 이동 <i /> 마우스로도 자유롭게
            </span>
          </footer>
        </>
      )}
      {state.started && panel !== "intro" && panel !== "enroll" && (
        <>
          <aside className="quest-tracker">
            <button className="tracker-top" onClick={() => setPanel("journal")}>
              <span className="eyebrow">FOLLOW THE SIGNAL</span>
              <ArrowUpRight size={16} />
            </button>
            <div className="tracker-title">
              {state.endingSeen
                ? "당신의 다음 발견은?"
                : (tracked?.title ?? "축제의 불빛을 켜다")}
            </div>
            <p>
              {state.endingSeen
                ? "다시 걷고, 다시 만나고, 다시 도전해요."
                : (tracked?.summary ??
                  "모든 신호가 모였어요. 중앙광장으로 돌아가세요.")}
            </p>
            <div className="tracker-location">
              <MapPin size={14} />
              <span>
                {state.endingSeen
                  ? "자유 탐험"
                  : (tracked?.location ?? "교류제 광장")}
              </span>
              <strong>
                {Math.round(
                  Math.hypot(
                    (tracked?.position.x ?? 0) - frame.position.x,
                    (tracked?.position.z ?? -6) - frame.position.z,
                  ),
                )}{" "}
                m
              </strong>
            </div>
            <div className="signal-progress">
              <div>
                {QUESTS.map((q) => (
                  <span
                    key={q.id}
                    className={`${q.department} ${state.completed[q.id] ? "done" : ""}`}
                    title={q.title}
                  >
                    {state.completed[q.id] ? <Check size={10} /> : null}
                  </span>
                ))}
              </div>
              <span>
                신호 <b>{progress.completed}</b> / 6
              </span>
            </div>
          </aside>
          {!panel && !quest && help && (
            <div className="controls-hint">
              <div>
                <kbd>W</kbd>
                <div>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd>
                </div>
              </div>
              <p>
                자유롭게 걷기
                <br />
                <span>
                  Shift 달리기 · Space 점프
                  <br />
                  우클릭 드래그 시점 · 휠 확대
                </span>
              </p>
              <button
                aria-label="조작 안내 닫기"
                onClick={() => setHelp(false)}
              >
                <X size={13} />
              </button>
            </div>
          )}
          {!panel && !quest && (
            <div className="interaction-area">
              {frame.nearby ? (
                <button
                  className="interact-button"
                  onClick={() => engine.current?.interact()}
                >
                  <span className="interact-key">E</span>
                  <span>
                    <small>
                      {activeNearby?.npc ??
                        nearbyDiscovery?.title ??
                        (frame.nearby === "guide"
                          ? "캠퍼스 안내 · 호연"
                          : "여섯 개의 신호, 하나의 축제")}
                    </small>
                    <strong>
                      {nearbyDiscovery
                        ? nearbyDiscovery.prompt
                        : activeNearby
                          ? "이야기 나누기"
                          : frame.nearby === "guide"
                            ? "캠퍼스 이야기 듣기"
                            : state.endingSeen
                              ? "나의 결과 카드 보기"
                              : "축제 장치 살펴보기"}
                    </strong>
                  </span>
                  <ChevronRight size={20} />
                </button>
              ) : (
                <span className="walking-hint">
                  <span className="live-dot" />{" "}
                  {frame.moving
                    ? "새로운 발견을 향해 걷는 중"
                    : "길 위를 클릭하거나 방향키로 걸어 보세요"}
                </span>
              )}
            </div>
          )}
          <button
            className="minimap-panel"
            onClick={() => setPanel("map")}
            aria-label="전체 지도 열기"
          >
            <div className="minimap-head">
              <span>안암 캠퍼스</span>
              <Maximize2 size={13} />
            </div>
            <CampusMap
              position={frame.position}
              completed={state.completed}
              tracked={state.trackedQuest}
            />
            <div className="minimap-foot">
              <span className="map-you" /> 나의 위치 <span>M 지도</span>
            </div>
          </button>
          {!panel && !quest && (
            <div className="touch-controls" aria-label="터치 이동 조작">
              {[
                { x: 0, y: -1, label: "앞으로", icon: <ArrowUp /> },
                { x: -1, y: 0, label: "왼쪽으로", icon: <ArrowLeft /> },
                { x: 0, y: 1, label: "뒤로", icon: <ArrowDown /> },
                { x: 1, y: 0, label: "오른쪽으로", icon: <ArrowRight /> },
              ].map((b, i) => (
                <button
                  key={b.label}
                  className={`touch-${i}`}
                  aria-label={b.label}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    moveTouch(b.x, b.y);
                  }}
                  onPointerUp={() => moveTouch(0, 0)}
                  onPointerCancel={() => moveTouch(0, 0)}
                  onLostPointerCapture={() => moveTouch(0, 0)}
                >
                  {b.icon}
                </button>
              ))}
            </div>
          )}
          <div className="save-indicator">
            {saveAvailable ? (
              <>
                <CheckCheck size={12} /> 자동 저장
              </>
            ) : (
              <>
                <Download size={12} /> 설정에서 기록을 백업해 주세요
              </>
            )}
          </div>
        </>
      )}
      {((panel && panel !== "intro") || quest) && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && panel !== "enroll") {
              setPanel(null);
              setQuest(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={`modal ${panel === "map" ? "map-modal" : panel === "journal" ? "journal-modal" : panel === "result" ? "result-modal" : quest ? "challenge-modal" : ""}`}
          >
            <button
              className="modal-close"
              onClick={() => {
                setQuest(null);
                setPanel(state.started ? null : "intro");
              }}
              aria-label="닫기"
            >
              <X size={21} />
            </button>
            {panel === "enroll" && (
              <>
                <div className="eyebrow">YOUR FIRST PAGE</div>
                <h2 id="dialog-title">당신의 하루를 시작해요.</h2>
                <p className="modal-description">
                  낯선 전공을 만나기 전, 캠퍼스 여권에 이름을 적어 주세요.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    begin();
                  }}
                >
                  <label className="field-label">
                    어떻게 불러 드릴까요?
                    <input
                      autoFocus
                      maxLength={18}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="닉네임 (선택)"
                    />
                  </label>
                  <label className="field-label">
                    지금의 전공 또는 관심 분야
                    <input
                      maxLength={32}
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="전공 탐색 중 (선택)"
                    />
                  </label>
                  <div className="passport-note">
                    <BookOpen size={22} />
                    <p>
                      오늘의 전공은 아직 정해지지 않았어요.
                      <br />
                      <strong>어디부터 시작할지는 당신이 정해요.</strong>
                    </p>
                  </div>
                  <button type="submit" className="primary-button full">
                    나의 캠퍼스 여권 만들기 <ArrowRight size={18} />
                  </button>
                </form>
              </>
            )}
            {panel === "guide" && (
              <>
                <div className="dialog-avatar">
                  H<span>호연</span>
                </div>
                <div className="eyebrow">PROLOGUE · 캠퍼스 정문</div>
                <h2 id="dialog-title">새로운 하루에 온 걸 환영해!</h2>
                <p className="npc-dialogue">{STORY.guide}</p>
                <div className="guide-steps">
                  <div>
                    <Leaf />
                    <strong>생명을 관찰하고</strong>
                    <span>연못 · 온실 · 연구실</span>
                  </div>
                  <div>
                    <ShieldCheck />
                    <strong>숨은 신호를 읽고</strong>
                    <span>학생회관 · 정보관 · 도서관</span>
                  </div>
                  <div>
                    <Sparkles />
                    <strong>축제를 다시 밝히기</strong>
                    <span>여섯 신호가 만나는 광장</span>
                  </div>
                </div>
                <p className="soft-note">
                  {STORY.order} NPC 근처에서 E 또는 대화 버튼을 누르세요.
                </p>
                <button
                  className="primary-button full"
                  onClick={() => setPanel(null)}
                >
                  좋아, 한번 걸어 볼까? <ArrowRight size={18} />
                </button>
              </>
            )}
            {panel === "journal" && (
              <>
                <div className="eyebrow">YOUR CAMPUS JOURNAL</div>
                <h2 id="dialog-title">작은 발견들이 모이는 곳</h2>
                <p className="modal-description">
                  순서는 당신에게 맡길게요. 마음이 가는 신호를 따라가 보세요.
                </p>
                <div className="journal-summary">
                  <span>
                    <Leaf size={17} /> 생명과학 <b>{progress.bio}/3</b>
                  </span>
                  <span>
                    <ShieldCheck size={17} /> 정보보안 <b>{progress.cyber}/3</b>
                  </span>
                  <span>
                    전체 <b>{progress.completed}/6</b>
                  </span>
                </div>
                <div className="quest-list">
                  {QUESTS.map((q, i) => (
                    <article
                      key={q.id}
                      className={`quest-entry ${state.completed[q.id] ? "completed" : ""}`}
                    >
                      <div className={`quest-number ${q.department}`}>
                        {state.completed[q.id] ? (
                          <Check size={20} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </div>
                      <div>
                        <span className="quest-meta">
                          {q.department === "bio" ? "생명과학" : "정보보안"} ·{" "}
                          {q.location}
                        </span>
                        <h3>{q.title}</h3>
                        <p>{q.summary}</p>
                        {state.completed[q.id] && (
                          <span className="best-score">
                            최고 기록 {state.completed[q.id]?.score}점 · 다시
                            도전할 수 있어요
                          </span>
                        )}
                      </div>
                      <button
                        className="small-button"
                        onClick={() => follow(q.id)}
                      >
                        {state.trackedQuest === q.id ? "안내 중" : "길 안내"}
                        <ArrowUpRight size={15} />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="discovery-journal">
                  <div>
                    <span className="eyebrow">LITTLE MOMENTS</span>
                    <span>{state.discoveries.length} / 4 발견</span>
                  </div>
                  <div className="discovery-stamps">
                    {DISCOVERIES.map((d) => (
                      <div
                        key={d.id}
                        className={
                          state.discoveries.includes(d.id) ? "collected" : ""
                        }
                      >
                        <span>
                          {state.discoveries.includes(d.id) ? "✦" : "?"}
                        </span>
                        <small>
                          {state.discoveries.includes(d.id)
                            ? d.title
                            : "아직 남겨 두지 못한 순간"}
                        </small>
                      </div>
                    ))}
                  </div>
                  {state.secretFound && (
                    <p className="secret-badge">
                      <PawPrint size={15} /> 121번째 호랑이 · 숨은 친구를
                      발견했어요
                    </p>
                  )}
                </div>
                <div className="journal-ending">
                  <Sparkles size={18} />
                  <div>
                    <strong>
                      {progress.readyForFinale
                        ? "모든 신호가 준비됐어요!"
                        : "에필로그 · 다른 지식, 하나의 축제"}
                    </strong>
                    <span>
                      {progress.readyForFinale
                        ? "중앙광장에 돌아가 축제의 불빛을 켜세요."
                        : "여섯 가지 의뢰를 해결하면 마지막 이야기가 열려요."}
                    </span>
                  </div>
                </div>
              </>
            )}
            {panel === "map" && (
              <>
                <div className="eyebrow">TAKE THE SCENIC ROUTE</div>
                <h2 id="dialog-title">어디로 가 볼까요?</h2>
                <p className="modal-description">
                  가고 싶은 장소를 선택하면 발밑의 빛이 방향을 알려 줘요.
                </p>
                <div className="map-layout">
                  <div className="map-canvas">
                    <CampusMap
                      large
                      position={frame.position}
                      completed={state.completed}
                      tracked={state.trackedQuest}
                      onSelect={follow}
                    />
                    <div className="map-legend">
                      <span>
                        <i className="bio-dot" /> 생명과학
                      </span>
                      <span>
                        <i className="cyber-dot" /> 정보보안
                      </span>
                      <span>
                        <i className="you-dot" /> 현재 위치
                      </span>
                    </div>
                  </div>
                  <div className="map-places">
                    {QUESTS.map((q, i) => (
                      <button key={q.id} onClick={() => follow(q.id)}>
                        <span className={`place-index ${q.department}`}>
                          {state.completed[q.id] ? <Check size={16} /> : i + 1}
                        </span>
                        <span>
                          <strong>{q.location}</strong>
                          <small>{q.title}</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                    <div className="map-note">
                      <Compass size={20} />
                      <p>
                        가끔은 길을 벗어나도 좋아요.
                        <br />
                        발견은 예상 밖에서 시작되니까요.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {quest && (
              <>
                <div
                  className={`challenge-heading ${QUEST_BY_ID[quest].department}`}
                >
                  <div className="eyebrow">
                    {QUEST_BY_ID[quest].department === "bio"
                      ? "LIFE SCIENCE LAB"
                      : "CYBER SECURITY LAB"}{" "}
                    · {QUEST_BY_ID[quest].location}
                  </div>
                  <h2 id="dialog-title">{QUEST_BY_ID[quest].title}</h2>
                  <p>{QUEST_BY_ID[quest].npc}</p>
                </div>
                <QuestChallenge
                  key={quest}
                  quest={QUEST_BY_ID[quest]}
                  onComplete={(score) => completedQuest(quest, score)}
                />
              </>
            )}
            {panel === "finale" && (
              <>
                <div className="finale-symbol">
                  <Sparkles size={54} />
                </div>
                <div className="eyebrow">EPILOGUE · 교류제 광장</div>
                <h2 id="dialog-title">다른 지식, 하나의 축제</h2>
                <p className="npc-dialogue">
                  {progress.readyForFinale ? STORY.finale : STORY.finaleLocked}
                </p>
                <div className="finale-signals">
                  {QUESTS.map((q) => (
                    <div
                      key={q.id}
                      className={state.completed[q.id] ? "lit" : ""}
                    >
                      {q.department === "bio" ? (
                        <Leaf size={22} />
                      ) : (
                        <ShieldCheck size={22} />
                      )}
                      <span>{q.reward.split(" · ")[1]}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="primary-button full"
                  onClick={() => {
                    if (progress.readyForFinale) {
                      setState((s) => finishAdventure(s));
                      setPanel("result");
                    } else setPanel("journal");
                  }}
                >
                  {progress.readyForFinale
                    ? state.endingSeen
                      ? "나의 결과 카드 보기"
                      : "여섯 개의 신호로 축제 밝히기"
                    : "남은 신호 찾아보기"}
                  <Sparkles size={18} />
                </button>
              </>
            )}
            {panel === "result" && (
              <>
                <div className="result-top">
                  <div className="eyebrow">A DAY BEYOND YOUR MAJOR</div>
                  <span className="result-star">✦</span>
                  <p>오늘, 당신의 세계가 넓어졌어요.</p>
                  <h2 id="dialog-title">
                    {state.nickname}의<br />
                    조금 다른 하루
                  </h2>
                  <div className="result-type">{result.title}</div>
                  <p className="result-description">{result.description}</p>
                </div>
                <div className="result-scores">
                  <div>
                    <Leaf />
                    <span>생명과학</span>
                    <strong>
                      {result.bioScore}
                      <small>/100</small>
                    </strong>
                  </div>
                  <div>
                    <ShieldCheck />
                    <span>정보보안</span>
                    <strong>
                      {result.cyberScore}
                      <small>/100</small>
                    </strong>
                  </div>
                </div>
                {state.secretFound && (
                  <p className="secret-badge result-secret">
                    <PawPrint size={15} /> 121번째 호랑이 · 캠퍼스의 숨은 친구
                  </p>
                )}
                <div className="result-footer">
                  <span>121분의 1 · 캠퍼스의 신호</span>
                  <span>6 SIGNALS FOUND</span>
                </div>
                <button
                  className="primary-button full"
                  onClick={downloadResult}
                >
                  <Download size={17} /> 나의 결과 카드 저장
                </button>
                <button
                  className="secondary-button full"
                  onClick={() => setPanel(null)}
                >
                  불빛이 켜진 캠퍼스 더 걷기 <ArrowRight size={17} />
                </button>
              </>
            )}
            {panel === "discovery" && (
              <>
                <div className="discovery-illustration">
                  {discovery === "tiger" ? (
                    <PawPrint size={50} />
                  ) : discovery === "book" ? (
                    <BookOpen size={50} />
                  ) : discovery === "bench" ? (
                    <Leaf size={50} />
                  ) : (
                    <Sparkles size={50} />
                  )}
                </div>
                <div className="eyebrow">
                  A LITTLE MOMENT · 캠퍼스의 뒷이야기
                </div>
                <h2 id="dialog-title">{DISCOVERY_BY_ID[discovery].title}</h2>
                <p className="npc-dialogue">
                  {DISCOVERY_BY_ID[discovery].description}
                </p>
                {discovery === "book" && (
                  <blockquote className="old-note">
                    “정문의 작은 호랑이는 발자국을 기억한대.
                    <br />
                    왼쪽 하나, 오른쪽 둘, 다시 왼쪽 하나.
                    <br />
                    길을 벗어나는 사람만 만날 수 있는 친구.”
                  </blockquote>
                )}
                {!state.discoveries.includes(discovery) ? (
                  <button
                    className="primary-button full"
                    onClick={() => {
                      setState((s) => recordDiscovery(s, discovery));
                      setNotice(DISCOVERY_BY_ID[discovery].reward);
                    }}
                  >
                    이 순간을 여권에 남기기 <Check size={17} />
                  </button>
                ) : (
                  <div className="collected-note">
                    <CheckCheck size={17} /> 여권에 남겨 둔 순간 ·{" "}
                    {DISCOVERY_BY_ID[discovery].reward}
                  </div>
                )}
                {discovery === "tiger" &&
                  state.discoveries.includes("tiger") && (
                    <div className="tiger-secret">
                      {state.secretFound ? (
                        <p className="secret-badge">
                          <PawPrint size={18} /> 121번째 호랑이의 친구가
                          되었어요.
                        </p>
                      ) : (
                        <>
                          <p>
                            동상 아래에 두 개의 작은 발자국이 새겨져 있어요.
                          </p>
                          <div>
                            <button
                              aria-label="왼쪽 발자국"
                              onClick={() => paw("L")}
                            >
                              <PawPrint size={27} />
                              <span>왼쪽</span>
                            </button>
                            <button
                              aria-label="오른쪽 발자국"
                              onClick={() => paw("R")}
                            >
                              <PawPrint size={27} />
                              <span>오른쪽</span>
                            </button>
                          </div>
                          <span className="paw-sequence">
                            {Array.from({ length: 4 }, (_, i) => (
                              <i
                                key={i}
                                className={pawSteps[i] ? "pressed" : ""}
                              />
                            ))}
                          </span>
                        </>
                      )}
                      {pawHint && <p role="status">{pawHint}</p>}
                    </div>
                  )}
                <button
                  className="secondary-button full"
                  onClick={() => setPanel(null)}
                >
                  다시, 나만의 산책으로 <ArrowRight size={16} />
                </button>
              </>
            )}
            {panel === "settings" && (
              <>
                <div className="eyebrow">A MOMENT TO PAUSE</div>
                <h2 id="dialog-title">잠깐 쉬어 가도 괜찮아요.</h2>
                <div className="settings-list">
                  <button onClick={toggleAudio}>
                    {sound ? <Volume2 /> : <VolumeX />}
                    <span>배경 음악</span>
                    <strong>{sound ? "켜짐" : "꺼짐"}</strong>
                  </button>
                  <button
                    onClick={() => {
                      setHelp((h) => !h);
                      setNotice(
                        help
                          ? "조작 안내를 숨겼어요."
                          : "조작 안내를 표시했어요.",
                      );
                    }}
                  >
                    <Compass />
                    <span>조작 안내</span>
                    <strong>{help ? "켜짐" : "꺼짐"}</strong>
                  </button>
                  <button onClick={backup}>
                    <Download />
                    <span>탐험 기록 백업</span>
                    <ArrowUpRight />
                  </button>
                  <button onClick={() => restoreInput.current?.click()}>
                    <Upload />
                    <span>저장 파일 불러오기</span>
                    <ArrowUpRight />
                  </button>
                  {state.endingSeen && (
                    <button onClick={() => setPanel("result")}>
                      <Sparkles />
                      <span>결과 카드 다시 보기</span>
                      <ArrowUpRight />
                    </button>
                  )}
                  <button onClick={() => setPanel("reset")}>
                    <RotateCcw />
                    <span>새로운 하루 시작하기</span>
                    <ArrowUpRight />
                  </button>
                </div>
                <p className="soft-note">
                  진행 상황은 이 브라우저에 자동 저장돼요. 다른 기기로 옮길 때는
                  기록을 백업해 주세요.
                </p>
                <p className="credits-note">
                  {STORY.campusNote}
                  <br />
                  캐릭터 원작: Coastal World · Merci-Michel / Coastal Community
                  Bank
                </p>
                <button
                  className="primary-button full"
                  onClick={() => setPanel(null)}
                >
                  캠퍼스로 돌아가기
                </button>
              </>
            )}
            {panel === "reset" && (
              <>
                <div className="eyebrow">A NEW CHAPTER</div>
                <h2 id="dialog-title">새로운 하루를 시작할까요?</h2>
                <p className="modal-description">
                  현재 탐험 기록이 초기화됩니다. 간직하고 싶은 기록은 먼저
                  백업해 두세요.
                </p>
                <button className="secondary-button full" onClick={backup}>
                  <Download size={17} /> 현재 기록 백업하기
                </button>
                <button
                  className="primary-button full"
                  onClick={() => {
                    const next = createInitialState();
                    stateRef.current = next;
                    setState(next);
                    engine.current?.setPosition(next.position);
                    setNickname("");
                    setMajor("");
                    setPanel("enroll");
                  }}
                >
                  새로운 여권 만들기
                </button>
                <button
                  className="text-button full"
                  onClick={() => setPanel(state.started ? null : "intro")}
                >
                  이전 하루로 돌아가기
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {photo && (
        <div className="photo-ui">
          <div className="photo-frame" />
          <div className="photo-top">
            <span>THE MOMENTS WE KEEP</span>
            <strong>나의 캠퍼스, 한 장면</strong>
          </div>
          <div className="photo-controls">
            <p>
              우클릭 드래그로 시점 회전 · 휠로 확대
              <br />
              터치 화면에서는 드래그와 두 손가락으로 조작하세요.
            </p>
            <div>
              <button className="primary-button" onClick={takePhoto}>
                <Camera size={19} /> 사진 저장
              </button>
              <button
                className="secondary-button"
                onClick={() => setPhoto(false)}
              >
                산책으로 돌아가기 <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      <input
        ref={restoreInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void restore(file);
          e.target.value = "";
        }}
      />
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => location.reload()}>다시 시도</button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {frame.nearby
          ? `${activeNearby?.npc ?? nearbyDiscovery?.title ?? "안내자"} 가까이에 있습니다. E를 눌러 대화하세요.`
          : ""}
      </span>
    </main>
  );
}
