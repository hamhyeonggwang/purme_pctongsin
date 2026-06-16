# PC-TONGSIN :: 푸르메클럽 AI 활용 동호회

1980~90년대 **PC통신 BBS** 감성을 그대로 옮긴 동호회 소개 홈페이지입니다.
순수 HTML/CSS/JS로 만들어 별도 빌드 없이 정적 호스팅(Vercel)에 바로 배포됩니다.

## 구성

| 파일 | 설명 |
|---|---|
| `index.html` | 원페이지 BBS 구조 (부팅 → HERO → ABOUT → WE CONNECT → 활동/모임/가입 → PLAY) |
| `styles.css` | 레트로 디자인 시스템 (네이비 + 시안, CRT 스캔라인, 픽셀 폰트) |
| `script.js` | 부팅 시퀀스 / 실시간 시계 / 메뉴·단축키 네비게이션 |
| `game.js` | `[ PLAY ]` 메뉴의 레트로 팩맨 게임(PURME-MAN) |

## 로컬 미리보기

```bash
npx http-server . -p 8777 -c-1
# http://127.0.0.1:8777
```

## Vercel 배포

빌드 과정이 없는 정적 사이트입니다. Vercel에서 GitHub 저장소를 Import 하면
- **Framework Preset:** Other
- **Build Command:** (비움)
- **Output Directory:** `.` (루트)

설정으로 자동 배포됩니다. `vercel.json`에 기본 옵션(cleanUrls 등)이 포함되어 있습니다.
