# [PC통신] Web Foundation v0.1

AI 활용 동호회 **[PC통신]** 홈페이지의 새 디자인 Foundation입니다.

## 현재 방향

- Polished Digital Magazine
- Black / White / Acid Green (#C6FF00)
- Responsive Editorial Layout
- Weekly Issue 기반 AI NEWS
- PROJECT / SELECTED WORK / ARCHIVE / GALLERY
- 레트로 PC통신 요소는 5~10%만 사용

## 실행

Node.js 22 이상을 사용합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 기술

- Next.js 16
- React 19
- Tailwind CSS 4
- Vercel

## Legacy

기존 CRT/BBS 스타일 v2.5는 `legacy-retro-v2-5` 브랜치에 보존되어 있습니다.

## 다음 단계

HOME 디자인 검증 후 아래를 순차 연결합니다.

1. AI NEWS 목록/상세
2. PROJECT 목록/상세
3. ARCHIVE/GALLERY
4. Supabase
5. Magic Link 및 회원 승인
6. MY PAGE / ADMIN
7. n8n AI NEWS pipeline

현재 Foundation에서는 Supabase 및 회원 기능을 의도적으로 연결하지 않습니다.
