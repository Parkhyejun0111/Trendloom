"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useObject } from "@ai-sdk/react";
import { STYLE_MOODS, type StyleImage } from "@/lib/naver";
import { styleBoardSchema } from "@/lib/schemas";
import { Card, Field, Pill, PrimaryButton, Skeleton } from "./ui";

type BoardResult = {
  source: "naver" | "demo";
  notes: string[];
  keywords: string[];
  mood: string;
  images: StyleImage[];
};

/** 보드 카드 하나를 가리키는 안정적인 키 (핀 선택 상태 유지용) */
const idOf = (im: StyleImage, i: number) => im.thumbnail || `${im.query}-${i}`;

/**
 * 격자에 실을 이미지 주소.
 *
 * 기본은 썸네일(a340 · 340×510 · 15~43KB). 고화질 모드에서는 원본을 쓰는데,
 * 원본은 600×800~1000×1000 이지만 장당 200~800KB 라 36장이면 수십 MB 다.
 * 그래서 기본값이 아니라 사용자가 켤 때만 쓴다.
 *
 * http 원본은 https 페이지에서 혼합 콘텐츠로 차단되니 아예 시도하지 않는다.
 */
function srcFor(im: StyleImage, hiRes: boolean, degraded: boolean) {
  if (!hiRes || degraded) return im.thumbnail;
  return im.link?.startsWith("https://") ? im.link : im.thumbnail;
}

