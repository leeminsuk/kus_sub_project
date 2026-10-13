"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal-screen">
      <h1>잠시 캠퍼스와 연결이 끊겼어요.</h1>
      <p>다시 시도해 주세요. 저장된 탐험 기록은 유지됩니다.</p>
      <button onClick={reset}>다시 연결하기</button>
    </main>
  );
}
