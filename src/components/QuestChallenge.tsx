"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Droplets,
  Leaf,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import {
  BIO_WATER,
  CIPHER_PUZZLE,
  DNA_PUZZLE,
  HABITAT_PUZZLE,
  NETWORK_PUZZLE,
  PHISHING_MESSAGES,
  type Quest,
} from "@/game/content";

type QuestChallengeProps = {
  quest: Quest;
  onComplete: (score: number) => void;
};
type PuzzleProps = {
  onSolve: (score?: number) => void;
  onFail: (message: string) => void;
};

const EXPLANATIONS = {
  water: BIO_WATER.explanation,
  seed: DNA_PUZZLE.explanation,
  habitat: HABITAT_PUZZLE.explanation,
  phishing:
    "문자 속 발신자 이름만으로는 진위를 알 수 없어요. 비밀번호·민감한 정보·급한 송금을 요구하면 멈추고, 평소 이용하는 공식 사이트나 담당 부서에서 직접 확인하세요.",
  network: NETWORK_PUZZLE.explanation,
  cipher: CIPHER_PUZZLE.explanation,
};

export default function QuestChallenge(props: QuestChallengeProps) {
  return <ChallengeSession key={props.quest.id} {...props} />;
}

function ChallengeSession({ quest, onComplete }: QuestChallengeProps) {
  const [failures, setFailures] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  const fail = (message: string) => {
    setFailures((value) => value + 1);
    setFeedback(message);
  };
  const solve = (override?: number) => {
    setFeedback("");
    setScore(override ?? Math.max(60, 100 - failures * 10));
  };
  const returnToWorld = () => {
    if (score === null || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onComplete(score);
  };

  if (score !== null) {
    return (
      <div className={`challenge-body challenge-success ${quest.department}`}>
        <div className="success-symbol" aria-hidden="true">
          <Sparkles size={36} />
        </div>
        <p className="eyebrow">SIGNAL RESTORED</p>
        <h3>신호를 되찾았어요!</h3>
        <p>{quest.success}</p>
        <div className="challenge-reward">
          <span>{quest.reward}</span>
          <strong>
            {score}
            <small> / 100</small>
          </strong>
        </div>
        <div className="challenge-feedback" role="status">
          <Check size={18} aria-hidden="true" />
          <p>{EXPLANATIONS[quest.id]}</p>
        </div>
        <div className="challenge-actions">
          <button
            type="button"
            className="primary-button"
            onClick={returnToWorld}
            disabled={submitted}
          >
            신호를 가지고 돌아가기 <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`challenge-body ${quest.department}`}>
      <div className="challenge-intro">
        <p>{quest.brief}</p>
      </div>
      <div className="challenge-tools">
        <span className="eyebrow">
          {quest.department === "bio"
            ? "LIFE SCIENCE LAB"
            : "CYBER SECURITY LAB"}
        </span>
        <button
          type="button"
          className="hint-button"
          aria-expanded={hintVisible}
          onClick={() => setHintVisible((shown) => !shown)}
        >
          <CircleHelp size={15} aria-hidden="true" />{" "}
          {hintVisible ? "힌트 접기" : "힌트 보기"}
        </button>
      </div>
      {hintVisible && (
        <div className="challenge-feedback hint-feedback">
          <p>{quest.hint}</p>
        </div>
      )}
      {quest.id === "water" && <WaterChallenge onSolve={solve} onFail={fail} />}
      {quest.id === "seed" && <SeedChallenge onSolve={solve} onFail={fail} />}
      {quest.id === "habitat" && (
        <HabitatChallenge onSolve={solve} onFail={fail} />
      )}
      {quest.id === "phishing" && <PhishingChallenge onSolve={solve} />}
      {quest.id === "network" && (
        <NetworkChallenge onSolve={solve} onFail={fail} />
      )}
      {quest.id === "cipher" && (
        <CipherChallenge onSolve={solve} onFail={fail} />
      )}
      {feedback && (
        <div className="challenge-feedback error-feedback" role="alert">
          <CircleHelp size={18} aria-hidden="true" />
          <p>{feedback} 다시 시도할 수 있어요.</p>
        </div>
      )}
    </div>
  );
}

function WaterChallenge({ onSolve, onFail }: PuzzleProps) {
  const [values, setValues] = useState<number[]>(
    BIO_WATER.parameters.map((parameter) => parameter.initial),
  );
  const inRange = BIO_WATER.parameters.map(
    (parameter, index) =>
      values[index] >= parameter.targetMin &&
      values[index] <= parameter.targetMax,
  );
  const check = () => {
    const outside = BIO_WATER.parameters.filter((_, index) => !inRange[index]);
    if (outside.length)
      onFail(
        `${outside.map((parameter) => parameter.label).join(", ")} 수치가 목표 범위 밖에 있어요.`,
      );
    else onSolve();
  };
  return (
    <>
      <div className="water-status">
        <Droplets size={30} aria-hidden="true" />
        <div>
          <strong>
            {inRange.every(Boolean)
              ? "균형 잡힌 실험 환경"
              : "연못의 균형을 맞춰 주세요"}
          </strong>
          <p>{inRange.filter(Boolean).length} / 3 조건 충족</p>
        </div>
      </div>
      <div className="water-controls">
        {BIO_WATER.parameters.map((parameter, index) => (
          <div
            className={`parameter ${inRange[index] ? "in-range" : ""}`}
            key={parameter.id}
          >
            <div className="parameter-heading">
              <label htmlFor={`water-${parameter.id}`}>{parameter.label}</label>
              <output htmlFor={`water-${parameter.id}`}>
                {Number(values[index].toFixed(1))}
                <small> {parameter.unit}</small>
              </output>
            </div>
            <input
              id={`water-${parameter.id}`}
              type="range"
              min={parameter.min}
              max={parameter.max}
              step={parameter.step}
              value={values[index]}
              aria-describedby={`water-target-${parameter.id}`}
              onChange={(event) =>
                setValues((current) =>
                  current.map((value, valueIndex) =>
                    valueIndex === index ? Number(event.target.value) : value,
                  ),
                )
              }
            />
            <div className="parameter-scale">
              <span>{parameter.min}</span>
              <span id={`water-target-${parameter.id}`}>
                목표 {parameter.targetMin}–{parameter.targetMax}{" "}
                {parameter.unit} {inRange[index] ? "✓" : ""}
              </span>
              <span>{parameter.max}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="challenge-actions">
        <button type="button" className="primary-button" onClick={check}>
          <Droplets size={17} aria-hidden="true" /> 환경 균형 확인
        </button>
      </div>
    </>
  );
}

function SeedChallenge({ onSolve, onFail }: PuzzleProps) {
  const [bases, setBases] = useState<string[]>(
    Array.from({ length: DNA_PUZZLE.template.length }, () => ""),
  );
  const cycle = (index: number) => {
    setBases((current) =>
      current.map((base, baseIndex) =>
        baseIndex !== index
          ? base
          : DNA_PUZZLE.bases[
              (DNA_PUZZLE.bases.indexOf(
                base as (typeof DNA_PUZZLE.bases)[number],
              ) +
                1) %
                DNA_PUZZLE.bases.length
            ],
      ),
    );
  };
  const check = () => {
    if (bases.some((base) => !base))
      onFail("아직 비어 있는 염기 자리가 있어요. 여섯 칸을 모두 채워 주세요.");
    else if (bases.join("") !== DNA_PUZZLE.target)
      onFail(
        `마주 보는 짝이 맞지 않는 자리가 ${bases.filter((base, index) => base !== DNA_PUZZLE.target[index]).length}곳 있어요. A–T, C–G 규칙을 확인하세요.`,
      );
    else onSolve();
  };
  return (
    <>
      <div className="dna-puzzle">
        <p className="eyebrow">씨앗 표본 · DNA-06</p>
        <div
          className="dna-row template-row"
          aria-label={`원본 DNA 가닥 ${DNA_PUZZLE.template}`}
        >
          {Array.from(DNA_PUZZLE.template).map((base, index) => (
            <span className={`base-cell base-${base}`} key={index}>
              {base}
            </span>
          ))}
        </div>
        <div className="dna-bonds" aria-hidden="true">
          {bases.map((_, index) => (
            <span key={index}>⋮</span>
          ))}
        </div>
        <div className="dna-row">
          {bases.map((base, index) => (
            <button
              type="button"
              className={`base-cell ${base ? `base-${base}` : "base-empty"}`}
              key={index}
              aria-label={`${index + 1}번 염기: ${base || "빈칸"}, 눌러서 변경`}
              onClick={() => cycle(index)}
            >
              {base || "+"}
            </button>
          ))}
        </div>
        <p className="puzzle-caption">
          아래 칸을 누를 때마다 A → T → C → G로 바뀝니다.
        </p>
        <div className="base-pairs">
          <span>
            A <span aria-hidden="true">↔</span> T
          </span>
          <span>
            C <span aria-hidden="true">↔</span> G
          </span>
        </div>
      </div>
      <div className="challenge-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setBases(
              Array.from({ length: DNA_PUZZLE.template.length }, () => ""),
            )
          }
        >
          <RotateCcw size={15} aria-hidden="true" /> 초기화
        </button>
        <button type="button" className="primary-button" onClick={check}>
          <Sprout size={17} aria-hidden="true" /> DNA 기록 복원
        </button>
      </div>
    </>
  );
}

function HabitatChallenge({ onSolve, onFail }: PuzzleProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const check = () => {
    if (selected.length !== HABITAT_PUZZLE.requiredIds.length)
      onFail("정원에 필요한 세 가지 역할을 하나씩, 정확히 3개 골라 주세요.");
    else if (!HABITAT_PUZZLE.requiredIds.every((id) => selected.includes(id)))
      onFail(
        "아직 생태계의 역할 하나가 빠져 있어요. 꽃을 만들고, 꽃가루를 옮기고, 낙엽의 분해를 돕는 생물을 찾아보세요.",
      );
    else onSolve();
  };
  return (
    <>
      <div className="selection-count">
        <span>정원을 함께 만들 구성원</span>
        <strong>{selected.length} / 3</strong>
      </div>
      <div className="species-grid">
        {HABITAT_PUZZLE.species.map((species) => (
          <button
            type="button"
            className={`species-card ${selected.includes(species.id) ? "selected" : ""}`}
            key={species.id}
            aria-pressed={selected.includes(species.id)}
            onClick={() => toggle(species.id)}
          >
            <span className="species-icon" aria-hidden="true">
              {species.icon}
            </span>
            <strong>{species.name}</strong>
            <span className="species-role">{species.role}</span>
            <span>{species.description}</span>
            {selected.includes(species.id) && (
              <Check className="selection-check" size={18} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <div className="challenge-actions">
        <button type="button" className="primary-button" onClick={check}>
          <Leaf size={17} aria-hidden="true" /> 생태 정원 완성
        </button>
      </div>
    </>
  );
}

function PhishingChallenge({ onSolve }: Pick<PuzzleProps, "onSolve">) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const answeredRef = useRef(false);
  const message = PHISHING_MESSAGES[index];
  const answeredCorrectly = answer === message.isPhishing;
  const choose = (isPhishing: boolean) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswer(isPhishing);
    if (isPhishing === message.isPhishing) setCorrect((value) => value + 1);
  };
  const next = () => {
    if (answer === null) return;
    if (index === PHISHING_MESSAGES.length - 1)
      onSolve(Math.round((correct / PHISHING_MESSAGES.length) * 100));
    else {
      setIndex((value) => value + 1);
      setAnswer(null);
      answeredRef.current = false;
    }
  };
  return (
    <>
      <div className="message-progress">
        <span>
          받은 메시지 {index + 1} / {PHISHING_MESSAGES.length}
        </span>
        <span>올바른 판단 {correct}개</span>
      </div>
      <article className="message-card">
        <div className="message-sender">
          <ShieldCheck size={18} aria-hidden="true" />
          <strong>{message.sender}</strong>
          <span>방금</span>
        </div>
        <p>{message.body}</p>
        <span className="message-note">
          교육용 가상 메시지 · 링크는 작동하지 않습니다
        </span>
      </article>
      {answer === null ? (
        <div className="challenge-actions classify-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => choose(false)}
          >
            직접 확인 안내
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => choose(true)}
          >
            의심 메시지
          </button>
        </div>
      ) : (
        <>
          <div
            className={`challenge-feedback ${answeredCorrectly ? "correct-feedback" : "error-feedback"}`}
            role="status"
          >
            <p>
              <strong>
                {answeredCorrectly
                  ? "정확하게 판단했어요."
                  : "단서를 다시 살펴볼까요?"}
              </strong>{" "}
              {message.isPhishing
                ? "이 메시지에는 의심스러운 요청이 있어요."
                : "비밀 정보나 돈을 요구하지 않고 별도의 확인 경로를 안내하고 있어요."}
            </p>
          </div>
          <div className="message-clues">
            {message.clues.map((clue) => (
              <div className="message-clue" key={clue.id}>
                <span
                  className={`clue-label ${clue.suspicious ? "suspicious" : ""}`}
                >
                  {clue.text}
                </span>
                <p>{clue.explanation}</p>
              </div>
            ))}
          </div>
          <div className="challenge-actions">
            <button type="button" className="primary-button" onClick={next}>
              {index === PHISHING_MESSAGES.length - 1
                ? "판별 기록 완성"
                : "다음 메시지"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </>
  );
}

function NetworkChallenge({ onSolve, onFail }: PuzzleProps) {
  const [path, setPath] = useState<string[]>([]);
  const select = (id: string) =>
    setPath((current) =>
      current.length >= NETWORK_PUZZLE.correctPath.length ||
      current.includes(id)
        ? current
        : [...current, id],
    );
  const check = () => {
    if (path.length !== NETWORK_PUZZLE.correctPath.length)
      onFail("출발지부터 도착지까지 4개의 노드를 차례로 선택해 주세요.");
    else if (path.join(",") !== NETWORK_PUZZLE.correctPath.join(","))
      onFail(
        "신호 경로를 다시 살펴보세요. 단말에서 출발해 접근 규칙과 사용자 권한을 확인한 다음 축제 서버로 연결해야 해요.",
      );
    else onSolve();
  };
  return (
    <>
      <p className="puzzle-caption">
        노드를 연결할 순서대로 누르세요. 총 4단계입니다.
      </p>
      <div className="network-grid">
        {NETWORK_PUZZLE.nodes.map((node) => (
          <button
            type="button"
            className={`network-node ${path.includes(node.id) ? "selected" : ""}`}
            key={node.id}
            aria-pressed={path.includes(node.id)}
            disabled={
              path.includes(node.id) ||
              path.length >= NETWORK_PUZZLE.correctPath.length
            }
            onClick={() => select(node.id)}
          >
            <span className="network-step">
              {path.includes(node.id) ? (
                path.indexOf(node.id) + 1
              ) : (
                <span aria-hidden="true">○</span>
              )}
            </span>
            <strong>{node.label}</strong>
            <span>{node.description}</span>
          </button>
        ))}
      </div>
      <div className="network-path" aria-live="polite">
        {path.length ? (
          path.map((id, index) => (
            <span key={id}>
              {index > 0 && <ArrowRight size={13} aria-hidden="true" />}
              {NETWORK_PUZZLE.nodes.find((node) => node.id === id)?.label}
            </span>
          ))
        ) : (
          <span>첫 번째 노드를 선택해 연결을 시작하세요.</span>
        )}
      </div>
      <div className="challenge-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setPath([])}
          disabled={!path.length}
        >
          <RotateCcw size={15} aria-hidden="true" /> 경로 초기화
        </button>
        <button type="button" className="primary-button" onClick={check}>
          <ShieldCheck size={17} aria-hidden="true" /> 연결 확인
        </button>
      </div>
    </>
  );
}

function CipherChallenge({ onSolve, onFail }: PuzzleProps) {
  const [answer, setAnswer] = useState("");
  const check = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (answer.trim().toUpperCase() !== CIPHER_PUZZLE.answer)
      onFail(
        "아직 보관함이 열리지 않아요. 각 글자를 알파벳 세 칸 앞쪽으로 되돌려 보세요. F는 C가 됩니다.",
      );
    else onSolve();
  };
  return (
    <form onSubmit={check}>
      <div className="cipher-display">
        <LockKeyhole size={24} aria-hidden="true" />
        <p className="eyebrow">ARCHIVE · 121</p>
        <div
          className="cipher-letters"
          aria-label={`암호 ${CIPHER_PUZZLE.encoded}`}
        >
          {Array.from(CIPHER_PUZZLE.encoded).map((letter, index) => (
            <span key={index}>{letter}</span>
          ))}
        </div>
        <p>암호화 규칙: 알파벳을 오른쪽으로 {CIPHER_PUZZLE.shift}칸</p>
      </div>
      <div className="cipher-reference">
        <span>원문</span>
        <code>{CIPHER_PUZZLE.alphabet}</code>
        <span>암호</span>
        <code>
          {CIPHER_PUZZLE.alphabet.slice(CIPHER_PUZZLE.shift) +
            CIPHER_PUZZLE.alphabet.slice(0, CIPHER_PUZZLE.shift)}
        </code>
      </div>
      <label className="cipher-label" htmlFor="archive-answer">
        복원한 여섯 글자 단어
      </label>
      <input
        id="archive-answer"
        className="cipher-input"
        value={answer}
        onChange={(event) =>
          setAnswer(
            event.target.value
              .toUpperCase()
              .replace(/[^A-Z]/g, "")
              .slice(0, CIPHER_PUZZLE.answer.length),
          )
        }
        placeholder="예: ABCDEF"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={CIPHER_PUZZLE.answer.length}
        aria-describedby="cipher-input-help"
      />
      <p id="cipher-input-help" className="puzzle-caption">
        영문 알파벳 6글자 · 소문자로 입력해도 괜찮아요.
      </p>
      <div className="challenge-actions">
        <button type="submit" className="primary-button">
          <LockKeyhole size={17} aria-hidden="true" /> 기록 보관함 열기
        </button>
      </div>
    </form>
  );
}
