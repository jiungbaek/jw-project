# AI 투자 4계절 웨더캐스터 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| Gemini 호출 위치 | Next.js Route Handler (`app/api/season/route.ts`)에서만 호출 | `GEMINI_API_KEY`를 클라이언트에 노출하지 않음 |
| Gemini SDK/모델 | `@google/genai`, 모델 `gemini-2.5-flash`, `tools: [{ googleSearch: {} }]`로 grounding 활성화 | 무료 티어에서 실시간 검색 grounding을 지원하는 가벼운 모델 |
| 응답 형식 | 프롬프트로 엄격한 JSON(계절/지표별 근거 3개/자산 경향 문구)을 요구 + 서버에서 방어적 `JSON.parse` | grounding(`googleSearch`) 도구와 강제 `responseSchema`를 함께 쓰면 응답이 불안정할 수 있어, 프롬프트 기반 JSON 요청 + try/catch 파싱으로 낮은 리스크를 선택 |
| 캐싱 | Route Handler `export const dynamic = 'force-dynamic'`, 클라이언트 fetch는 `cache: 'no-store'` | spec 불변 규칙 없음 항목("매 요청 새 판정, 캐시 없음") 충족 |
| 상태 관리 | 결과 페이지 로컬 `useState`(`loading` / `success` / `error`)만 사용, 전역 상태 없음 | 단일 페이지의 일시적 UI 상태라 전역 스토어 불필요 |
| e2e 테스트 범위 | 이번 사이클은 Vitest + RTL로 컴포넌트/라우트를 테스트하고, 전체 클릭 흐름은 Browser MCP로 1회 수동 검증. Playwright `e2e/`는 이번 사이클에 추가하지 않음 | 3시간 완주 스코프. 실제 Gemini 응답은 매번 달라져 Playwright로 값 단언하기 부적합하고, 흐름 자체는 Browser MCP로 충분히 증명 가능 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| `GEMINI_API_KEY` | Env var | `.env.local`(로컬, 이미 존재), Vercel Project Settings → Environment Variables(배포 시 등록) | Task 1 |

## 데이터 모델

영속 데이터 모델 없음 (stateless, DB 없음). 요청마다 생성되는 ephemeral 응답 타입만 존재:

