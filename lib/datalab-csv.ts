/**
 * 네이버 데이터랩 쇼핑인사이트 CSV 파서
 *
 * 데이터랩 API 는 신규 등록이 막혀 있어(콘솔이 "신규로 등록할 수 없는 API"로 거부)
 * 웹사이트에서 내려받은 CSV 를 직접 읽는다. datalab.naver.com 의 내보내기 포맷이
 * 메뉴마다 조금씩 달라, 특정 서식을 가정하지 않고 형태를 추론한다.
 *
 * 지원하는 모양:
 *   - 앞쪽에 조회 조건 같은 메타 줄이 몇 줄 붙어 있어도 건너뛴다
 *   - 넓은 형태: 날짜 | 키워드A | 키워드B ...
 *   - 긴 형태:   날짜 | 키워드 | 값
 *   - 날짜: 2025-08-01 / 2025.08.01 / 2025/08/01 / 2025-08 / 2025.08
 *   - 인코딩: UTF-8 (BOM 포함) 우선, 깨지면 EUC-KR 로 재시도
 */

import type { TrendSeries } from "./naver";

export type ParseResult = {
  series: TrendSeries[];
  /** 사용자에게 보여 줄 주의사항 — 조용히 넘어가지 않는다 */
  warnings: string[];
};

/* ------------------------------------------------------------------ */
/* 디코딩                                                              */
/* ------------------------------------------------------------------ */

/** UTF-8 로 읽어 치환문자(U+FFFD)가 나오면 EUC-KR 로 다시 읽는다 */
export function decodeCsv(buf: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return stripBom(utf8);
  try {
    return stripBom(new TextDecoder("euc-kr").decode(buf));
  } catch {
    return stripBom(utf8);
  }
}

const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

/* ------------------------------------------------------------------ */
/* CSV 분해                                                            */
/* ------------------------------------------------------------------ */

/** 따옴표 안의 쉼표·줄바꿈을 지키며 한 줄씩 셀로 나눈다 */
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === "," || c === "\t") {
      cells.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cells.push(cur);
      rows.push(cells);
      cells = [];
      cur = "";
    } else cur += c;
  }

  if (cur.length || cells.length) {
    cells.push(cur);
    rows.push(cells);
  }

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c.length));
}

/* ------------------------------------------------------------------ */
/* 값 해석                                                             */
/* ------------------------------------------------------------------ */

/** "2025-08-01" · "2025.08" · "2025/8/1" → "2025-08-01" (아니면 null) */
function toPeriod(raw: string): string | null {
  const s = raw.replace(/["']/g, "").trim();
  const m = s.match(/^(\d{4})[-./년\s]+(\d{1,2})(?:[-./월\s]+(\d{1,2}))?/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = m[3] ? Number(m[3]) : 1;
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "1,234.5" · "42%" → 1234.5 · 42 (아니면 null) */
function toNumber(raw: string): number | null {
  const s = raw.replace(/["',%\s]/g, "");
  if (!s || !/^-?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* 파싱                                                                */
/* ------------------------------------------------------------------ */

export function parseDatalabCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const rows = splitRows(text);

  if (!rows.length) {
    return { series: [], warnings: ["CSV 에서 읽을 내용을 찾지 못했습니다."] };
  }

  // 첫 열이 날짜로 읽히는 첫 행 = 데이터 시작. 그 위는 전부 메타 정보로 본다.
  const firstData = rows.findIndex((r) => toPeriod(r[0] ?? "") !== null);
  if (firstData === -1) {
    return {
      series: [],
      warnings: [
        "날짜 열을 찾지 못했습니다. 데이터랩에서 받은 CSV 가 맞는지 확인해 주세요.",
      ],
    };
  }
  if (firstData > 0) {
    warnings.push(`상단 ${firstData}줄은 조회 조건으로 보고 건너뛰었습니다.`);
  }

  const dataRows = rows.slice(firstData).filter((r) => toPeriod(r[0] ?? "") !== null);
  const header = firstData > 0 ? rows[firstData - 1] : null;
  const width = Math.max(...dataRows.map((r) => r.length));

  // 긴 형태 판별: 3열이고 2번째 열이 숫자가 아니면 (날짜 | 키워드 | 값) 으로 본다
  const isLong =
    width === 3 &&
    dataRows.every((r) => toNumber(r[1] ?? "") === null && toNumber(r[2] ?? "") !== null);

  const buckets = new Map<string, { period: string; ratio: number }[]>();

  if (isLong) {
    for (const r of dataRows) {
      const period = toPeriod(r[0])!;
      const name = r[1] || "키워드";
      const ratio = toNumber(r[2]);
      if (ratio === null) continue;
      if (!buckets.has(name)) buckets.set(name, []);
      buckets.get(name)!.push({ period, ratio });
    }
  } else {
    for (let col = 1; col < width; col++) {
      const name = header?.[col]?.replace(/["']/g, "").trim() || `시리즈 ${col}`;
      const pts: { period: string; ratio: number }[] = [];
      for (const r of dataRows) {
        const ratio = toNumber(r[col] ?? "");
        if (ratio === null) continue;
        pts.push({ period: toPeriod(r[0])!, ratio });
      }
      if (pts.length) buckets.set(name, pts);
    }
    if (!header) {
      warnings.push(
        "헤더 줄을 찾지 못해 열 이름을 임시로 붙였습니다. 키워드명이 이상하면 CSV 상단을 확인해 주세요.",
      );
    }
  }

  const series: TrendSeries[] = [...buckets.entries()]
    .map(([keyword, data]) => ({
      keyword,
      data: data.sort((a, b) => a.period.localeCompare(b.period)),
    }))
    .filter((s) => s.data.length > 1);

  if (!series.length) {
    return {
      series: [],
      warnings: [
        ...warnings,
        "숫자 열을 찾지 못했습니다. 검색지수 값이 들어 있는 CSV 인지 확인해 주세요.",
      ],
    };
  }

  if (series.length > 5) {
    warnings.push(`시리즈 ${series.length}개 중 앞 5개만 사용합니다.`);
  }

  return { series: series.slice(0, 5), warnings };
}
