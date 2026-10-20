# PC통신 Visual Reference Matrix v1

작성일: 2026-10-20  
적용 브랜치: `redesign-v0.1`

## 디자인 방향

**Contemporary Editorial × AI Maker Culture × Subtle PC Communication Heritage**

목표는 “트렌디한 AI 사이트”가 아니라, 첫 방문자가 빠르게 이해하고 회원이 실제로 읽고·참여하고·만들고·공유할 수 있는 동호회 포털이다.

핵심 UX 흐름:

`READ → TRY → MAKE → SHARE → REUSE`

브랜드 문법:

- `[ ]` = 현재 위치, 선택, 묶음, PC통신의 고유 시각 언어
- Acid Green = 상태와 행동을 표시하는 신호색
- 한글 = 정보 전달의 주언어
- 영문/숫자/코드 = 메타데이터와 편집적 리듬
- 실제 결과물 > 장식 이미지

---

## Reference Matrix

| 영역 | 핵심 레퍼런스 | 가져올 요소 | 가져오지 않을 요소 | PC통신 적용 규칙 | 상태 |
|---|---|---|---|---|---|
| 1. 일러스트 | IBM Design Language Illustration / Hybrid UI | 명확한 목적, grid 기반, line/diagram 중심, 정보 흐름을 설명하는 connector | 장식용 캐릭터, 감성 일러스트 남용, 무의미한 AI 추상화 | 일러스트보다 **정보형 diagram** 우선. `[ ]`, node, connector, process를 브랜드 그래픽으로 사용 | 설계 완료 / 제작 대기 |
| 2. 폰트 | Pretendard Variable / IBM Plex / Vercel Geist Typography | 한국어 가독성, variable weight, 명확한 heading/body/metadata hierarchy, Sans + Mono pairing | 영문용 display font를 한글 본문에 억지 적용, 과도한 초대형 타이포 반복 | **Pretendard Variable = 본문·제목**, **IBM Plex Mono = ISSUE/PROJECT/날짜/번호** | 1차 적용 |
| 3. 아이콘 | IBM UI Icons / Raycast Icon System | 16·20·24·32 규격, 일관된 stroke, icon 사용 최소화, 44px 이상 touch target | 서로 다른 icon pack 혼용, 3D icon, 설명 가능한 텍스트를 아이콘으로 대체 | 기본 **24px / 1.5px stroke**, 작은 메타 UI는 16px. Black/White, active만 Acid Green | 1차 적용 |
| 4. UI 컴포넌트 | Vercel Geist / Linear 2026 UI refresh / Raycast | 예측 가능한 위치, 상태별 background/border/text scale, Badge는 상태용, Action을 명확하게 | card radius·shadow 남용, 모든 콘텐츠를 카드화, 숨겨진 핵심 행동 | Border + whitespace 중심. 버튼/Badge/Form/Browser frame은 정해진 variant만 사용 | 적용 중 |
| 5. 인터랙션·애니메이션 | Framer 2026 Animation / Raycast 2.0 | scroll reveal, hover/press feedback, 현재 위치 표시, motion이 hierarchy와 feedback을 보조 | 장식용 parallax, 지속 loop, 큰 text flying, motion으로 콘텐츠 읽기를 방해 | 160–360ms 범위. **Bracket active state + subtle reveal + progress**. reduced-motion 준수 | 1차 적용 |
| 6. 3D Asset | Spline | 필요할 때만 실시간 3D로 “실제 물체/제품”을 설명 | AI SaaS식 floating sphere/cube, glass object를 분위기용으로 추가 | 기본 **사용하지 않음**. 프로젝트 결과물이 3D일 때만 사용 | 의도적 제외 |
| 7. 이미지·영상 | IBM Photography / Raycast product imagery / 실제 PC통신 프로젝트 | 실제 작업 맥락, 실제 UI, 실제 산출물, 짧은 제품 loop | stock AI 이미지, 사람 중심 홍보사진, 결과물 대신 생성형 추상 이미지 | Gallery/Selected Work는 **실제 screenshot 우선**. 영상은 8–15초 무음 loop + poster | 실제 자산 대기 |
| 8. 컬러 팔레트 | Vercel Geist Colors / Raycast Brand | background/text/border/status를 semantic token으로 분리, 고대비, accent 절제 | rainbow AI palette, gradient 남용, Acid Green을 넓은 면적으로 사용 | Black / White / Off-white / Gray + **Acid Green ≤ 5%**. green은 선택·현재·CTA·status에만 사용 | 적용 |
| 9. 목업 | Vercel Browser/Phone / Apple Design Resources Product Bezels | 콘텐츠 유형에 맞는 frame, 실제 screenshot을 방해하지 않는 chrome, 접근성상 chrome은 decorative | 모든 결과물을 노트북에 넣기, 과한 그림자/원근, fake browser UI를 실제 UI처럼 제시 | Website=Browser frame, Mobile=Phone frame, PDF=paper stack, Dashboard=raw crop | 규칙 확정 / 자산 대기 |

