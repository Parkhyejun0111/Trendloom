"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useObject } from "@ai-sdk/react";
import { planSchema } from "@/lib/schemas";
import { DEFAULT_PLAN, runPlan, type PlanInput, type Scenario } from "@/lib/planner";
import { SERIES, StatTile } from "./charts";
import { Card, KeyValue, Pill, PrimaryButton, Skeleton } from "./ui";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const eok = (n: number) => `${(n / 1e8).toFixed(2)}억`;
const jang = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}장`;

/** 드롭다운 요약 행 — 접었을 땐 값만, 탭하면 그 자리에서 입력창이 펼쳐진다 */
function SummaryRow({
  label,
  value,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={isOpen ? "rounded-xl bg-accent-tint px-3" : "border-b border-line px-0.5"}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm text-muted">{label}</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-extrabold text-paper">
          {value}
          <span
            className={`text-[9px] text-muted transition-transform ${isOpen ? "-scale-y-100" : ""}`}
          >
            ▾
          </span>
        </span>
      </button>
      {isOpen && <div className="pb-3">{children}</div>}
    </div>
  );
}

const TICK_W = 14;

/** 가로 스크롤 눈금 다이얼 — 자를 옆으로 미는 느낌으로 값을 고른다 */
function RulerPicker({
  value,
  onChange,
  min,
  max,
  step,
  format,
  tickEvery = 5,
  hint,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  tickEvery?: number;
  hint?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = Math.round((max - min) / step);

  // 행이 펼쳐질 때 현재 값 위치로 스크롤을 즉시 맞춘다 (애니메이션 없이)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round((value - min) / step);
    el.scrollLeft = idx * TICK_W;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = trackRef.current;
      if (!el) return;
      const idx = Math.min(count, Math.max(0, Math.round(el.scrollLeft / TICK_W)));
      const next = Math.round((min + idx * step) * 1000) / 1000;
      if (next !== value) onChange(next);
    }, 90);
  }

  return (
    <div>
      <p className="text-center text-3xl font-extrabold tabular-nums tracking-tight text-paper">
        {format(value)}
      </p>
      <div className="relative mt-3 h-14">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="ruler-track flex h-full items-end overflow-x-auto"
          style={{ scrollSnapType: "x mandatory" }}
        >
          <div style={{ flex: `0 0 calc(50% - ${TICK_W / 2}px)` }} />
          {Array.from({ length: count + 1 }, (_, i) => (
            <div
              key={i}
              style={{ flex: `0 0 ${TICK_W}px`, scrollSnapAlign: "center" }}
              className="flex h-full flex-col items-center justify-end"
            >
              <div
                className={
                  i % tickEvery === 0 ? "h-7 w-[2.5px] rounded-full bg-ink-black" : "h-3.5 w-px bg-line"
                }
              />
            </div>
          ))}
          <div style={{ flex: `0 0 calc(50% - ${TICK_W / 2}px)` }} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-accent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-accent-tint to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-accent-tint to-transparent" />
      </div>
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

/** 주차별 재고 소진 곡선 */
function DepletionCurve({ scenario }: { scenario: Scenario }) {
  const w = 640;
  const h = 150;
  const pad = { t: 10, r: 8, b: 22, l: 8 };
  const pts = scenario.weekly;
  const maxStock = Math.max(scenario.qty, 1);
  const x = (i: number) => pad.l + (i / Math.max(1, pts.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxStock) * (h - pad.t - pad.b);

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.stock)}`).join(" ");
  const mdStart = pts.findIndex((p) => p.markdown);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="주차별 재고 소진">
        {mdStart > 0 && (
          <>
            <rect
              x={x(mdStart)}
              y={pad.t}
              width={w - pad.r - x(mdStart)}
              height={h - pad.t - pad.b}
              fill="#f6c7dc"
              opacity={0.08}
            />
            <line
              x1={x(mdStart)}
              x2={x(mdStart)}
              y1={pad.t}
              y2={h - pad.b}
              stroke="#e0729b"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text x={x(mdStart) + 5} y={pad.t + 11} fontSize={10} fill="#e0729b">
              할인 시작
            </text>
          </>
        )}
        <path
          d={`${line} L${x(pts.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`}
          fill={SERIES[0]}
          opacity={0.14}
        />
        <path d={line} fill="none" stroke={SERIES[0]} strokeWidth={2} strokeLinecap="round" />
        {pts.map((p, i) =>
          i % 2 === 0 ? (
            <text key={p.week} x={x(i)} y={h - 7} fontSize={9} fill="#5c5c58" textAnchor="middle">
              {p.week}
            </text>
          ) : null,
        )}
      </svg>
      <p className="mt-1 text-[11px] text-muted">
        가로축 = 주차 · 세로축 = 남은 재고 ({jang(scenario.qty)} 에서 시작)
      </p>
    </div>
  );
}