### SeasonResult (persisted 아님, API 응답 타입)
- season: "봄" | "여름" | "가을" | "겨울"
- evidence → { cpi: string, rate: string, index: string } (지표별 한 줄 요약)
- assetNote: string (계절별 자산군 경향 한 줄)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | Task 1, 2, 3 | Route Handler 작성 규약, 캐싱 무효화(`force-dynamic`), App Router 데이터 흐름 |
| vercel-react-best-practices | Task 2, 3 | 로딩/에러 상태 컴포넌트 패턴, 불필요한 리렌더 방지 |
| vercel-composition-patterns | Task 2, 3 | 결과 화면의 loading/success/error 상태별 컴포넌트 구성 |
| shadcn | Task 2, 3 | 기존 `components/ui/*`(Button, Card 등) 재사용. `.claude/skills/shadcn/rules/` 준수, `components/ui/*` 직접 수정 금지 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/season.ts` | New | Task 1 |
| `lib/gemini.ts` | New | Task 1 |
| `lib/gemini.test.ts` | New | Task 1 |
| `app/api/season/route.ts` | New | Task 1 |
| `app/api/season/route.test.ts` | New | Task 1 |
| `app/page.tsx` | Modify (기존 `ComponentExample` 제거, 메인 화면으로 교체) | Task 2 |
| `app/page.test.tsx` | New | Task 2 |
| `app/results/page.tsx` | New | Task 2, 3(Modify) |
| `app/results/page.test.tsx` | New | Task 2, 3(Modify) |
| `components/season/season-card.tsx` | New | Task 2 |
| `components/season/season-error.tsx` | New | Task 3 |
| `package.json` | Modify (`@google/genai` 추가) | Task 1 |

## Tasks

### Task 1: Gemini 계절 판정 서비스 + API Route ✅ 완료 (커밋 13726c6)

- **담당 시나리오**: Scenario 1 (backend — 정상 판정 응답 형태), Scenario 2 (backend — 호출/파싱 실패 시 에러 응답)
- **크기**: M (5 파일)
- **의존성**: None
- **참조**:
  - `@google/genai` 공식 SDK 문서 (Google Search grounding, `tools: [{ googleSearch: {} }]` 사용법)
  - next-best-practices — Route Handler 작성 규약
- **구현 대상**:
  - `bun add @google/genai` (패키지 설치)
  - `types/season.ts` — `SeasonResult` 타입 정의
  - `lib/gemini.ts` — Gemini 클라이언트 초기화, 계절 판정 프롬프트 구성, 응답을 `SeasonResult`로 파싱(실패 시 throw). 프롬프트에 "특정 종목명, 매수/매도 시그널, 목표가는 절대 언급하지 말고 자산군(주식/채권/금/원자재) 단위의 일반적 경향만 서술하라"는 지시를 명시적으로 포함 (spec.md 불변 규칙)
  - `lib/gemini.test.ts` — 프롬프트 문자열에 종목명·시그널 금지 지시가 포함되는지 검증하는 케이스 포함
  - `app/api/season/route.ts` — `export const dynamic = 'force-dynamic'`, `lib/gemini.ts` 호출 후 성공 시 200 + `SeasonResult` JSON, 실패 시 에러 상태 JSON
  - `app/api/season/route.test.ts`
- **수용 기준**:
  - [ ] Gemini 클라이언트가 유효한 계절 판정 JSON(계절 1개 + 지표 3개 근거 + 자산 경향 문구)을 반환하면, `GET /api/season` 응답이 200과 함께 `{ season, evidence: { cpi, rate, index }, assetNote }` 형태를 반환한다
  - [ ] Gemini 클라이언트 호출 자체가 실패(reject)하면, `GET /api/season` 응답이 실패를 나타내는 상태(2xx가 아님)와 에러 표시 필드를 반환한다
  - [ ] Gemini가 JSON으로 파싱할 수 없는 텍스트를 반환하면, `GET /api/season` 응답이 마찬가지로 실패를 나타내는 상태를 반환한다
  - [ ] Gemini에 보내는 프롬프트 문자열에 "종목명·매수/매도 시그널·목표가 언급 금지" 지시가 포함되어 있다 (spec.md 불변 규칙)
- **검증**: `bun run test -- lib/gemini app/api/season` (Vitest, `@google/genai` 클라이언트를 `vi.mock`으로 대체해 성공/실패/파싱실패 3가지 응답을 주입)

---

### Task 2: 메인 페이지 + 결과 페이지 정상 판정 UI ✅ 완료 (커밋 29b7141, 실제 Gemini 호출로 브라우저 확인)

- **담당 시나리오**: Scenario 1 (full — UI)
- **크기**: M (5 파일)
- **의존성**: Task 1 (`/api/season`가 존재해야 결과 페이지가 호출할 대상이 있음)
- **참조**:
  - wireframe.html 화면 0(메인), 화면 1의 `scenario-1`(정상 판정) 상태
  - shadcn — 기존 `components/ui/button.tsx`, `components/ui/card.tsx` 재사용
- **구현 대상**:
  - `app/page.tsx` — 기존 `ComponentExample` 렌더링 제거, 서비스 소개 문구 + "오늘의 계절 확인하기" 버튼(→ `/results`로 이동)
  - `app/page.test.tsx`
  - `app/results/page.tsx` — 클라이언트 컴포넌트. mount 시 `fetch('/api/season', { cache: 'no-store' })` 호출, `loading` 상태로 시작해 성공 시 `SeasonResult`를 `SeasonCard`에 전달
  - `components/season/season-card.tsx` — 계절명 + 지표별 한 줄 근거 3개 + 자산 경향 문구 + "다시 확인하기" 버튼(클릭 시 `/`로 이동) 렌더링 (wireframe `scenario-1` 레이아웃 그대로)
  - `app/results/page.test.tsx` — `fetch`를 mock해 로딩 → 성공 전환 검증
- **수용 기준**:
  - [ ] "오늘의 계절 확인하기" 버튼 클릭 → `/results`로 이동하고 로딩 상태(예: "판정하는 중" 텍스트)가 보인다
  - [ ] 판정 완료(mock 응답: season="가을") → "가을" 텍스트가 화면에 표시된다
  - [ ] 판정 완료 → CPI/금리/지수 각각에 대한 한 줄 요약 3개가 모두 표시된다
  - [ ] 판정 완료 → 자산 경향 문구가 표시된다
  - [ ] 판정 완료 화면에서 "다시 확인하기" 버튼 클릭 → `/`(메인)로 이동한다
- **검증**: `bun run test -- app/page app/results` (Vitest + RTL, `global.fetch`를 mock)

---

### Checkpoint: Task 1-2 이후 ✅ 완료
- [x] 모든 테스트 통과: `bun run test` (13/13)
- [x] 빌드 성공: `bun run build`
- [x] 메인 → 결과 페이지 정상 판정 흐름이 실제 브라우저에서 end-to-end로 동작 (Browser MCP, 실제 Gemini 호출로 "여름" 판정 + 실제 CPI/금리/S&P500 근거 확인)

---

### Task 3: 결과 페이지 에러/재시도 + 재방문 시 재요청

- **담당 시나리오**: Scenario 2 (UI — 에러 + 재시도), Scenario 3 (재요청 시 캐시 없이 새 로딩)
- **크기**: S (3 파일)
- **의존성**: Task 2 (`app/results/page.tsx` 존재)
- **참조**:
  - wireframe.html 화면 1의 `scenario-2`(로딩), `scenario-3`(에러) 상태
- **구현 대상**:
  - `components/season/season-error.tsx` — 에러 안내 문구 + "다시 시도" 버튼
  - `app/results/page.tsx` (Modify) — `fetch` 실패/비정상 응답 시 `error` 상태로 전환해 `SeasonError` 렌더링, "다시 시도" 클릭 시 `loading` 상태로 재진입해 재요청. 페이지 mount마다(메인 재클릭 포함) 이전 결과를 재사용하지 않고 항상 새 fetch 실행
  - `app/results/page.test.tsx` (Modify) — 에러/재시도/재요청 케이스 추가
- **수용 기준**:
  - [ ] `/api/season` 호출이 실패 응답을 반환하면 "지금 계절을 파악하기 어렵습니다" 류의 에러 안내 문구가 표시된다
  - [ ] 에러 상태에서 "다시 시도" 버튼이 표시된다
  - [ ] "다시 시도" 버튼 클릭 → 로딩 상태로 전환되고 `/api/season`이 다시 호출된다
  - [ ] 결과 페이지에 두 번째로 진입(재mount)하면 이전 성공 결과가 즉시 보이지 않고 로딩 상태부터 다시 시작한다
- **검증**: `bun run test -- app/results` (Vitest + RTL, `fetch` mock을 실패 1회 + 성공 1회로 순차 구성해 재시도 검증)

---

### Checkpoint: Task 3 이후 (최종)
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 에러 → 재시도 → 성공, 그리고 메인↔결과 재방문 흐름이 실제 브라우저에서 동작 (Browser MCP, 증거 `artifacts/investment-4-seasons/evidence/checkpoint-2.png`)
- [ ] Vercel 배포 완료 후 배포 URL에서 동일 흐름 재확인 (Human review)

## 미결정 항목

없음
