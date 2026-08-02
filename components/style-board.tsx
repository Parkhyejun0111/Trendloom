"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useObject } from "@ai-sdk/react";
import { STYLE_MOODS, type StyleImage, type StyleMood } from "@/lib/naver";
import { styleBoardSchema } from "@/lib/schemas";
import { CatSays } from "./brand";
import { Card, Field, Pill, PrimaryButton, Skeleton, Toggle } from "./ui";

type BoardResult = {
  source: "naver" | "demo";
  notes: string[];
  keywords: string[];
  mood: StyleMood;
  images: StyleImage[];
};

const PRESETS = [
  { label: "미니멀 아우터", kws: ["오버핏 코트", "숏 패딩"] },
  { label: "데님 무드", kws: ["와이드 데님", "데님 자켓"] },
  { label: "레이어드 니트", kws: ["케이블 니트", "니트 베스트"] },
];

/** 보드 카드 하나를 가리키는 안정적인 키 (핀 선택 상태 유지용) */
const idOf = (im: StyleImage, i: number) => im.thumbnail || `${im.query}-${i}`;

export function StyleBoard() {
  const [input, setInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["오버핏 코트", "와이드 데님"]);
  const [mood, setMood] = useState<StyleMood>("street");
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

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
        body: JSON.stringify({ keywords, mood, perKeyword: 40 }),
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
      mood: STYLE_MOODS.find((m) => m.id === board.mood)?.label ?? board.mood,
      titles: source.slice(0, 60).map((im) => im.title),
      source: board.source,
    });
  }

  return (
    <div className="space-y-6">
      {/* ── 입력 ───────────────────────────────────────────── */}
      <Card
        title="어떤 무드를 찾고 계세요?"
        hint="키워드 최대 4개 · 네이버 이미지 검색으로 레퍼런스를 모으고, 마음에 드는 컷을 핀하면 AI가 무드 브리프로 정리합니다"
      >
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <Field label="키워드">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-2 bg-ink p-2">
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
                  placeholder={keywords.length >= 4 ? "최대 4개" : "키워드 입력 후 Enter"}
                  disabled={keywords.length >= 4}
                  className="min-w-[140px] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted"
                />
              </div>
            </Field>

            <div className="flex flex-wrap gap-2">
              <span className="self-center text-[11px] uppercase tracking-wider text-muted">
                프리셋
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setKeywords(p.kws)}
                  className="rounded-md border border-line-2 px-2.5 py-1 text-xs text-paper/70 transition hover:border-accent hover:text-accent"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="무드 프리셋">
            <div className="flex flex-wrap gap-2">
              {STYLE_MOODS.map((m) => (
                <Toggle key={m.id} active={mood === m.id} onClick={() => setMood(m.id)}>
                  {m.label}
                </Toggle>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              선택한 무드는 검색어 뒤에 붙어 레퍼런스 성격을 바꿉니다.
              {STYLE_MOODS.find((m) => m.id === mood)?.suffix ? (
                <>
                  {" "}
                  현재:{" "}
                  <span className="text-paper/70">
                    {keywords[0] ?? "키워드"}{" "}
                    {STYLE_MOODS.find((m) => m.id === mood)?.suffix}
                  </span>
                </>
              ) : (
                " 현재: 입력한 키워드 그대로 검색합니다."
              )}
            </p>
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
          <span className="text-xs text-muted">
            {pinnedImages.length
              ? "핀한 컷만 분석에 넘어갑니다"
              : "카드 위 핀 버튼으로 원하는 컷만 골라낼 수 있어요"}
          </span>
        </div>

        {err && (
          <p className="mt-3 rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-2 text-xs text-accent-2">
            {err}
          </p>
        )}
      </Card>

      {/* ── 출처 배너 ──────────────────────────────────────── */}
      {board && (
        <div className="fade-up flex flex-wrap items-center gap-3 rounded-lg border border-line bg-ink-2/40 px-4 py-3">
          <Pill tone={board.source === "naver" ? "accent" : "warn"}>
            {board.source === "naver" ? "네이버 이미지 검색 실데이터" : "데모 모드"}
          </Pill>
          <span className="text-xs text-muted">
            {board.source === "naver"
              ? `${board.keywords.join(" · ")} · ${
                  STYLE_MOODS.find((m) => m.id === board.mood)?.label
                } · ${visible.length}장`
              : "실제 사진 대신 자리표시 카드입니다. NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 를 .env.local 에 넣으면 실제 레퍼런스로 전환됩니다"}
          </span>
          {board.notes.map((n) => (
            <span key={n} className="text-xs text-accent-2">
              {n}
            </span>
          ))}
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
                {im.placeholder || !im.thumbnail ? (
                  <div
                    className="flex items-end bg-gradient-to-br from-ink-3 to-ink-2 p-3"
                    style={{ aspectRatio: String(ratio) }}
                  >
                    <span className="text-xs leading-snug text-muted">{im.title}</span>
                  </div>
                ) : (
                  <a
                    href={im.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block"
                  >
                    <Image
                      src={im.thumbnail}
                      alt={im.title}
                      width={im.width || 600}
                      height={im.height || 800}
                      unoptimized
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setBroken((prev) => new Set(prev).add(id))}
                      className="w-full bg-ink-2 object-cover transition duration-300 group-hover:scale-[1.03]"
                      style={{ aspectRatio: String(ratio) }}
                    />
                  </a>
                )}

                {/* 하단 그라디언트 캡션 — 호버 시에만 */}
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8 opacity-0 transition group-hover:opacity-100">
                  <p className="line-clamp-2 text-[11px] leading-snug text-paper/90">
                    {im.title}
                  </p>
                  <p className="mt-1 text-[10px] text-accent-soft">{im.query}</p>
                </figcaption>

                <button
                  onClick={() => togglePin(id)}
                  aria-pressed={isPinned}
                  aria-label={isPinned ? "핀 해제" : "핀 하기"}
                  className={`absolute right-2 top-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur transition ${
                    isPinned
                      ? "border-accent bg-accent text-ink"
                      : "border-line-2 bg-ink/70 text-paper/80 opacity-0 group-hover:opacity-100 hover:border-accent hover:text-accent"
                  }`}
                >
                  {isPinned ? "핀됨" : "핀"}
                </button>
              </figure>
            );
          })}
        </div>
      )}

      {board && !loading && !visible.length && (
        <CatSays>
          레퍼런스를 한 장도 못 가져왔어요. 키워드를 더 일반적인 말로 바꾸거나 무드
          프리셋을 &lsquo;그대로&rsquo;로 두고 다시 시도해 보세요.
        </CatSays>
      )}

      {!board && !loading && (
        <CatSays>
          키워드와 무드를 고르고 보드를 만들어 보세요. 모인 컷 중 마음에 드는 것만
          핀하면, 그 조합에서 시즌 팔레트와 실루엣을 뽑아 드릴게요.
        </CatSays>
      )}

      {/* ── AI 무드 브리프 ─────────────────────────────────── */}
      {(thinking || brief) && (
        <div className="fade-up space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">시즌 무드 브리프</h2>
            {thinking && <Pill>생성 중…</Pill>}
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

          <Card title="시즌 컬러 팔레트" hint="헥스를 클릭하면 복사됩니다 · 원단 발주 시 참고">
            {brief?.palette?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {brief.palette.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => c?.hex && copyHex(c.hex)}
                    className="flex items-center gap-3 rounded-lg border border-line bg-ink p-3 text-left transition hover:border-line-2"
                  >
                    <span
                      className="size-11 shrink-0 rounded-md border border-line-2"
                      style={{ background: c?.hex ?? "transparent" }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c?.name}</span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs text-muted">{c?.hex}</span>
                        {c?.role && (
                          <span className="text-[10px] text-accent-soft">{c.role}</span>
                        )}
                        {copied === c?.hex && (
                          <span className="text-[10px] text-accent">복사됨</span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Skeleton lines={3} />
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="핵심 실루엣">
              <TagList items={brief?.silhouettes} />
            </Card>
            <Card title="핵심 소재">
              <TagList items={brief?.materials} />
            </Card>
            <Card title="디테일 포인트">
              <TagList items={brief?.details} />
            </Card>
          </div>

          <Card title="스타일링 조합" hint="바로 판매 가능한 아이템 구성으로 제안">
            <div className="grid gap-4 md:grid-cols-3">
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
          </Card>

          {!!brief?.searchExpansion?.length && (
            <Card
              title="확장 검색 키워드"
              hint="클릭하면 키워드에 담깁니다 · 이 방향을 더 파고들 때"
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

          {brief?.mdNote && (
            <Card title="MD 실행 포인트">
              <p className="text-sm leading-relaxed text-paper/85">{brief.mdNote}</p>
            </Card>
          )}
        </div>
      )}

      {aiError && (
        <p className="rounded-lg border border-accent-2/40 bg-accent-2/10 px-4 py-3 text-sm text-accent-2">
          AI 호출 실패: {aiError.message}
        </p>
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