---

## 채택한 레퍼런스 URL

### Illustration
- IBM Design Language — Illustration  
  https://www.ibm.com/design/language/illustration/overview/
- IBM Design Language — Hybrid UI  
  https://www.ibm.com/design/language/illustration/hybrid-ui-style/design/

### Typography
- Pretendard  
  https://github.com/orioncactus/pretendard
- IBM Plex  
  https://www.ibm.com/design/language/typography/typeface/
- Vercel Geist Typography  
  https://vercel.com/geist/typography

### Icons
- IBM UI Icons  
  https://www.ibm.com/design/language/iconography/ui-icons/usage/
- Raycast Icon System  
  https://www.raycast.com/blog/a-fresh-look-and-feel

### UI Components
- Vercel Geist  
  https://vercel.com/geist/introduction
- Linear — A calmer interface for a product in motion  
  https://linear.app/now/behind-the-latest-design-refresh
- Raycast 2.0  
  https://www.raycast.com/blog/the-new-raycast

### Interaction / Motion
- Framer — Animations Overview  
  https://www.framer.com/academy/lessons/framer-animations-overview
- Raycast Technical Deep Dive  
  https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast

### 3D
- Spline  
  https://spline.design/

### Imagery
- IBM Photography  
  https://www.ibm.com/design/language/photography/overview/
- Raycast Press / Product screenshots  
  https://www.raycast.com/press

### Color
- Vercel Geist Colors  
  https://vercel.com/geist/colors
- Raycast Press / Brand colors  
  https://www.raycast.com/press

### Mockups
- Vercel Browser  
  https://vercel.com/geist/browser
- Vercel Phone  
  https://vercel.com/geist/phone
- Apple Design Resources  
  https://developer.apple.com/design/resources/

---

## PC통신 Design Tokens v1

### Typography
- Hero: 64–132px, Pretendard Variable 850–900
- Section H2: 44–74px, 800–900
- Card H3: 28–48px, 750–850
- Body: 15–18px, 450–700
- Metadata: 9–12px, IBM Plex Mono 600–700
- 한글 자간은 큰 제목만 음수값 사용. 본문은 과도하게 줄이지 않는다.

### Color
- Ink: `#0A0A0A`
- Paper: `#F5F5F2`
- Surface: `#FFFFFF`
- Line: `#C9CCC4`
- Muted: `#686862`
- Acid Green: `#C6FF00`

### Icon
- Default: 24px / 1.5px stroke
- Compact: 16px / 1px stroke
- Touch target: ≥44px
- Fill icon은 상태점·브랜드 bracket 외 사용하지 않는다.

### Motion
- Fast: 160ms
- Normal: 240ms
- Reveal: 360ms
- Easing: `cubic-bezier(.2,.7,.2,1)`
- translate distance ≤16px
- `prefers-reduced-motion`이면 transform/reveal 제거

### Component
- Radius: 기본 0, 작은 controls만 2–4px 허용
- Shadow: 기본 사용하지 않음
- Section division: 1px rule + whitespace
- Accent fill: Badge / current state / primary emphasis만 허용
- Primary CTA: 한 화면에서 최대 1개가 가장 강하게 보이도록 함

---

## 적용 우선순위

### Phase 1 — 현재 즉시 적용
- Pretendard Variable + IBM Plex Mono
- semantic color/type/motion tokens
- icon grid 규칙
- 44px touch target
- subtle reveal
- READ→TRY→MAKE→SHARE→REUSE active bracket

### Phase 2 — 실제 자산 확보 후
- Project screenshot
- Gallery screenshot
- Browser / Phone mockup frame
- 짧은 UI recording loop

### Phase 3 — 필요할 때만
- line diagram / process illustration
- 3D asset

3D와 장식 일러스트는 “트렌드 반영”을 이유로 추가하지 않는다.