/** MD 실행 포인트를 문장 단위로 쪼개서 번호 붙은 리스트로 보여주기 위한 헬퍼 */
function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 흰 카드 제목에 연핑크 색연필 밑줄 포인트를 준다 (Card 의 title prop 대신 직접 렌더링) */
function AccentTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="relative inline-block pb-1.5 text-sm font-semibold tracking-tight text-paper">
        {children}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[5px] -rotate-1 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--color-trend-pink) 14%, var(--color-trend-pink) 86%, transparent 100%)",
          }}
        />
      </h3>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function StyleBoard() {
  const [input, setInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["오버핏 코트", "와이드 데님"]);
  const [moodInput, setMoodInput] = useState<string>(STYLE_MOODS[0].suffix);
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  /** 원본 로딩 실패 시 썸네일로 되돌린 카드 */
  const [fellBack, setFellBack] = useState<Set<string>>(new Set());
  const [hiRes, setHiRes] = useState(false);
  const [stylingOpen, setStylingOpen] = useState(false);

  const {
    object: brief,
    submit,
    isLoading: thinking,
    error: aiError,
  } = useObject({ api: "/api/moodboard", schema: styleBoardSchema });

  const visible = useMemo(
    () => (board?.images ?? []).filter((im, i) => !broken.has(idOf(im, i))),
    [board, broken],
  );

  const pinnedImages = useMemo(
    () => (board?.images ?? []).filter((im, i) => pinned.has(idOf(im, i))),
    [board, pinned],
  );

  const addKeyword = (raw: string) => {
    const k = raw.trim();
    if (!k || keywords.includes(k) || keywords.length >= 4) return;
    setKeywords([...keywords, k]);
    setInput("");
  };

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1400);
  }

  async function buildBoard() {
    if (!keywords.length) return;
    setLoading(true);
    setErr(null);
    setBoard(null);
    setPinned(new Set());
    setBroken(new Set());
    try {
      const res = await fetch("/api/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, mood: moodInput, perKeyword: 40 }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setBoard((await res.json()) as BoardResult);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /** 핀이 있으면 핀만, 없으면 보드 전체를 AI 에 넘긴다 */
  function readBoard() {
    if (!board) return;
    const source = pinnedImages.length ? pinnedImages : visible;
    submit({
      keywords: board.keywords,
      mood: board.mood || "지정 안 함",
      titles: source.slice(0, 60).map((im) => im.title),
      source: board.source,
    });
  }

  return (
    <div className="space-y-6">
      {/* ── 입력 ───────────────────────────────────────────── */}
      <Card className="card-glass glass-bead-soft-static">
        <div className="grid gap-5 @lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <Field label="어떤 스타일을 찾으세요?">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-2 bg-ink p-2 backdrop-blur-sm">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="flex items-center gap-1.5 rounded-md bg-ink-2 py-1 pl-2.5 pr-1 text-sm"
                  >
                    {k}
                    <button
                      onClick={() => setKeywords(keywords.filter((x) => x !== k))}
                      className="ml-0.5 rounded px-1 text-muted hover:text-accent-2"
                      aria-label={`${k} 삭제`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword(input);
                    }
                    if (e.key === "Backspace" && !input) setKeywords(keywords.slice(0, -1));
                  }}
                  placeholder={keywords.length >= 4 ? "최대 4개" : "예: 오버핏 코트 (Enter로 추가)"}
                  disabled={keywords.length >= 4}
                  className="min-w-[140px] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted"
                />
              </div>
            </Field>
          </div>

          <Field label="무드">
            <div className="flex flex-wrap gap-2">
              {STYLE_MOODS.map((m) => {
                const active = moodInput === m.suffix;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMoodInput(m.suffix)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "glass-bead-soft-static bg-trend-pink text-trend-navy"
                        : "border border-trend-pink/50 bg-trend-pink/15 text-trend-navy/55 hover:bg-trend-pink/25"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <input
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="직접 입력도 가능 (예: 골프웨어 화보)"
              className="mt-2 w-full rounded-lg border border-line-2 bg-ink px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent/50"
            />
            <p className="mt-2 text-xs leading-relaxed text-muted">고르거나 직접 적으면 검색어 뒤에 붙어 결과가 그 느낌으로 좁혀져요</p>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <PrimaryButton onClick={buildBoard} disabled={loading || !keywords.length}>
            {loading ? "레퍼런스 수집 중…" : "스타일 보드 만들기"}
          </PrimaryButton>
          {board && (
            <button
              onClick={readBoard}
              disabled={thinking || !visible.length}
              className="rounded-xl border border-accent/50 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {thinking
                ? "무드 읽는 중…"
                : pinnedImages.length
                  ? `핀 ${pinnedImages.length}장으로 무드 브리프`
                  : `보드 전체(${visible.length}장)로 무드 브리프`}
            </button>
          )}
          {!!pinnedImages.length && (
            <span className="text-xs text-muted">핀한 컷만 분석에 넘어갑니다</span>
          )}
        </div>

        {err && (
          <p className="mt-3 rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-2 text-xs text-accent-2">
            {err}
          </p>
        )}
      </Card>

      {/* ── AI 무드 브리프 — 스타일 보드 만들기 버튼 바로 아래, 사진 위에 노트처럼 뜬다.
          이 구역만 네이비 배경으로 구분해서 "여기부터는 AI가 정리한 결과"임을 확실히 보여준다 ── */}
      {(thinking || brief) && (
        <div className="fade-up space-y-6 rounded-[26px] bg-trend-navy p-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-white">시즌 무드 브리프</h2>
            {thinking && <Pill tone="accent">생성 중…</Pill>}
            {!!pinnedImages.length && <Pill tone="accent">핀 {pinnedImages.length}장 기준</Pill>}
          </div>

          <Card>
            {brief?.headline ? (
              <p className="text-xl font-medium leading-snug tracking-tight">
                {brief.headline}
              </p>
            ) : (
              <Skeleton lines={2} />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {(brief?.moodKeywords ?? []).map((k, i) => (
                <Pill key={i} tone="accent">
                  {k}
                </Pill>
              ))}
            </div>
          </Card>

          <Card>
            <AccentTitle hint="탭하면 헥스가 복사됩니다 · 원단 발주 시 참고">시즌 컬러 팔레트</AccentTitle>
            {brief?.palette?.length ? (
              <div className="grid grid-cols-3 gap-3">
                {brief.palette.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => c?.hex && copyHex(c.hex)}
                    className="group overflow-hidden rounded-xl border border-line text-left transition hover:border-line-2"
                  >
                    <span
                      className="relative block aspect-square w-full"
                      style={{ background: c?.hex ?? "#eee" }}
                    >
                      {c?.role && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/25 px-1.5 py-0.5 text-[8.5px] font-bold text-white backdrop-blur-sm">
                          {c.role}
                        </span>
                      )}
                      {copied === c?.hex && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[11px] font-bold text-white">
                          복사됨
                        </span>
                      )}
                    </span>
                    <span className="block bg-ink px-2 py-1.5">
                      <span className="block truncate text-[11px] font-semibold text-paper">{c?.name}</span>
                      <span className="block font-mono text-[10px] text-muted">{c?.hex}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Skeleton lines={3} />
            )}
          </Card>

          <div className="grid gap-4 @lg:grid-cols-3">
            <Card>
              <AccentTitle>핵심 실루엣</AccentTitle>
              <TagList items={brief?.silhouettes} />
            </Card>
            <Card>
              <AccentTitle>핵심 소재</AccentTitle>
              <TagList items={brief?.materials} />
            </Card>
            <Card>
              <AccentTitle>디테일 포인트</AccentTitle>
              <TagList items={brief?.details} />
            </Card>
          </div>

          <Card>
            <button
              type="button"
              onClick={() => setStylingOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold tracking-tight text-paper">스타일링 조합</span>
                <span className="mt-1 block text-xs text-muted">바로 판매 가능한 아이템 구성으로 제안</span>
              </span>
              <span className="shrink-0 text-muted">{stylingOpen ? "▴ 접기" : "▾ 펼치기"}</span>
            </button>

            {stylingOpen && (
              <div className="mt-4 grid gap-4 border-t border-line pt-4 @md:grid-cols-3">
                {(brief?.styling ?? []).map((s, i) => (
                  <article key={i} className="rounded-lg border border-line bg-ink p-4">
                    <h4 className="text-sm font-semibold leading-snug">{s?.title}</h4>
                    <ul className="mt-3 space-y-1.5">
                      {(s?.items ?? []).map((it, j) => (
                        <li key={j} className="flex gap-2 text-sm text-paper/85">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                          {it}
                        </li>
                      ))}
                    </ul>
                    {s?.occasion && (
                      <p className="mt-3 text-xs text-muted">{s.occasion}</p>
                    )}
                  </article>
                ))}
                {!brief?.styling?.length && (
                  <>
                    <Skeleton lines={4} />
                    <Skeleton lines={4} />
                    <Skeleton lines={4} />
                  </>
                )}
              </div>
            )}
          </Card>

          {brief?.mdNote && (
            <Card className="trend-pink glass-bead-soft-static">
              <h3 className="text-sm font-extrabold tracking-tight text-trend-navy">MD 실행 포인트</h3>
              <ul className="mt-3 space-y-2.5">
                {splitSentences(brief.mdNote).map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-trend-navy/90">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-trend-navy text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!!brief?.searchExpansion?.length && (
            <Card
              title="확장 검색 키워드"
              hint="탭하면 키워드에 담깁니다 · 이 방향을 더 파고들 때"
            >
              <div className="flex flex-wrap gap-2">
                {brief.searchExpansion.map((k, i) =>
                  k ? (
                    <button
                      key={i}
                      onClick={() => addKeyword(k)}
                      disabled={keywords.includes(k) || keywords.length >= 4}
                      className="rounded-md border border-line-2 px-2.5 py-1 text-xs text-paper/70 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {k}
                    </button>
                  ) : null,
                )}
              </div>
            </Card>
          )}

          {aiError && (
            <p className="rounded-lg border border-accent-2/40 bg-accent-2/10 px-4 py-3 text-sm text-accent-2">
              AI 호출 실패: {aiError.message}
            </p>
          )}
        </div>
      )}

      {/* brief 가 한 번도 안 잡히고 바로 실패한 경우 — 위 네이비 박스 자체가 안 뜨므로 별도로 보여준다 */}
      {aiError && !thinking && !brief && (
        <p className="rounded-lg border border-accent-2/40 bg-accent-2/10 px-4 py-3 text-sm text-accent-2">
          AI 호출 실패: {aiError.message}
        </p>
      )}

      {/* ── 출처 배너 ──────────────────────────────────────── */}
      {board && (
        <div className="fade-up flex flex-wrap items-center gap-3 rounded-lg border border-line bg-ink-2/40 px-4 py-3">
          <Pill tone={board.source === "naver" ? "accent" : "warn"}>
            {board.source === "naver" ? "네이버 이미지 검색 실데이터" : "데모 모드"}
          </Pill>
          <span className="text-xs text-muted">
            {board.source === "naver"
              ? `${board.keywords.join(" · ")}${board.mood ? ` · ${board.mood}` : ""} · ${visible.length}장`
              : "실제 사진 대신 자리표시 카드입니다. 환경 변수 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 를 설정하면 실제 레퍼런스로 전환됩니다"}
          </span>
          {board.notes.map((n) => (
            <span key={n} className="text-xs text-accent-2">
              {n}
            </span>
          ))}

          {board.source === "naver" && (
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={hiRes}
                onChange={(e) => {
                  setHiRes(e.target.checked);
                  setFellBack(new Set());
                }}
                className="size-3.5 accent-[#4fa3e3]"
              />
              고화질로 보기
              <span className="text-[11px] text-muted/70">
                (원본 · 장당 200~800KB)
              </span>
            </label>
          )}
        </div>
      )}

      {/* ── 매스너리 보드 ──────────────────────────────────── */}
      {loading && (
        <div className="masonry">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="shimmer rounded-xl border border-line bg-ink-2"
              style={{ height: 180 + ((i * 47) % 160) }}
            />
          ))}
        </div>
      )}

      {board && !loading && (
        <div className="masonry fade-up">
          {board.images.map((im, i) => {
            const id = idOf(im, i);
            if (broken.has(id)) return null;
            const isPinned = pinned.has(id);
            const ratio = im.width && im.height ? im.width / im.height : 3 / 4;

            return (
              <figure
                key={id}
                className={`group relative overflow-hidden rounded-xl border transition ${
                  isPinned
                    ? "border-accent ring-glow"
                    : "border-line hover:border-line-2"
                }`}
              >
                {/* 사진을 누르면 핀이 찍힌다 — 원본 보기는 별도의 작은 링크 아이콘으로 분리 */}
                <button
                  type="button"
                  onClick={() => togglePin(id)}
                  aria-pressed={isPinned}
                  aria-label={isPinned ? "핀 해제" : "핀 하기"}
                  className="block w-full text-left"
                >
                  {im.placeholder || !im.thumbnail ? (
                    <div
                      className="flex items-end bg-gradient-to-br from-ink-3 to-ink-2 p-3"
                      style={{ aspectRatio: String(ratio) }}
                    >
                      <span className="text-xs leading-snug text-muted">{im.title}</span>
                    </div>
                  ) : (
                    <Image
                      src={srcFor(im, hiRes, fellBack.has(id))}
                      alt={im.title}
                      width={im.width || 600}
                      height={im.height || 800}
                      unoptimized
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        // 원본이 막히면(핫링크 차단 등) 썸네일로 한 번 물러서고,
                        // 썸네일까지 실패하면 그때 카드를 뺀다
                        if (srcFor(im, hiRes, fellBack.has(id)) !== im.thumbnail) {
                          setFellBack((prev) => new Set(prev).add(id));
                        } else {
                          setBroken((prev) => new Set(prev).add(id));
                        }
                      }}
                      className="w-full bg-ink-2 object-cover transition duration-300 group-hover:scale-[1.03]"
                      style={{ aspectRatio: String(ratio) }}
                    />
                  )}
                </button>

                {/* 하단 그라디언트 캡션 — 호버 시에만 */}
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8 opacity-0 transition group-hover:opacity-100">
                  <p className="line-clamp-2 text-[11px] leading-snug text-paper/90">
                    {im.title}
                  </p>
                  <p className="mt-1 text-[10px] text-accent-soft">{im.query}</p>
                </figcaption>

                {isPinned && (
                  <span className="pointer-events-none absolute right-2 top-2 rounded-full border border-accent bg-accent px-2.5 py-1 text-[11px] font-semibold text-ink">
                    핀됨
                  </span>
                )}

                {!im.placeholder && im.thumbnail && (
                  <a
                    href={im.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="원본 이미지 새 탭에서 보기"
                    className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full border border-line-2 bg-ink/70 text-xs text-paper/80 backdrop-blur transition hover:border-accent hover:text-accent"
                  >
                    ↗
                  </a>
                )}
              </figure>
            );
          })}
        </div>
      )}

    </div>
  );
}

function TagList({ items }: { items?: (string | undefined)[] }) {
  if (!items?.length) return <Skeleton lines={3} />;
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-paper/85">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
          {it}
        </li>
      ))}
    </ul>
  );
}
