export const issue = {
  number: 1,
  label: "ISSUE 001",
  period: "OCT 19 — OCT 25, 2026",
};

export const news = [
  {
    id: "news-001",
    rank: "01",
    category: "OPENAI",
    date: "OCT 16",
    title: "ChatGPT 안에서 프레젠테이션을 만들고 함께 편집한다",
    summary:
      "ChatGPT Slides가 대화·파일·개요에서 슬라이드를 만들고 협업 편집과 내보내기까지 지원하기 시작했다.",
    comment: "생성에서 끝나는 기능보다, 실제 산출물 편집 흐름 안으로 들어오는 변화가 더 중요하다.",
    posterWord: "SLIDES",
    source: "OpenAI",
    sourceUrl: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
    featured: true,
  },
  {
    id: "news-002",
    rank: "02",
    category: "GOOGLE",
    date: "OCT 13",
    title: "Gemini 4 Argon, Gemini 앱으로 들어오다",
    summary:
      "복잡한 작업을 위한 추론 성능과 코딩 경험을 강화하고, 채팅에서 작업 실행으로 이어지는 흐름을 확대했다.",
    comment: "AI 인터페이스의 경쟁이 답변 품질에서 작업 실행의 연속성으로 이동하고 있다.",
    posterWord: "ARGON",
    source: "Google",
    sourceUrl:
      "https://blog.google/innovation-and-ai/products/gemini-app/gemini-4-argon-availability/",
    featured: false,
  },
  {
    id: "news-003",
    rank: "03",
    category: "INDUSTRY",
    date: "OCT 12",
    title: "Microsoft, Azure Maia를 대규모 AI 추론 인프라로 확대",
    summary:
      "Maia 200을 실제 서비스에 투입하고 2027년부터 멀티 기가와트 규모 배치를 추진한다.",
    comment: "모델 경쟁 뒤에는 결국 누가 추론 비용과 인프라를 통제하는가라는 문제가 남는다.",
    posterWord: "MAIA",
    source: "Microsoft",
    sourceUrl:
      "https://blogs.microsoft.com/blog/2026/10/12/microsoft-to-expand-azure-maia-system-to-multi-gigawatt-deployments/",
    featured: false,
  },
  {
    id: "news-004",
    rank: "04",
    category: "ANTHROPIC",
    date: "OCT 07",
    title: "Claude Haiku 5.5, 빠르고 반복적인 작업을 겨냥하다",
    summary:
      "요약·분류·데이터베이스 질의처럼 대량으로 반복되는 작업을 위한 소형 모델 전략을 강화했다.",
    comment: "모든 업무에 가장 큰 모델을 쓰는 방식보다 역할별 모델 조합이 더 현실적인 운영 전략이 된다.",
    posterWord: "HAIKU",
    source: "Anthropic",
    sourceUrl: "https://www.anthropic.com/claude-haiku-5-5",
    featured: false,
  },
  {
    id: "news-005",
    rank: "05",
    category: "TOOLS",
    date: "SEP 23",
    title: "Gemini Connected Apps, AI가 여러 업무 도구 사이를 오간다",
    summary:
      "Airtable, Linear, Adobe, Webflow 등 외부 서비스를 Gemini 안에서 연결해 사용하는 범위가 확대됐다.",
    comment: "좋은 AI 도구의 기준이 단일 기능보다 기존 업무도구와 얼마나 자연스럽게 연결되는지로 바뀌고 있다.",
    posterWord: "TOOLS",
    source: "Google",
    sourceUrl:
      "https://blog.google/innovation-and-ai/products/gemini-app/new-connected-apps-gemini/",
    featured: false,
  },
];

export const projects = [
  {
    id: "project-001",
    number: "PROJECT 001",
    title: "진짜 쓰는 AI",
    summary: "아이디어가 아니라 실제 업무에서 사용할 수 있는 결과물을 만드는 프로젝트.",
    status: "RECRUITING",
    members: 4,
    capacity: 6,
    posterWord: "REAL",
  },
  {
    id: "project-002",
    number: "PROJECT 002",
    title: "1인 AI 미션",
    summary: "혼자 시작하고 짧게 완성하는 작은 AI 활용 실험.",
    status: "RECRUITING",
    members: 2,
    capacity: null,
    posterWord: "SOLO",
  },
];

export const selectedWork = {
  number: "SELECTED WORK 001",
  title: "업무에 남는 결과물을 만든다",
  summary:
    "현재 보유한 실제 프로젝트 결과물로 교체하기 위한 Seed 영역입니다. 구조와 화면 밀도 검증 후 실제 스크린샷과 링크를 연결합니다.",
  posterWord: "WORK",
  placeholder: true,
};

export const archiveCategories = [
  { number: "01", title: "AI 시작하기", count: 0 },
  { number: "02", title: "업무 활용", count: 0 },
  { number: "03", title: "자동화", count: 0 },
  { number: "04", title: "만들기", count: 0 },
  { number: "05", title: "교육자료", count: 0 },
  { number: "06", title: "PC통신 자료", count: 0 },
];

export const gallerySeed = [
  { id: 1, label: "RESULT 01", word: "BUILD", size: "large" },
  { id: 2, label: "RESULT 02", word: "SHIP", size: "tall" },
  { id: 3, label: "RESULT 03", word: "USE", size: "medium" },
  { id: 4, label: "RESULT 04", word: "TEST", size: "small" },
  { id: 5, label: "RESULT 05", word: "SHARE", size: "small" },
];
