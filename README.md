# Trendloom

**Consumer Trend Intelligence** — 연령·성별별 검색 관심 데이터를 분석하고, 관련 키워드와 시각적
스타일 레퍼런스를 연결해 "요즘 어떤 스타일에 관심이 모이고 있는지"를 한곳에서 탐색하는 서비스.

> 개인 프로젝트 기획 배경: `Trendloom_AMOREPACIFIC_Channel_Sales_Strategy_Project_Plan.md` 참고.

## 흐름

```
성별·연령대·기간 선택
  → 검색 관심 데이터 (NAVER 검색 트렌드)
  → Rising / Stable / Falling
  → 관련 키워드
  → 시각적 레퍼런스 (Pinterest)
  → 사용자가 직접 스타일 판단
```

이 서비스는 "이 스타일이 유행합니다"라고 단정하지 않는다. "이 연령·성별 검색 데이터에서 이
키워드의 관심이 증가하고 있습니다"를 보여주고, 판단은 사용자가 한다.

## 실행

```bash
npm install
cp .env.example .env.local   # 키 입력
npm run dev
```

### 환경 변수

| 키 | 필수 | 없으면 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 필수 | TREND READ(AI 해석) 비활성화 |
| `NAVER_API_HUB_CLIENT_ID` / `SECRET` | 권장 | 성별·연령별 검색 관심도가 **결정적 데모 시계열**로 동작(`DEMO` 배지 표시) |
| `NAVER_CLIENT_ID` / `SECRET` | 선택 | Pinterest 이미지 승인 전 임시 시각 레퍼런스 없음 |
| `PINTEREST_ACCESS_TOKEN` | 선택 | Pinterest 성장률 신호 없음(딥링크는 항상 동작) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 선택 | 서버 메모리 캐시로만 동작(재시작 시 초기화), live 데이터가 DB에 적재되지 않음 |

## 데이터 정직성 원칙

- 검색 관심도는 **상대 지표**(구간 내 최고값 = 100)이며 판매량·구매량이 아니다. UI/AI 프롬프트 모두 이 구분을 명시한다.
- 실제 API에서 얻지 못한 값은 절대 실데이터처럼 보여주지 않는다 — 항상 `LIVE`/`DEMO`/`UNAVAILABLE` 상태를 배지로 노출한다.
- Pinterest 이미지 검색은 별도 승인 범위가 필요해 현재 접근할 수 없다. 승인 전까지는 공식 Pinterest 검색 딥링크와, 이미 승인된 NAVER 이미지 검색 결과를 출처를 명시해 대신 보여준다(스크래핑 없음).
- `raw_search_trend` 테이블에는 실제 API 응답(live)만 적재하고, 데모/실패 데이터는 절대 저장하지 않는다.

자세한 결정 배경은 [`docs/decisions.md`](docs/decisions.md), 컬럼 정의는 [`docs/data_dictionary.md`](docs/data_dictionary.md) 참고.

## 구조

```
app/
  page.tsx                    Home ↔ Trend 화면 전환, 세그먼트 상태
  api/trends/route.ts         세그먼트별 Rising/Stable/Falling 스냅샷
  api/trends/[slug]/route.ts  트렌드 상세(관련 키워드 + 시각 레퍼런스)
  api/trends/insight/route.ts 데이터 해석 AI 브리프(structured streaming)
lib/
  segment.ts                  성별/연령/기간 세그먼트 정의(클라이언트·서버 공유)
  naver-trend.ts               NAVER 검색 트렌드 클라이언트(세그먼트 파라미터화) + 데모 폴백
  naver.ts                     NAVER 이미지 검색(Pinterest 임시 대체용)
  pinterest-trend.ts           Pinterest Trends API + 검색 딥링크 쿼리 빌더
  trend-engine.ts              Momentum/Lifecycle 스코어링 + Rising/Stable/Falling 분류
  trend-db.ts                  세그먼트별 캐시, Supabase persistence(live만)
  supabase.ts                  Supabase 서버 클라이언트(env 없으면 null)
components/
  home.tsx                     성별·연령·기간 선택
  trend-dashboard.tsx          Rising/Stable/Falling + Momentum Map
  trend-detail.tsx             상세 + 관련 키워드 + 시각 레퍼런스
supabase/migrations/0001_init.sql   raw_search_trend / keyword_master / trend_metric / pinterest_reference
```

## 한계 (알고 쓰세요)

- 검색 관심도는 **상대값**이며 절대 검색량·판매량이 아닙니다.
- Pinterest 이미지 레퍼런스는 API 승인 대기 중이라 딥링크/NAVER 이미지로 대체돼 있습니다.
- "WHO IS MOVING"(연령대 간 비교)은 세그먼트 간 동시 비교 API가 아직 없어 데모 데이터입니다.
- Supabase 미연결 시 모든 트렌드 데이터는 서버 메모리 캐시(6시간 TTL)로만 동작하며 재배포 시 초기화됩니다.
