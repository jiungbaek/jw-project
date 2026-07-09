---
category: tooling
applied: not-yet
---
## vitest.config.ts가 Playwright e2e 스펙까지 집어서 `bun run test`가 항상 실패함

**상황**: Step 3, Task 1-2 체크포인트에서 `bun run test`(전체 실행) 시 `e2e/smoke.spec.ts`(Playwright 전용 파일)를 Vitest가 로드하며 "test() to be called here" 에러로 항상 실패했다. 이 프로젝트 템플릿의 초기 커밋부터 있던 설정 누락이었다.
**판단**: `vitest.config.ts`의 `test.exclude`에 `"e2e/**"`를 추가해 즉시 해결. CLAUDE.md가 Vitest/Playwright 파일 위치를 이미 분리 규정하고 있었으므로 설정을 그 규정에 맞춘 것뿐이라 판단이 명확했다.
**다시 마주칠 가능성**: 높음 — 이 템플릿을 기반으로 만든 다른 프로젝트/feature에도 같은 설정 누락이 있을 가능성이 크다. 지금은 단일 feature에서의 발견이라 `/compound`가 누적 후 판단하도록 보류.

---

category: code-review
applied: discarded
---
## code-reviewer의 Suggestion 3건은 이번 사이클에 반영하지 않음

**상황**: Step 4, code-reviewer가 (1) fetch에 AbortController 부재, (2) Gemini 모델명 하드코딩, (3) 프롬프트 금지어 포함 여부만 검사하는 얕은 테스트를 Suggestion으로 지적함.
**판단**: 세 항목 모두 "동작·유지보수에 영향 없음" 등급이고 3시간 완주가 목표인 연습 사이클이라 기각. Critical(런타임 금칙어 필터 부재)과 Important(에러 메시지 노출, 필드 화이트리스트 부재) 2건만 즉시 수정.
**다시 마주칠 가능성**: 낮음 — 이번 feature 규모·기한에 특유한 우선순위 판단.

---

category: tooling
applied: not-yet
---
## 세션 중 정체불명의 자동 커밋("1", "2", "3")이 main에 직접 발생함

**상황**: Step 3 진행 중 `git log`를 보니 내가 만들지 않은 커밋 메시지 "1", "2", "3"이 이미 main에 올라가 있었고, 각각 wireframe.html/plan.md, 그리고 내가 방금 작성한 app/page.tsx 등 작업 파일을 포함하고 있었다. 세션 내 어떤 자동 커밋 훅이 주기적으로 스냅샷을 커밋하는 것으로 보인다.
**판단**: 우회하지 않고 그 위에 의미 있는 conventional commit을 새로 쌓는 방식으로 처리 (git history를 rewrite하지 않음). feature 브랜치 없이 main에 직접 작업 중이라 이런 자동 커밋과 내 커밋이 섞여도 순서상 문제는 없었다.
**다시 마주칠 가능성**: 중간 — 같은 하네스/설정에서 다음 feature를 진행해도 동일하게 나타날 가능성이 있으나, 원인(어떤 훅인지)을 아직 특정하지 못해 규칙화하기엔 이르다.

---

category: correctness
applied: rule
---
## LLM 출력에 대한 금칙어 필터는 로컬 테스트를 통과해도 프로덕션에서 100% 오탐할 수 있다

**상황**: 지표를 3개→7개로 늘리는 요청 처리 중, 로컬에서 실제 Gemini 호출로 여러 번 성공을 확인했던 서버측 금칙어 필터("매수"/"매도"/"목표가" 단독 단어 차단)가 Vercel 배포 직후 `/api/season` 요청 100%를 502로 실패시켰다. `vercel logs`로 확인한 원인은, "매수"/"매도"가 채권·환율 시장 흐름을 설명하는 지극히 일반적인 금융 리포팅 어휘(예: "외국인 매도세로 금리 상승")라서, 지표가 늘어나며 텍스트 표면적이 커질수록 오탐 확률이 사실상 100%에 수렴했다는 것이다. 로컬 테스트가 통과한 이유는 우연히 그 단어가 안 걸리는 짧은 응답만 관찰했기 때문이다.
**판단**: 금칙어를 "매수"/"매도" 단독에서 "매수 추천"/"매도 추천"/"매수 의견"/"매도 의견"/"매수 시그널"/"매도 시그널"/"목표가"처럼 실제 투자 권유로만 읽히는 구체적 구문으로 좁혔다. 재발 방지를 위해 정상적인 시장 리포팅 문장이 걸리지 않는지 확인하는 회귀 테스트도 추가했다.
**다시 마주칠 가능성**: 높음 — LLM 출력을 금칙어/denylist로 검증하는 모든 feature에서 반복될 수 있는 일반 원칙. 자유 텍스트를 생성하는 LLM 응답에 fail-closed 필터를 걸 때는, 로컬에서 몇 번 성공했다고 끝내지 말고 (1) 그 단어가 도메인에서 정상적으로 쓰이는 문맥이 있는지 먼저 검토하고 (2) 실제 배포 환경에서 곧바로 한 번 더 확인해야 한다. `.claude/rules/llm-output-denylist-false-positives.md`로 즉시 승격.
