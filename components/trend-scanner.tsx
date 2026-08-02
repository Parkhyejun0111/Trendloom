"use client";

import { useRef, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { insightSchema } from "@/lib/schemas";
import { FASHION_CATEGORIES, type TrendSeries } from "@/lib/naver";
import { decodeCsv, parseDatalabCsv } from "@/lib/datalab-csv";
import { SERIES, StatTile, TrendChart } from "./charts";
import { Card, Field, KeyValue, Pill, Skeleton, Toggle } from "./ui";

type ScanResult = {
  /** csv = 업로드한 실데이터, naver = 레거시 앱의 데이터랩 API, demo = 샘플 생성기 */
  source: "csv" | "naver" | "demo";
  notes: string[];
  keywords: string[];
  trend: TrendSeries[];
  fileName?: string;
};

const AGES = [
  { v: "10", l: "10대" },
  { v: "20", l: "20대" },
  { v: "30", l: "30대" },
  { v: "40", l: "40대" },
  { v: "50", l: "50대" },
  { v: "60", l: "60대+" },
];

/** 샘플 둘러보기용 — 실제 조회가 아니라 데모 생성기를 태운다 */
const SAMPLE_KEYWORDS = ["트렌치코트", "블레이저", "바람막이"];

const DATALAB_URL = "https://datalab.naver.com/shoppingInsight/sCategory.naver";

/** 검색지수 시계열에서 스탯 타일에 쓸 지표를 뽑는다 */
function readSeries(s: TrendSeries) {
  const pts = s.data.map((d) => d.ratio);
  const first = pts[0] ?? 0;
  const last = pts.at(-1) ?? 0;
  const peak = [...s.data].sort((a, b) => b.ratio - a.ratio)[0];
  return {
    keyword: s.keyword,
    last: Math.round(last * 10) / 10,
    delta: first ? Math.round(((last - first) / first) * 100) : 0,
    peakMonth: peak ? `${Number(peak.period.slice(5, 7))}월` : "—",
    spark: pts,
  };
}

export function TrendScanner() {
  const [category, setCategory] = useState<string>(FASHION_CATEGORIES[0].code);
  const [gender, setGender] = useState<"" | "m" | "f">("");
  const [ages, setAges] = useState<string[]>([]);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    object: insight,
    submit,
    isLoading: thinking,
    error: aiError,
  } = useObject({ api: "/api/insight", schema: insightSchema });

  const categoryLabel = () =>
    FASHION_CATEGORIES.find((c) => c.code === category)?.label ?? category;

  const segmentLabel = () => {
    const g = gender === "m" ? "남성" : gender === "f" ? "여성" : "전체";
    const a = ages.length ? ages.map((x) => `${x}대`).join("/") : "전 연령";
    return `${g} · ${a}`;
  };

  function analyze(data: ScanResult) {
    setScan(data);
    submit({
      keywords: data.keywords,
      categoryLabel: categoryLabel(),
      segmentLabel: segmentLabel(),
      source: data.source,
      trend: data.trend,
    });
  }

  async function onFile(file: File) {
    setErr(null);
    setBusy(true);
    setScan(null);
    try {
      const { series, warnings } = parseDatalabCsv(decodeCsv(await file.arrayBuffer()));
      if (!series.length) {
        setErr(warnings.join(" ") || "CSV 를 읽지 못했습니다.");
        return;
      }
      analyze({
        source: "csv",
        notes: warnings,
        keywords: series.map((s) => s.keyword),
        trend: series,
        fileName: file.name,
      });
    } catch (e) {
      setErr(`CSV 읽기 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /** 데이터가 없어도 화면을 둘러볼 수 있게 하는 경로 — 배지로 분명히 구분한다 */
  async function runSample() {
    setErr(null);
    setBusy(true);
    setScan(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: SAMPLE_KEYWORDS,
          category,
          segment: { gender, ages, device: "" },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const data = await res.json();
      // 데이터랩 권한이 남아 있는 레거시 앱이면 실데이터가 올 수도 있다. 응답을 그대로 믿는다.
      analyze({
        source: data.source === "naver" ? "naver" : "demo",
        notes: data.notes ?? [],
        keywords: data.keywords,
        trend: data.trend,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 입력 ───────────────────────────────────────────── */}
      <Card
        title="데이터랩 CSV 를 올려 주세요"
        hint="네이버가 데이터랩 API 신규 등록을 막아, 웹에서 받은 CSV 를 직접 읽습니다"
      >
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-9 text-center transition ${
                dragging
                  ? "border-accent bg-accent/5"
                  : "border-line-2 hover:border-accent/60"
              }`}
            >
              <p className="text-sm font-medium text-paper">
                {scan?.fileName ?? "CSV 파일을 끌어다 놓거나 클릭해서 선택"}
              </p>
              <p className="mt-1.5 text-xs text-muted">
                쇼핑인사이트 → 조회 → 우측 하단 &ldquo;다운로드&rdquo; 로 받은 파일
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            <p className="text-xs leading-relaxed text-muted">
              <a
                href={DATALAB_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline underline-offset-2"
              >
                데이터랩 쇼핑인사이트 열기 ↗
              </a>{" "}
              — 분야·기간·성별·연령을 고른 뒤 조회하고, 결과를 CSV 로 내려받아 올리시면
              됩니다. 아래 조건은 AI 브리프에 그대로 전달되니 조회하신 값과 맞춰 주세요.
            </p>
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

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button
            onClick={runSample}
            disabled={busy || thinking}
            className="rounded-lg border border-line-2 px-4 py-2.5 text-sm text-paper/80 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "처리 중…" : thinking ? "MD가 분석 중…" : "샘플 데이터로 둘러보기"}
          </button>
          <span className="text-xs text-muted">
            {segmentLabel()} · {categoryLabel()} 조건으로 브리프를 씁니다
          </span>
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
          <Pill tone={scan.source === "demo" ? "warn" : "accent"}>
            {scan.source === "csv"
              ? "네이버 데이터랩 실데이터"
              : scan.source === "naver"
                ? "네이버 데이터랩 API 실데이터"
                : "샘플 데이터"}
          </Pill>
          <span className="text-xs text-muted">
            {scan.source === "csv"
              ? `${scan.fileName} · 키워드 ${scan.keywords.length}개 · ${scan.trend[0]?.data.length ?? 0}개 구간`
              : scan.source === "naver"
                ? "데이터랩 쇼핑인사이트 응답 기준"
                : "실제 시장과 무관한 예시입니다. 판단 근거로 쓰지 마세요"}
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
        <div className="fade-up space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scan.trend.map((s, i) => {
              const r = readSeries(s);
              return (
                <StatTile
                  key={r.keyword}
                  label={r.keyword}
                  value={String(r.last)}
                  unit="검색지수"
                  delta={r.delta}
                  deltaLabel={`기간 증감 · 피크 ${r.peakMonth}`}
                  spark={r.spark}
                  color={SERIES[i % SERIES.length]}
                />
              );
            })}
          </div>

          <Card title="검색 수요 추이" hint="업로드한 데이터랩 쇼핑인사이트 기준">
            <TrendChart series={scan.trend} />
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
            </div>
            {insight?.seasonality && (
              <p className="mt-4 text-sm leading-relaxed text-paper/80">
                {insight.seasonality}
              </p>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="키워드별 수요 해석">
              <dl>
                {(insight?.keywordReads ?? []).map((kr, i) => (
                  <KeyValue key={i} k={kr?.keyword ?? "—"} v={kr?.read ?? "—"} />
                ))}
              </dl>
              {!insight?.keywordReads?.length && <Skeleton lines={4} />}
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

      {/* ── 원본 검색지수 테이블 (파싱 결과 확인용) ──────────── */}
      {scan && (
        <Card title="원본 검색지수" hint="CSV 를 제대로 읽었는지 여기서 확인하세요">
          <details>
            <summary className="cursor-pointer text-sm text-muted hover:text-paper">
              표로 보기 ({scan.trend.reduce((a, s) => a + s.data.length, 0)}건)
            </summary>
            <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-ink-2">
                  <tr className="text-muted">
                    <th className="px-3 py-2 font-medium">키워드</th>
                    <th className="px-3 py-2 font-medium">기간</th>
                    <th className="px-3 py-2 text-right font-medium">검색지수</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.trend.flatMap((s) =>
                    s.data.map((d) => (
                      <tr key={`${s.keyword}-${d.period}`} className="border-t border-line/60">
                        <td className="whitespace-nowrap px-3 py-2 text-muted">{s.keyword}</td>
                        <td className="whitespace-nowrap px-3 py-2">{d.period}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
                          {d.ratio}
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
