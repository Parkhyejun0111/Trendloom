# Trendloom

패션 MD의 실무 루틴 — **리서치 → 가격 결정 → 라인업 기획 → 상품 등록** — 을 실데이터와 AI로 압축한 도구.

## 무엇을 하나

### 1. 트렌드 스캐너
키워드 최대 5개 + 타겟 세그먼트(성별/연령)를 넣으면:

- **네이버 데이터랩 쇼핑인사이트** — 최근 12개월 검색 수요 추이 (세그먼트별)
- **네이버 쇼핑 검색 API** — 실제 판매중인 상위 100개 상품의 가격 분포 · 브랜드 점유 · 카테고리 구성
- **AI(Claude)** — 위 숫자만을 근거로 MD 기획 브리프 생성
  - 수요 단계 / 시즌성 / 다음 피크
  - 권장 판매가 밴드 + 근거 + 마진 리스크
  - 경쟁 밀도 판단, 기회 요인 3, 발주 전 리스크
  - **시즌 라인업 4~5안** — 역할(볼륨/전략/이미지/테스트), 컬러웨이, 초도 발주 수량 제안
  - 이번 주 액션 3

### 2. 상품 태거
상품 이미지 한 장 → Claude Vision이:

- **속성 태깅** — 카테고리 · 실루엣 · 기장 · 넥라인 · 소매 · 컬러 · 패턴 · 소재 · 디테일 · 무드 · 시즌 · TPO
- **머천다이징 판단** — 타겟 고객, 적정 가격 밴드, 포지셔닝, 코디 제안
- **커머스 카피** — 상품명 3안, 헤드라인, 상세 설명, 셀링포인트, 검색 키워드, 해시태그 (전체 복사 지원)

MD 메모(목표가 / 원가 / 시즌 등)를 함께 넣으면 그 조건을 반영합니다.

## 실행

```bash
npm install
cp .env.example .env.local   # 키 입력
npm run dev
```

### 환경 변수

| 키 | 필수 | 발급처 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 필수 | [Anthropic Console → API Keys](https://console.anthropic.com/settings/keys) |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 선택 | [네이버 개발자센터](https://developers.naver.com/apps) — 애플리케이션 등록 시 **검색** + **데이터랩(쇼핑인사이트)** 두 API 모두 체크 |

네이버 키가 없으면 키워드 해시 기반의 **결정적 데모 데이터**로 동작하고, UI 상단에 `데모 데이터` 배지가 붙습니다. 데모여도 시즌성 패턴과 로그정규 가격 분포를 흉내내므로 전체 플로우를 그대로 확인할 수 있습니다.

## 배포 (Vercel)

1. [vercel.com/new](https://vercel.com/new) → GitHub 계정 연결 → `Trendloom` 저장소 **Import**
2. 프레임워크는 Next.js 로 자동 감지됩니다. 빌드 설정은 건드릴 필요 없습니다.
3. **Environment Variables** 에 `ANTHROPIC_API_KEY` 추가 (네이버 키를 쓸 거면 `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` 도)
4. **Deploy**

이후 `main` 에 푸시할 때마다 자동 배포됩니다.

## 구조

```
app/
  page.tsx                 탭 셸 (트렌드 스캐너 / 상품 태거)
  api/scan/route.ts        네이버 두 API 병렬 호출 + 가격/점유 집계
  api/insight/route.ts     집계 데이터 → MD 브리프 (structured streaming)
  api/tag/route.ts         이미지 → 속성/MD판단/카피 (vision + structured streaming)
lib/
  naver.ts                 네이버 API 클라이언트 + 집계 + 데모 폴백
  schemas.ts               Zod 스키마 (서버·클라이언트 공유)
components/
  trend-scanner.tsx        입력 → 차트 → AI 브리프
  product-tagger.tsx       업로드 → 속성/카피
  charts.tsx               SVG 라인차트 · 가격 레인지 · 점유 바
  ui.tsx                   Card / Pill / Field / Toggle …
```

## 설계 노트

- **AI SDK 7 + Anthropic 직접 연결.** `@ai-sdk/anthropic` 로 `claude-opus-5` 호출. Opus 5 는 thinking 이 기본 on 이고 `max_tokens` 를 thinking 과 나눠 쓰기 때문에 두 라우트 모두 `maxOutputTokens: 16000` 을 명시했습니다. 비용을 줄이려면 모델 문자열만 `claude-sonnet-5` 로 바꾸면 됩니다.
- **구조화 출력 스트리밍.** 서버는 `streamText` + `Output.object()`, 클라이언트는 `useObject`. 라인업 카드가 생성되는 순서대로 채워집니다.
- **스키마를 서버/클라이언트가 공유**(`lib/schemas.ts`)해서 부분 객체까지 타입 안전합니다.
- **차트는 의존성 0.** 직접 그린 SVG. 카테고리 팔레트는 색각 이상(CVD) 분리도와 배경 대비를 스크립트로 검증한 5색 고정 순서로, 시리즈가 줄어도 색이 재배치되지 않습니다.
- **데이터 정직성.** 검색지수가 상대값이라는 점을 UI와 시스템 프롬프트 양쪽에 명시했고, 원본 상품 데이터를 언제든 표로 열어볼 수 있게 했습니다.

## 한계 (알고 쓰세요)

- 검색지수는 **상대값**(기간 내 최대 = 100)이며 절대 판매량이 아닙니다. 키워드 간 절대 비교 불가.
- 쇼핑 검색은 상위 100개 표본이라 롱테일 저가 상품이 과소 반영될 수 있습니다.
- AI의 발주 수량 · 가격 제안은 **원가 · 재고 · 기존 매출을 모르는 상태의 추정**입니다. 실제 발주 전 사내 데이터로 검증하세요.
