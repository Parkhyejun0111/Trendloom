/**
 * 생산량·가격 시뮬레이터 — MD 의 3·4단계(발주 수량, 판매가) 계산 엔진.
 *
 * 여기 있는 숫자는 전부 산식으로 나온다. AI 는 결과를 해석만 하고
 * 값을 만들어 내지 않는다. 그래야 브리프의 근거를 되짚을 수 있다.
 *
 * 모델은 단순하다 — 주차별로 수요만큼 팔리고 재고가 준다.
 * 가격이 바뀌면 수요가 탄력성만큼 움직인다. 실제 시장은 이보다
 * 복잡하니 입력값(특히 기준 판매량과 탄력성)이 결과를 지배한다.
 * 그래서 UI 에서 두 값을 전면에 두고 조정하게 한다.
 */

export type PlanInput = {
  item: string;
  /** 단위 원가(원) */
  unitCost: number;
  /** 기준 판매가(원) — 수요 추정의 기준점 */
  basePrice: number;
  /** 기준가에서 예상되는 주당 판매량 */
  baseWeeklyUnits: number;
  /** 가격탄력성. -1.5 면 가격 10% 인상 시 수요 약 14% 감소 */
  elasticity: number;
  /** 시즌 총 길이(주) */
  seasonWeeks: number;
  /** 정상가로 파는 주차 수. 이후는 할인가 */
  fullPriceWeeks: number;
  /** 시즌 후반 할인율 (0.3 = 30% 할인) */
  markdownRate: number;
  /** 채널 판매수수료율 (0.3 = 30%) */
  commissionRate: number;
  /** 반품률 (0.1 = 10%) */
  returnRate: number;
  /** 잔여재고 회수율 — 원가 대비 (0.3 = 원가의 30% 회수) */
  salvageRate: number;
  /** 목표 판매율(%) — 이 아래는 추천에서 제외 */
  targetSellThrough: number;
};

export type WeekPoint = {
  week: number;
  price: number;
  sold: number;
  stock: number;
  /** 할인 구간 여부 */
  markdown: boolean;
};

export type Scenario = {
  price: number;
  qty: number;
  weekly: WeekPoint[];
  soldFull: number;
  soldMarkdown: number;
  soldTotal: number;
  leftover: number;
  /** 판매율 % */
  sellThrough: number;
  /** 품절 발생 주차 (없으면 null) */
  stockoutWeek: number | null;
  revenue: number;
  cogs: number;
  commission: number;
  salvage: number;
  /** 매출 - 수수료 - 매출원가 + 잔여재고 회수 */
  profit: number;
  /** 영업이익률 % */
  marginRate: number;
  /** 할인 판매 비중 % */
  markdownShare: number;
  /** 정상가 기준 손익분기 판매량 */
  breakEvenUnits: number;
  /** 목표 판매율 충족 여부 */
  meetsTarget: boolean;
};

export type PlanResult = {
  input: PlanInput;
  scenarios: Scenario[];
  /** 목표 판매율을 채우면서 영업이익이 가장 큰 안 */
  recommended: Scenario | null;
  /** 목표를 채우는 안이 없어 이익만 보고 고른 경우 */
  fallback: boolean;
  warnings: string[];
};

const round = (n: number) => Math.round(n);
/** 판매가는 1,000원 단위로 떨어뜨린다 — 실무 가격표에 맞춘다 */
const toPriceStep = (n: number) => Math.max(1000, Math.round(n / 1000) * 1000);
/** 발주 수량은 100장 단위 */
const toQtyStep = (n: number) => Math.max(100, Math.round(n / 100) * 100);

/** 가격에 따른 주당 수요. 탄력성이 음수라 가격이 오르면 줄어든다 */
function weeklyDemand(input: PlanInput, price: number) {
  const ratio = price / input.basePrice;
  return input.baseWeeklyUnits * Math.pow(ratio, input.elasticity);
}