export function Planner() {
  const [input, setInput] = useState<PlanInput>(DEFAULT_PLAN);
  const [picked, setPicked] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<keyof PlanInput | null>(null);
  const toggle = (k: keyof PlanInput) => setOpenKey((prev) => (prev === k ? null : k));

  const {
    object: plan,
    submit,
    isLoading: thinking,
    error: aiError,
  } = useObject({ api: "/api/plan", schema: planSchema });

  // 입력이 바뀔 때마다 즉시 다시 계산한다 — AI 없이도 표는 살아 있다
  const result = useMemo(() => runPlan(input), [input]);

  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }));

  const keyOf = (s: Scenario) => `${s.price}-${s.qty}`;
  const shown =
    result.scenarios.find((s) => keyOf(s) === picked) ?? result.recommended ?? null;

  const sorted = useMemo(
    () => result.scenarios.slice().sort((a, b) => b.profit - a.profit),
    [result],
  );

  return (
    <div className="space-y-6">
      {/* ── 입력 ───────────────────────────────────────────── */}
      <Card className="card-glass">
        <div>
          <SummaryRow
            label="아이템"
            value={input.item}
            isOpen={openKey === "item"}
            onToggle={() => toggle("item")}
          >
            <input
              value={input.item}
              onChange={(e) => set("item", e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm outline-none focus:border-muted"
            />
          </SummaryRow>

          <SummaryRow
            label="원가"
            value={won(input.unitCost)}
            isOpen={openKey === "unitCost"}
            onToggle={() => toggle("unitCost")}
          >
            <RulerPicker
              value={input.unitCost}
              onChange={(n) => set("unitCost", n)}
              min={0}
              max={300000}
              step={1000}
              tickEvery={10}
              format={won}
            />
          </SummaryRow>

          <SummaryRow
            label="기준 판매가"
            value={won(input.basePrice)}
            isOpen={openKey === "basePrice"}
            onToggle={() => toggle("basePrice")}
          >
            <RulerPicker
              value={input.basePrice}
              onChange={(n) => set("basePrice", n)}
              min={0}
              max={500000}
              step={1000}
              tickEvery={10}
              format={won}
            />
          </SummaryRow>

          <SummaryRow
            label="주당 예상 판매량"
            value={`${input.baseWeeklyUnits}장`}
            isOpen={openKey === "baseWeeklyUnits"}
            onToggle={() => toggle("baseWeeklyUnits")}
          >
            <RulerPicker
              value={input.baseWeeklyUnits}
              onChange={(n) => set("baseWeeklyUnits", n)}
              min={0}
              max={3000}
              step={10}
              tickEvery={10}
              format={(n) => `${n.toLocaleString("ko-KR")}장`}
              hint="결과를 가장 크게 좌우하는 값입니다. 유사 상품 실적으로 맞춰 주세요."
            />
          </SummaryRow>

          <SummaryRow
            label="가격탄력성"
            value={`${input.elasticity}`}
            isOpen={openKey === "elasticity"}
            onToggle={() => toggle("elasticity")}
          >
            <RulerPicker
              value={input.elasticity}
              onChange={(n) => set("elasticity", n)}
              min={-5}
              max={0}
              step={0.1}
              tickEvery={5}
              format={(n) => n.toFixed(1)}
              hint="-1.5 = 가격 10%↑ → 수요 약 14%↓. 이 값도 결과를 크게 좌우합니다."
            />
          </SummaryRow>

          <SummaryRow
            label="시즌 길이"
            value={`${input.seasonWeeks}주`}
            isOpen={openKey === "seasonWeeks"}
            onToggle={() => toggle("seasonWeeks")}
          >
            <RulerPicker
              value={input.seasonWeeks}
              onChange={(n) => set("seasonWeeks", Math.max(1, n))}
              min={1}
              max={52}
              step={1}
              tickEvery={4}
              format={(n) => `${n}주`}
            />
          </SummaryRow>

          <SummaryRow
            label="정상가 판매"
            value={`${input.fullPriceWeeks}주`}
            isOpen={openKey === "fullPriceWeeks"}
            onToggle={() => toggle("fullPriceWeeks")}
          >
            <RulerPicker
              value={input.fullPriceWeeks}
              onChange={(n) => set("fullPriceWeeks", Math.max(0, n))}
              min={0}
              max={52}
              step={1}
              tickEvery={4}
              format={(n) => `${n}주`}
            />
          </SummaryRow>

          <SummaryRow
            label="시즌 후반 할인율"
            value={`${Math.round(input.markdownRate * 100)}%`}
            isOpen={openKey === "markdownRate"}
            onToggle={() => toggle("markdownRate")}
          >
            <RulerPicker
              value={Math.round(input.markdownRate * 100)}
              onChange={(n) => set("markdownRate", n / 100)}
              min={0}
              max={100}
              step={1}
              tickEvery={10}
              format={(n) => `${n}%`}
            />
          </SummaryRow>

          <SummaryRow
            label="채널 수수료"
            value={`${Math.round(input.commissionRate * 100)}%`}
            isOpen={openKey === "commissionRate"}
            onToggle={() => toggle("commissionRate")}
          >
            <RulerPicker
              value={Math.round(input.commissionRate * 100)}
              onChange={(n) => set("commissionRate", n / 100)}
              min={0}
              max={100}
              step={1}
              tickEvery={10}
              format={(n) => `${n}%`}
            />
          </SummaryRow>

          <SummaryRow
            label="반품률"
            value={`${Math.round(input.returnRate * 100)}%`}
            isOpen={openKey === "returnRate"}
            onToggle={() => toggle("returnRate")}
          >
            <RulerPicker
              value={Math.round(input.returnRate * 100)}
              onChange={(n) => set("returnRate", n / 100)}
              min={0}
              max={100}
              step={1}
              tickEvery={10}
              format={(n) => `${n}%`}
            />
          </SummaryRow>

          <SummaryRow
            label="잔여재고 회수율"
            value={`${Math.round(input.salvageRate * 100)}%`}
            isOpen={openKey === "salvageRate"}
            onToggle={() => toggle("salvageRate")}
          >
            <RulerPicker
              value={Math.round(input.salvageRate * 100)}
              onChange={(n) => set("salvageRate", n / 100)}
              min={0}
              max={100}
              step={1}
              tickEvery={10}
              format={(n) => `${n}%`}
            />
          </SummaryRow>

          <SummaryRow
            label="목표 판매율"
            value={`${input.targetSellThrough}%`}
            isOpen={openKey === "targetSellThrough"}
            onToggle={() => toggle("targetSellThrough")}
          >
            <RulerPicker
              value={input.targetSellThrough}
              onChange={(n) => set("targetSellThrough", Math.max(0, Math.min(100, n)))}
              min={0}
              max={100}
              step={1}
              tickEvery={10}
              format={(n) => `${n}%`}
            />
          </SummaryRow>
        </div>

        {!!result.warnings.length && (
          <div className="mt-4 space-y-1.5">
            {result.warnings.map((w) => (
              <p
                key={w}
                className="rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-2 text-xs text-accent-2"
              >
                {w}
              </p>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <PrimaryButton onClick={() => submit(input)} disabled={thinking}>
            {thinking ? "MD가 검토 중…" : "AI 실행 판단 받기"}
          </PrimaryButton>
          <span className="text-xs text-muted">
            표는 이미 계산돼 있습니다. AI는 해석과 리스크만 덧붙입니다
          </span>
        </div>
      </Card>

      {/* ── 추천안 요약 ───────────────────────────────────── */}
      {shown && (
        <div className="fade-up space-y-6">
          <div className="grid gap-4 @sm:grid-cols-2">
            <StatTile
              label="영업이익"
              value={eok(shown.profit)}
              unit={`${shown.marginRate}%`}
              color={SERIES[0]}
            />
            <StatTile label="매출" value={eok(shown.revenue)} color={SERIES[2]} />
            <StatTile
              label="판매율"
              value={`${shown.sellThrough}`}
              unit="%"
              delta={Math.round(shown.sellThrough - input.targetSellThrough)}
              deltaLabel={`목표 ${input.targetSellThrough}%`}
              color={SERIES[1]}
            />
            <StatTile
              label="잔여 재고"
              value={jang(shown.leftover)}
              unit={`할인 비중 ${shown.markdownShare}%`}
              color={SERIES[3]}
            />
          </div>

          <div className="grid gap-6 @xl:grid-cols-[1.3fr_1fr]">
            <Card
              title="재고 소진 곡선"
              hint={`${won(shown.price)} × ${jang(shown.qty)} 기준`}
              right={
                shown === result.recommended ? <Pill tone="accent">시스템 추천</Pill> : undefined
              }
            >
              <DepletionCurve scenario={shown} />
            </Card>

            <Card title="손익 구성">
              <dl>
                <KeyValue k="매출" v={won(shown.revenue)} />
                <KeyValue k="채널 수수료" v={`− ${won(shown.commission)}`} />
                <KeyValue k="매출원가" v={`− ${won(shown.cogs)}`} />
                <KeyValue k="잔여재고 회수" v={`+ ${won(shown.salvage)}`} />
                <KeyValue
                  k="영업이익"
                  v={
                    <span className={shown.profit >= 0 ? "text-paper" : "text-accent-2"}>
                      {won(shown.profit)} ({shown.marginRate}%)
                    </span>
                  }
                />
                <KeyValue k="손익분기" v={`${jang(shown.breakEvenUnits)} (정상가 기준)`} />
                <KeyValue
                  k="품절"
                  v={shown.stockoutWeek ? `${shown.stockoutWeek}주차 — 기회손실 발생` : "없음"}
                />
              </dl>
            </Card>
          </div>

          {/* ── 시나리오 표 ─────────────────────────────────── */}
          <Card
            title="시나리오 16개"
            hint="영업이익 순 · 행을 누르면 위 지표가 그 조합으로 바뀝니다"
          >
            <div className="max-h-[420px] overflow-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-ink-2 backdrop-blur-md">
                  <tr className="text-muted">
                    <th className="px-3 py-2 font-medium">판매가</th>
                    <th className="px-3 py-2 text-right font-medium">발주량</th>
                    <th className="px-3 py-2 text-right font-medium">판매율</th>
                    <th className="px-3 py-2 text-right font-medium">할인비중</th>
                    <th className="px-3 py-2 text-right font-medium">잔여</th>
                    <th className="px-3 py-2 text-right font-medium">매출</th>
                    <th className="px-3 py-2 text-right font-medium">영업이익</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => {
                    const isShown = keyOf(s) === keyOf(shown);
                    return (
                      <tr
                        key={keyOf(s)}
                        onClick={() => setPicked(keyOf(s))}
                        className={`cursor-pointer border-t border-line/60 transition ${
                          isShown ? "bg-accent/10" : "hover:bg-ink-3/60"
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {s === result.recommended && (
                            <span className="mr-1.5 text-accent">★</span>
                          )}
                          {won(s.price)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{jang(s.qty)}</td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            s.meetsTarget ? "text-paper" : "text-muted"
                          }`}
                        >
                          {s.sellThrough}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          {s.markdownShare}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          {jang(s.leftover)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">
                          {eok(s.revenue)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium tabular-nums ${
                            s.profit >= 0 ? "text-paper" : "text-accent-2"
                          }`}
                        >
                          {eok(s.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              판매율이 목표 미만인 행은 흐리게 표시됩니다. ★ 는 목표를 채우면서 영업이익이 가장 큰
              조합입니다.
            </p>
          </Card>
        </div>
      )}

      {/* ── AI 판단 ───────────────────────────────────────── */}
      {(thinking || plan) && (
        <div className="fade-up space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">실행 판단</h2>
            {thinking && <Pill>검토 중…</Pill>}
          </div>

          <Card>
            {plan?.headline ? (
              <p className="text-xl leading-snug font-medium tracking-tight">{plan.headline}</p>
            ) : (
              <Skeleton lines={2} />
            )}
            {plan?.verdict && (
              <div className="mt-4">
                <Pill tone={plan.verdict === "실행" ? "accent" : "warn"}>{plan.verdict}</Pill>
              </div>
            )}
            {plan?.reasoning && (
              <p className="mt-4 text-sm leading-relaxed text-paper/80">{plan.reasoning}</p>
            )}
          </Card>

          <div className="grid gap-6 @lg:grid-cols-3">
            <Card title="탈락한 대안">
              <dl>
                {(plan?.tradeoffs ?? []).map((t, i) => (
                  <KeyValue key={i} k={t?.option ?? "—"} v={t?.note ?? "—"} />
                ))}
              </dl>
              {!plan?.tradeoffs?.length && <Skeleton lines={4} />}
            </Card>

            <Card title="리스크">
              <ul className="space-y-2.5">
                {(plan?.risks ?? []).map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-paper/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-2" />
                    {r}
                  </li>
                ))}
                {!plan?.risks?.length && <Skeleton />}
              </ul>
            </Card>

            <Card title="발주 전 검증할 가정">
              <ul className="space-y-2.5">
                {(plan?.assumptionChecks ?? []).map((a, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-paper/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {a}
                  </li>
                ))}
                {!plan?.assumptionChecks?.length && <Skeleton />}
              </ul>
            </Card>
          </div>

          {plan?.markdownPlan && (
            <Card title="할인 운영 계획">
              <p className="text-sm leading-relaxed text-paper/85">{plan.markdownPlan}</p>
            </Card>
          )}

          {!!plan?.nextActions?.length && (
            <Card title="이번 주 액션">
              <ol className="space-y-2.5">
                {plan.nextActions.map((a, i) => (
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
    </div>
  );
}
