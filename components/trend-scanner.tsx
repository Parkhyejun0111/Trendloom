"use client";

import { useState } from "react";
import { useObject } from "@ai-sdk/react";
import { insightSchema } from "@/lib/schemas";
import { FASHION_CATEGORIES, type MarketSnapshot, type TrendSeries } from "@/lib/naver";
import { PriceRangeChart, SERIES, ShareBars, TrendChart } from "./charts";
import { Card, Field, KeyValue, Pill, Skeleton, Toggle } from "./ui";

type ScanResult = {
  source: "naver" | "demo";
  notes: string[];
  keywords: string[];
  trend: TrendSeries[];
  markets: MarketSnapshot[];
};

const AGES = [
  { v: "10", l: "10대" },
  { v: "20", l: "20대" },
  { v: "30", l: "30대" },
  { v: "40", l: "40대" },
  { v: "50", l: "50대" },
  { v: "60", l: "60대+" },
];

const PRESETS = [
  { label: "24SS 아우터", kws: ["트렌치코트", "블레이저", "바람막이"] },
  { label: "데일리 이너", kws: ["니트 가디건", "스트라이프 셔츠", "슬리브리스"] },
  { label: "하의 라인업", kws: ["와이드팬츠", "데님 스커트", "카고팬츠"] },
];

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function TrendScanner() {
  const [input, setInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["트렌치코트", "블레이저", "바람막이"]);
  const [category, setCategory] = useState<string>(FASHION_CATEGORIES[0].code);
  const [gender, setGender] = useState<"" | "m" | "f">("");
  const [ages, setAges] = useState<string[]>([]);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const {
    object: insight,
    submit,
    isLoading: thinking,
    error: aiError,
  } = useObject({ api: "/api/insight", schema: insightSchema });

  const addKeyword = (raw: string) => {
    const k = raw.trim();
    if (!k || keywords.includes(k) || keywords.length >= 5) return;
    setKeywords([...keywords, k]);
    setInput("");
  };

  const segmentLabel = () => {
    const g = gender === "m" ? "남성" : gender === "f" ? "여성" : "전체";
    const a = ages.length ? ages.map((x) => `${x}대`).join("/") : "전 연령";
    return `${g} · ${a}`;
  };

  async function run() {
    if (!keywords.length) return;
    setScanning(true);
    setErr(null);
    setScan(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          category,
          segment: { gender, ages, device: "" },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const data: ScanResult = await res.json();
      setScan(data);

      submit({
        keywords: data.keywords,
        categoryLabel:
          FASHION_CATEGORIES.find((c) => c.code === category)?.label ?? category,
        segmentLabel: segmentLabel(),
        source: data.source,
        trend: data.trend,
        markets: data.markets,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 입력 ───────────────────────────────────────────── */}
      <Card
        title="무엇을 기획하시나요?"
        hint="키워드 최대 5개 · 네이버 데이터랩 검색 추이와 네이버 쇼핑 실판매 상품을 함께 읽습니다"
      >
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <Field label="키워드">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-2 bg-ink p-2">
                {keywords.map((k, i) => (
                  <span
                    key={k}
                    className="flex items-center gap-1.5 rounded-md bg-ink-2 py-1 pl-2 pr-1 text-sm"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: SERIES[i % SERIES.length] }}
                    />
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
                  placeholder={keywords.length >= 5 ? "최대 5개" : "키워드 입력 후 Enter"}
                  disabled={keywords.length >= 5}
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

          <div className="space-y-4">
            <Field label="카테고리">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm outline-none focus:border-muted"
              >
                {FASHION_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="타겟 성별">
              <div className="flex gap-2">
                {(
                  [
                    ["", "전체"],
                    ["f", "여성"],
                    ["m", "남성"],
                  ] as const
                ).map(([v, l]) => (
                  <Toggle key={l} active={gender === v} onClick={() => setGender(v)}>
                    {l}
                  </Toggle>
                ))}
              </div>
            </Field>

            <Field label="타겟 연령">
              <div className="flex flex-wrap gap-2">
                {AGES.map((a) => (
                  <Toggle
                    key={a.v}
                    active={ages.includes(a.v)}
                    onClick={() =>
                      setAges(
                        ages.includes(a.v)
                          ? ages.filter((x) => x !== a.v)
                          : [...ages, a.v],
                      )
                    }
                  >
                    {a.l}
                  </Toggle>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
          <button
            onClick={run}
            disabled={scanning || thinking || !keywords.length}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {scanning ? "데이터 수집 중…" : thinking ? "MD가 분석 중…" : "시장 스캔 + AI 브리프"}
          </button>
          <span className="text-xs text-muted">{segmentLabel()} 세그먼트로 조회</span>
        </div>

        {err && (
          <p className="mt-3 rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-2 text-xs text-accent-2">
            {err}
          </p>
        )}
      </Card>

      {/* ── 데이터 출처 배너 ────────────────────────────────── */}
      {scan && (
        <div className="fade-up flex flex-wrap items-center gap-3 rounded-lg border border-line bg-ink-2/40 px-4 py-3">
          <Pill tone={scan.source === "naver" ? "accent" : "warn"}>
            {scan.source === "naver" ? "네이버 오픈API 실데이터" : "데모 데이터"}
          </Pill>
          <span className="text-xs text-muted">
            {scan.source === "naver"
              ? "데이터랩 쇼핑인사이트 + 쇼핑 검색 API 응답 기준"
              : "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 를 .env.local 에 넣으면 실데이터로 전환됩니다"}
          </span>
          {scan.notes.map((n) => (
            <span key={n} className="text-xs text-accent-2">
              {n}
            </span>
          ))}
        </div>
      )}

      {/* ── 차트 ──────────────────────────────────────────── */}
      {scan && (
        <div className="fade-up grid gap-6 xl:grid-cols-2">
          <Card
            title="검색 수요 추이"
            hint="최근 12개월 · 네이버 데이터랩 쇼핑인사이트"
            className="xl:col-span-2"
          >
            <TrendChart series={scan.trend} />
          </Card>

          <Card title="가격 분포" hint="네이버 쇼핑 검색 상위 100개 상품의 최저가 기준">
            <PriceRangeChart markets={scan.markets} />
          </Card>

          <Card title="경쟁 브랜드 점유" hint="키워드별 상위 노출 브랜드 비중">
            <div className="space-y-5">
              {scan.markets.map((m, i) => (
                <div key={m.keyword}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: SERIES[i % SERIES.length] }}
                      />
                      {m.keyword}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      총 {m.total.toLocaleString("ko-KR")}개
                    </span>
                  </div>
                  <ShareBars
                    data={m.brandShare.slice(0, 5)}
                    color={SERIES[i % SERIES.length]}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── AI 브리프 ─────────────────────────────────────── */}
      {(thinking || insight) && (
        <div className="fade-up space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">MD 기획 브리프</h2>
            {thinking && <Pill>생성 중…</Pill>}
          </div>

          <Card>
            {insight?.headline ? (
              <p className="text-xl leading-snug font-medium tracking-tight">
                {insight.headline}
              </p>
            ) : (
              <Skeleton lines={2} />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {insight?.demandStage && <Pill tone="accent">수요 {insight.demandStage}</Pill>}
              {insight?.competition?.density && (
                <Pill tone={
                  insight.competition.density === "레드오션" ? "warn" : "default"
                }>
                  경쟁 {insight.competition.density}
                </Pill>
              )}
              {insight?.priceStrategy?.sweetSpot && (
                <Pill>권장가 {insight.priceStrategy.sweetSpot}</Pill>
              )}
            </div>
            {insight?.seasonality && (
              <p className="mt-4 text-sm leading-relaxed text-paper/80">
                {insight.seasonality}
              </p>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="가격 전략">
              <dl>
                <KeyValue k="스위트스팟" v={insight?.priceStrategy?.sweetSpot ?? "—"} />
                <KeyValue k="근거" v={insight?.priceStrategy?.rationale ?? "—"} />
                <KeyValue k="마진 리스크" v={insight?.priceStrategy?.marginRisk ?? "—"} />
              </dl>
            </Card>

            <Card title="기회 요인">
              <ul className="space-y-2.5">
                {(insight?.opportunities ?? []).map((o, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-paper/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {o}
                  </li>
                ))}
                {!insight?.opportunities?.length && <Skeleton />}
              </ul>
            </Card>

            <Card title="발주 전 리스크">
              <ul className="space-y-2.5">
                {(insight?.risks ?? []).map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-paper/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-2" />
                    {r}
                  </li>
                ))}
                {!insight?.risks?.length && <Skeleton />}
              </ul>
            </Card>
          </div>

          <Card
            title="시즌 라인업 제안"
            hint="역할(볼륨/전략/이미지/테스트)별로 배분된 스타일 플랜"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(insight?.lineup ?? []).map((s, i) => (
                <article
                  key={i}
                  className="rounded-lg border border-line bg-ink p-4 transition hover:border-line-2"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold leading-snug">{s?.style}</h4>
                    {s?.role && <Pill tone={s.role === "볼륨" ? "accent" : "default"}>{s.role}</Pill>}
                  </div>
                  <dl className="mt-3">
                    <KeyValue k="타겟" v={s?.target ?? "—"} />
                    <KeyValue k="판매가" v={s?.retailPrice ?? "—"} />
                    <KeyValue
                      k="컬러웨이"
                      v={
                        <span className="flex flex-wrap gap-1.5">
                          {(s?.colorway ?? []).map((c, j) => (
                            <span
                              key={j}
                              className="rounded border border-line-2 px-1.5 py-0.5 text-xs"
                            >
                              {c}
                            </span>
                          ))}
                        </span>
                      }
                    />
                    <KeyValue k="초도 발주" v={s?.buyQty ?? "—"} />
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-muted">{s?.reason}</p>
                </article>
              ))}
              {!insight?.lineup?.length && (
                <>
                  <Skeleton lines={5} />
                  <Skeleton lines={5} />
                  <Skeleton lines={5} />
                </>
              )}
            </div>
          </Card>

          {!!insight?.nextActions?.length && (
            <Card title="이번 주 액션">
              <ol className="space-y-2.5">
                {insight.nextActions.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm text-paper/85">
                    <span className="font-mono text-xs text-accent">{`0${i + 1}`}</span>
                    {a}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}

      {aiError && (
        <p className="rounded-lg border border-accent-2/40 bg-accent-2/10 px-4 py-3 text-sm text-accent-2">
          AI 호출 실패: {aiError.message}. ANTHROPIC_API_KEY 가 설정되어 있는지 확인하세요.
        </p>
      )}

      {/* ── 원본 상품 테이블 (접근성: 표 뷰) ────────────────── */}
      {scan && (
        <Card title="원본 상품 데이터" hint="차트의 근거가 된 실제 검색 결과">
          <details>
            <summary className="cursor-pointer text-sm text-muted hover:text-paper">
              표로 보기 ({scan.markets.reduce((a, m) => a + m.items.length, 0)}건)
            </summary>
            <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-ink-2">
                  <tr className="text-muted">
                    <th className="px-3 py-2 font-medium">키워드</th>
                    <th className="px-3 py-2 font-medium">상품명</th>
                    <th className="px-3 py-2 font-medium">브랜드</th>
                    <th className="px-3 py-2 font-medium">몰</th>
                    <th className="px-3 py-2 text-right font-medium">최저가</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.markets.flatMap((m) =>
                    m.items.map((it, i) => (
                      <tr key={`${m.keyword}-${i}`} className="border-t border-line/60">
                        <td className="whitespace-nowrap px-3 py-2 text-muted">{m.keyword}</td>
                        <td className="max-w-xs truncate px-3 py-2">{it.title}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-paper/70">{it.brand}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-paper/70">{it.mall}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
                          {won(it.price)}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}
