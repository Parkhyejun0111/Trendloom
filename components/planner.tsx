"use client";

import { useMemo, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { planSchema } from "@/lib/schemas";
import { DEFAULT_PLAN, runPlan, type PlanInput, type Scenario } from "@/lib/planner";
import { SERIES, StatTile } from "./charts";
import { Card, Field, KeyValue, Pill, PrimaryButton, Skeleton } from "./ui";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const eok = (n: number) => `${(n / 1e8).toFixed(2)}억`;
const jang = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}장`;

/** 숫자 입력 — 원/장/주 단위 */
function NumField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-lg border border-line-2 bg-ink px-3 py-2.5 focus-within:border-muted">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-sm tabular-nums outline-none"
        />
        {suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

/** 퍼센트 입력 — 내부적으로 0~1 비율로 저장한다 */
function PctField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (ratio: number) => void;
}) {
  return (
    <NumField
      label={label}
      value={Math.round(value * 100)}
      onChange={(n) => onChange(Math.max(0, Math.min(100, n)) / 100)}
      suffix="%"
      step={1}
    />
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
              fill="#c98500"
              opacity={0.08}
            />
            <line
              x1={x(mdStart)}
              x2={x(mdStart)}
              y1={pad.t}
              y2={h - pad.b}
              stroke="#c98500"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text x={x(mdStart) + 5} y={pad.t + 11} fontSize={10} fill="#c98500">
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
            <text key={p.week} x={x(i)} y={h - 7} fontSize={9} fill="#85858f" textAnchor="middle">
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
      <Card
        title="발주 수량과 판매가를 정합니다"
        hint="입력을 바꾸면 16개 조합이 즉시 다시 계산됩니다 · 숫자는 전부 산식으로 나옵니다"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2">
            <Field label="아이템">
              <input
                value={input.item}
                onChange={(e) => set("item", e.target.value)}
                className="w-full rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm outline-none focus:border-muted"
              />
            </Field>
          </div>
          <NumField
            label="원가"
            value={input.unitCost}
            onChange={(n) => set("unitCost", n)}
            suffix="원"
            step={1000}
          />
          <NumField
            label="기준 판매가"
            value={input.basePrice}
            onChange={(n) => set("basePrice", n)}
            suffix="원"
            step={1000}
          />
        </div>

        <div className="mt-4 rounded-lg border border-accent/25 bg-accent/[0.04] p-4">
          <p className="mb-3 text-xs text-accent-soft">
            결과를 가장 크게 좌우하는 두 값입니다. 유사 상품 실적으로 맞춰 주세요.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField
              label="기준가에서 주당 예상 판매량"
              value={input.baseWeeklyUnits}
              onChange={(n) => set("baseWeeklyUnits", n)}
              suffix="장/주"
              step={10}
            />
            <NumField
              label="가격탄력성"
              value={input.elasticity}
              onChange={(n) => set("elasticity", n)}
              suffix="(-1.5 = 가격 10%↑ → 수요 약 14%↓)"
              step={0.1}
              min={-10}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <NumField
            label="시즌 길이"
            value={input.seasonWeeks}
            onChange={(n) => set("seasonWeeks", Math.max(1, n))}
            suffix="주"
          />
          <NumField
            label="정상가 판매"
            value={input.fullPriceWeeks}
            onChange={(n) => set("fullPriceWeeks", Math.max(0, n))}
            suffix="주"
          />
          <PctField
            label="시즌 후반 할인율"
            value={input.markdownRate}
            onChange={(v) => set("markdownRate", v)}
          />
          <PctField
            label="채널 수수료"
            value={input.commissionRate}
            onChange={(v) => set("commissionRate", v)}
          />
          <PctField
            label="반품률"
            value={input.returnRate}
            onChange={(v) => set("returnRate", v)}
          />
          <PctField
            label="잔여재고 회수율"
            value={input.salvageRate}
            onChange={(v) => set("salvageRate", v)}
          />
          <NumField
            label="목표 판매율"
            value={input.targetSellThrough}
            onChange={(n) => set("targetSellThrough", Math.max(0, Math.min(100, n)))}
            suffix="%"
          />
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
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
                <thead className="sticky top-0 bg-ink-2">
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

          <div className="grid gap-6 lg:grid-cols-3">
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
