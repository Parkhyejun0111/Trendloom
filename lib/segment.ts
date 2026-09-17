/**
 * 소비자 세그먼트(성별·연령·기간) 정의 — 클라이언트(Home 선택 UI)와 서버(API route,
 * trend-db) 양쪽에서 공유한다.
 *
 * 연령 코드는 NAVER 검색 트렌드 API가 실제로 지원하는 연령 구간 값을 그대로 쓴다.
 * 기획서 예시(18–19 / 20–24 / 25–29 / 30–34)는 API가 제공하는 구간과 정확히 일치하지
 * 않아, 임의로 구간을 만들어내지 않는다는 원칙(데이터 품질 규칙 #1, #6)에 따라
 * 실제 API 구간(13–18 / 19–24 / 25–29 / 30–34 / 35–39)을 그대로 노출한다.
 */

export type Gender = "f" | "m";
export type AgeCode = "2" | "3" | "4" | "5" | "6";

export const GENDER_OPTIONS: { code: Gender; label: string }[] = [
  { code: "f", label: "여성" },
  { code: "m", label: "남성" },
];

export const AGE_OPTIONS: { code: AgeCode; label: string; range: string }[] = [
  { code: "2", label: "10대 후반", range: "13–18세" },
  { code: "3", label: "20대 초반", range: "19–24세" },
  { code: "4", label: "20대 후반", range: "25–29세" },
  { code: "5", label: "30대 초반", range: "30–34세" },
  { code: "6", label: "30대 후반", range: "35–39세" },
];

export const PERIOD_OPTIONS: { weeks: number; label: string }[] = [
  { weeks: 4, label: "최근 1개월" },
  { weeks: 12, label: "최근 3개월" },
  { weeks: 24, label: "최근 6개월" },
  { weeks: 52, label: "최근 1년" },
];

export type Segment = { gender: Gender; ageCode: AgeCode; weeks: number };

export const DEFAULT_SEGMENT: Segment = { gender: "f", ageCode: "4", weeks: 12 };

export function genderLabel(g: Gender) {
  return GENDER_OPTIONS.find((o) => o.code === g)?.label ?? g;
}

export function ageLabel(code: AgeCode) {
  return AGE_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

export function periodLabel(weeks: number) {
  return PERIOD_OPTIONS.find((o) => o.weeks === weeks)?.label ?? `최근 ${weeks}주`;
}

export function segmentLabel(s: Segment) {
  return `${ageLabel(s.ageCode)} ${genderLabel(s.gender)}`;
}

export function segmentToQueryString(s: Segment) {
  return new URLSearchParams({ gender: s.gender, age: s.ageCode, weeks: String(s.weeks) }).toString();
}

function isGender(v: string | null): v is Gender {
  return v === "f" || v === "m";
}

function isAgeCode(v: string | null): v is AgeCode {
  return !!v && AGE_OPTIONS.some((o) => o.code === v);
}

export function parseSegment(searchParams: URLSearchParams): Segment {
  const gender = searchParams.get("gender");
  const age = searchParams.get("age");
  const weeksRaw = Number(searchParams.get("weeks"));
  return {
    gender: isGender(gender) ? gender : DEFAULT_SEGMENT.gender,
    ageCode: isAgeCode(age) ? age : DEFAULT_SEGMENT.ageCode,
    weeks: PERIOD_OPTIONS.some((o) => o.weeks === weeksRaw) ? weeksRaw : DEFAULT_SEGMENT.weeks,
  };
}
