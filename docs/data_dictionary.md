# Data Dictionary

## raw_search_trend
append-only 원본 로그. **UPDATE/DELETE 하지 않는다** — 재현성을 위해 항상 새 행을 추가한다.
현재 구현은 `search.status === "live"`(실제 NAVER API 응답)일 때만 이 테이블에 적재한다.
데모/실패 시 생성된 값은 절대 원본인 것처럼 저장하지 않는다.

| 컬럼 | 의미 |
|---|---|
| source | 데이터 출처. 현재 값: `naver_search_trend` |
| keyword_group | 조회에 사용한 대표 키워드 그룹명 |
| keyword | 표시용 키워드(현재는 keyword_group과 동일) |
| gender | `f`(여성) / `m`(남성) |
| age_group | NAVER 검색 트렌드 API 연령 코드. `2`=13–18, `3`=19–24, `4`=25–29, `5`=30–34, `6`=35–39 |
| period_start / period_end | 조회 기간 |
| relative_value | API가 제공하는 **상대적 검색 관심도**(구간 내 최고값=100). 절대 검색량이 아니다 |
| collected_at | 수집 시각 |

## keyword_master

| 컬럼 | 의미 |
|---|---|
| keyword | 대표 키워드(그룹명). unique |
| normalized_keyword | 표기 정규화 결과 |
| category | 대분류. `outer`/`top`/`bottom`/`dress`/`shoes`/`bag`/`accessory`/`style` (기획서 9장 taxonomy) |
| synonyms | API 조회에 함께 묶는 동의어 목록(`lib/trend-db.ts`의 `SeedTrend.keywords`) |

## trend_metric

| 컬럼 | 의미 |
|---|---|
| current_value / previous_value | 현재 시점 값과 4주 전 비교 시점 값 |
| change_rate | `(current − previous) / previous × 100`, 분모에 최소 바닥값을 둬 왜곡을 방지(`lib/naver-trend.ts: safePctChange`) |
| trend_direction | `RISING`(change_rate > 8%p) / `FALLING`(< −8%p) / `STABLE`(그 외). 임계값은 `lib/trend-engine.ts: DIRECTION_THRESHOLD` |

## pinterest_reference
Pinterest 이미지 검색 API 승인 전까지는 비어 있다. 승인 후 실제 이미지 결과를 적재하는 용도로만 스키마를 미리 만들어 둔 상태다.

## 파생 지표 (DB에 저장하지 않음, 요청마다 계산)

| 지표 | 정의 | 위치 |
|---|---|---|
| momentum | 검색 30% + 쇼핑 30% + 비주얼 25% + persistence 15% 가중 합성 지표. **NAVER/Pinterest 공식 지표가 아니다** — UI에 항상 "Trend Momentum"으로 표기 | `lib/trend-engine.ts` |
| lifecycle | DISCOVERY/EMERGING/RISING/MAINSTREAM/SATURATED/DECLINING 6단계 | `lib/trend-engine.ts: calculateLifecycle` |
