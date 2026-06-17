# PC-TONGSIN :: 푸르메클럽 AI 활용 동호회

1980~90년대 **PC통신 BBS** 감성을 그대로 옮긴 동호회 소개 홈페이지입니다.
순수 HTML/CSS/JS로 만들어 별도 빌드 없이 정적 호스팅(Vercel)에 바로 배포됩니다.

## 사이트 구조

| URL | 파일 | 설명 |
|---|---|---|
| `/` | `index.html` | 메인 BBS (소개 · 활동 · 가입 CTA · PLAY 티저) |
| `/curriculum` | `curriculum.html` | 6개월 AI 교육 과정 (EDUCATION.SYS) |
| `/play` | `play.html` | PURME-MAN 팩맨 + 레트로 테트리스 + 갤러그풍 슈팅 + 알카노이드 벽돌깨기 |
| `/joinin` | `joinin.html` | `[ JOIN IN ]` 가입 신청 설문 (Supabase) |

### 공통 메뉴

| 키 | 메뉴 | 이동 |
|---|---|---|
| 1 | MAIN | `index#hero` |
| 2 | BOARD | `index#activities` |
| 3 | LEARN | `curriculum` |
| 4 | JOIN IN | `joinin` |
| 5 | PLAY | `play` |

## 구성

| 파일 | 설명 |
|---|---|
| `styles.css` | 레트로 디자인 시스템 (네이비 + 시안, CRT 스캔라인, 픽셀 폰트) |
| `script.js` | 부팅 시퀀스 / 실시간 시계 / 메뉴·단축키 네비게이션 |
| `curriculum.js` | 교육 과정 터미널 UI |
| `play.js` | 게임 탭 전환 |
| `arcade.js` | 공통 효과음 / 닉네임 / Supabase HIGH SCORE 랭킹 |
| `game.js` | PURME-MAN 팩맨 (`play.html`) |
| `tetris.js` | 테트리스 (`play.html`) |
| `galaga.js` | 갤러그풍 슈팅 (`play.html`) |
| `arkanoid.js` | 알카노이드 벽돌깨기 (`play.html`) |
| `supabase_setup.sql` | 가입 신청 및 게임 랭킹 DB 스키마 |

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
