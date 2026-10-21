# PC통신 AI NEWS Automation v0.1

## 목표

뉴스를 자동 게시하지 않는다.

```
공식 소스 수집
→ news_candidates
→ AI 분석
→ /admin AI NEWS / INBOX
→ 운영진 승인
→ news_posts
→ HOME
```

## 환경변수

n8n 실행 환경에만 설정한다. GitHub/브라우저 코드에 secret을 넣지 않는다.

```
PCTONGSIN_SUPABASE_URL=https://<project>.supabase.co
PCTONGSIN_SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
OPENAI_API_KEY=<API key>
PCTONGSIN_NEWS_MODEL=<Responses API compatible model>
```

## Workflow 01 — Collector

파일: `workflow_01_collector.json`

스케줄:
- 06:30
- 11:30
- 16:30
- 21:30
- Asia/Seoul

처리:
1. `news_sources`에서 `enabled=true AND source_type=rss` 조회
2. 각 RSS 읽기
3. 최근 항목 normalize
4. `ingest_news_candidate` RPC 호출
5. DB가 canonical URL 기준 신규/중복 판정

저장하는 원문 데이터는 제목, URL, 요약, 게시일, 이미지 URL 수준으로 제한한다. 기사 본문 전체를 복제하지 않는다.

## Workflow 02 — Processor

파일: `workflow_02_processor.json`

스케줄: 15분마다.

처리:
1. `claim_news_candidates(10)` RPC
2. 최대 10개 후보를 원자적으로 processing 상태로 claim
3. AI가 아래 구조로 분석
4. DB PATCH
5. 50점 이상 → review
6. 50점 미만 → rejected (recommendation=SKIP)
7. 실패 → failed

### AI 출력 계약

```json
{
  "title_ko": "한국어 제목",
  "summary_ko": "2~3문장 핵심 요약",
  "why_it_matters": "PC통신 회원이 실제 업무/학습에 왜 관심을 가져야 하는지",
  "category": "MODEL | PRODUCT | WORK | AUTOMATION | BUILD | EDUCATION | OTHER",
  "relevance_score": 0,
  "confidence_score": 0
}
```

### relevance_score 기준

- 실제 업무 활용 가능성: 40
- 출처 신뢰도: 25
- 최신성: 20
- 기존 변화 대비 새로움: 15

추천:
- 85–100: HIGH
- 70–84: REVIEW
- 50–69: LOW
- 0–49: SKIP

FEATURED RECOMMENDED:
- relevance >= 85
- confidence >= 90
- trust_score >= 95
- 게시 후 48시간 이내

## Workflow 03 — Retry Guard

파일: `workflow_03_retry.json`

매시간 실행.

`processing` 상태가 30분 이상 지속된 후보를 `failed`로 되돌린다.
Processor는 `failed AND retry_count < 3`도 다시 claim한다.

3회 실패한 후보는 자동 재시도하지 않는다.

## 관리자 검토

`/admin → AI NEWS / INBOX`

후보별:
- 원문 제목
- AI 제안 제목
- AI 요약
- WHY IT MATTERS
- relevance / confidence
- 원문 보기
- 제외
- 게시
- 대표 게시

게시에는 반드시 `publish_news_candidate()` RPC를 사용한다.
이 함수가 `news_posts` 생성과 후보의 `published` 전이를 함께 처리한다.

## 보안

- Supabase service-role key는 n8n 서버 환경변수에만 둔다.
- 브라우저/admin.js에는 publishable key만 둔다.
- n8n은 service-role로 collector/processor 작업만 수행한다.
- 실제 게시 결정은 authenticated admin RPC를 통해서만 수행한다.

## 적용 순서

1. 최신 `supabase_membership_migration.sql` 실행
2. n8n에 환경변수 설정
3. 세 JSON workflow import
4. Collector 수동 실행
5. Supabase `news_candidates` 확인
6. Processor 수동 실행
7. `/admin` INBOX 확인
8. 후보 1건 게시
9. HOME 반영 확인
10. 정상 확인 후 workflow 활성화