export function simulate(input: PlanInput, price: number, qty: number): Scenario {
  const markdownPrice = toPriceStep(price * (1 - input.markdownRate));
  const weekly: WeekPoint[] = [];

  let stock = qty;
  let soldFull = 0;
  let soldMarkdown = 0;
  let revenue = 0;
  let stockoutWeek: number | null = null;

  for (let w = 1; w <= input.seasonWeeks; w++) {
    const isMarkdown = w > input.fullPriceWeeks;
    const p = isMarkdown ? markdownPrice : price;
    const demand = weeklyDemand(input, p);

    // 반품된 물량은 재고로 돌아와 다시 팔린다고 본다
    const gross = Math.min(demand, stock / (1 - input.returnRate || 1));
    const net = Math.min(gross * (1 - input.returnRate), stock);

    stock -= net;
    revenue += net * p;
    if (isMarkdown) soldMarkdown += net;
    else soldFull += net;

    if (stock <= 0.5 && stockoutWeek === null) stockoutWeek = w;
    weekly.push({ week: w, price: p, sold: round(net), stock: round(stock), markdown: isMarkdown });
  }

  const soldTotal = soldFull + soldMarkdown;
  const leftover = Math.max(0, qty - soldTotal);
  const cogs = qty * input.unitCost;
  const commission = revenue * input.commissionRate;
  const salvage = leftover * input.unitCost * input.salvageRate;
  const profit = revenue - commission - cogs + salvage;
  const sellThrough = qty > 0 ? (soldTotal / qty) * 100 : 0;

  return {
    price,
    qty,
    weekly,
    soldFull: round(soldFull),
    soldMarkdown: round(soldMarkdown),
    soldTotal: round(soldTotal),
    leftover: round(leftover),
    sellThrough: Math.round(sellThrough * 10) / 10,
    stockoutWeek,
    revenue: round(revenue),
    cogs: round(cogs),
    commission: round(commission),
    salvage: round(salvage),
    profit: round(profit),
    marginRate: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
    markdownShare: soldTotal > 0 ? Math.round((soldMarkdown / soldTotal) * 1000) / 10 : 0,
    breakEvenUnits: Math.ceil(cogs / (price * (1 - input.commissionRate))),
    meetsTarget: sellThrough >= input.targetSellThrough,
  };
}

/**
 * 배수를 눈금에 맞추되 항상 서로 다른 값이 나오게 한다.
 * 단순히 반올림 후 중복 제거하면, 값이 작을 때 네 후보가 한 값으로
 * 뭉개져 격자가 무너진다(예: 주당 5장이면 전부 100장으로 붙는다).
 */
function spread(values: number[], step: number, min: number): number[] {
  const out: number[] = [];
  for (const v of values) {
    const snapped = Math.max(min, Math.round(v / step) * step);
    const last = out[out.length - 1];
    out.push(last !== undefined && snapped <= last ? last + step : snapped);
  }
  return out;
}

/** 기준가 대비 -10% ~ +20% 네 구간 */
export function priceCandidates(input: PlanInput): number[] {
  const step = input.basePrice >= 20000 ? 1000 : 100;
  return spread([0.9, 1.0, 1.1, 1.2].map((m) => input.basePrice * m), step, step);
}

/** 시즌 총 수요 대비 70% ~ 130% 네 구간 */
export function qtyCandidates(input: PlanInput): number[] {
  const seasonDemand =
    weeklyDemand(input, input.basePrice) * input.seasonWeeks * (1 - input.returnRate);
  const step = seasonDemand >= 1000 ? 100 : 10;
  return spread([0.7, 0.9, 1.1, 1.3].map((m) => seasonDemand * m), step, step);
}

export function runPlan(input: PlanInput): PlanResult {
  const warnings: string[] = [];

  if (input.unitCost >= input.basePrice) {
    warnings.push("원가가 기준 판매가 이상입니다. 어떤 조합도 이익이 날 수 없습니다.");
  }
  if (input.fullPriceWeeks > input.seasonWeeks) {
    warnings.push("정상가 주차가 시즌 길이보다 깁니다. 할인 구간 없이 계산했습니다.");
  }
  if (input.elasticity > 0) {
    warnings.push("가격탄력성이 양수입니다. 가격을 올릴수록 수요가 늘어나는 것으로 계산됩니다.");
  }

  const scenarios: Scenario[] = [];
  for (const price of priceCandidates(input)) {
    for (const qty of qtyCandidates(input)) {
      scenarios.push(simulate(input, price, qty));
    }
  }

  const passing = scenarios.filter((s) => s.meetsTarget);
  const pool = passing.length ? passing : scenarios;
  const recommended =
    pool.slice().sort((a, b) => b.profit - a.profit)[0] ?? null;

  if (!passing.length && scenarios.length) {
    warnings.push(
      `목표 판매율 ${input.targetSellThrough}% 를 넘기는 조합이 없습니다. 이익이 가장 큰 안을 대신 표시합니다.`,
    );
  }

  return { input, scenarios, recommended, fallback: !passing.length, warnings };
}

export const DEFAULT_PLAN: PlanInput = {
  item: "오버핏 울 블렌드 자켓",
  unitCost: 35000,
  basePrice: 99000,
  baseWeeklyUnits: 600,
  elasticity: -1.5,
  seasonWeeks: 16,
  fullPriceWeeks: 10,
  markdownRate: 0.3,
  commissionRate: 0.3,
  returnRate: 0.12,
  salvageRate: 0.3,
  targetSellThrough: 80,
};
