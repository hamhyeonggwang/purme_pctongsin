/* ============================================================
   LAB.EXE  ::  프롬프트 실습 시뮬레이터
   ============================================================ */
(function () {
  "use strict";

  const inputEl = document.getElementById("labInput");
  const outputEl = document.getElementById("labOutput");
  const templateEl = document.getElementById("labTemplate");
  const buttons = document.querySelectorAll("[data-lab-mode]");

  if (!inputEl || !outputEl || !buttons.length) return;

  const TEMPLATES = {
    report: [
      "역할: 실무 보고서 작성 코치",
      "목표: 메모를 상신 가능한 보고서 초안으로 변환",
      "형식: 제목, 배경, 목표, 실행계획, 요청사항",
      "톤: 간결하고 공식적인 문체",
    ],
    minutes: [
      "역할: 회의록 정리 담당자",
      "목표: 흩어진 메모에서 결정사항과 할 일을 추출",
      "형식: 논의내용, 결정사항, Action Item, 다음 확인",
      "톤: 명확하고 추적 가능한 문체",
    ],
    message: [
      "역할: 커뮤니티 운영진",
      "목표: 참여를 독려하는 안내 메시지 작성",
      "형식: 인사, 핵심 안내, 참여 이유, 신청 안내",
      "톤: 따뜻하고 부담 없는 문체",
    ],
    research: [
      "역할: 리서치 플래너",
      "목표: 실행 전 확인해야 할 질문과 자료를 정리",
      "형식: 핵심 질문, 찾아볼 자료, 비교 기준, 다음 단계",
      "톤: 탐색적이고 구조적인 문체",
    ],
  };

  function cleanMemo() {
    return inputEl.value.trim() || "입력된 메모가 없습니다.";
  }

  function bulletize(text) {
    return text
      .split(/[.。!\n]/)
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  function render(mode) {
    const memo = cleanMemo();
    const bullets = bulletize(memo);
    const first = bullets[0] || memo;

    const outputs = {
      report: [
        "제목: AI 동호회 오리엔테이션 운영 계획",
        "",
        "1. 배경",
        "- " + first,
        "",
        "2. 목표",
        "- AI 초보자도 부담 없이 참여할 수 있는 첫 경험을 설계합니다.",
        "- 실습 예시를 통해 동호회의 교육 방향을 직관적으로 보여줍니다.",
        "",
        "3. 실행 계획",
        ...bullets.map((b) => "- " + b),
        "",
        "4. 요청 사항",
        "- 일정, 신청 안내, 개인정보 주의사항을 사전에 확정합니다.",
      ],
      minutes: [
        "회의록 요약",
        "",
        "논의 내용",
        ...bullets.map((b) => "- " + b),
        "",
        "결정 사항",
        "- 오리엔테이션은 AI 초보자 기준으로 구성합니다.",
        "- 실습 예시와 신청 안내를 함께 제공합니다.",
        "",
        "Action Item",
        "- 운영진: 일정과 장소 확정",
        "- 담당자: 실습 예시와 안내 문구 준비",
        "- 전체: 개인정보 입력 주의사항 검토",
      ],
      message: [
        "안녕하세요, 푸르메클럽 AI 활용 동호회입니다.",
        "",
        "AI가 처음이어도 괜찮습니다. 이번 오리엔테이션에서는 실제 업무에 바로 써볼 수 있는 간단한 AI 활용 예시를 함께 살펴봅니다.",
        "",
        "주요 내용",
        ...bullets.map((b) => "- " + b),
        "",
        "관심 있는 분들은 가입 신청서를 남겨주세요. 자세한 일정은 확정되는 대로 안내드리겠습니다.",
      ],
      research: [
        "리서치 플랜",
        "",
        "핵심 질문",
        "- 참여자가 가장 궁금해하는 AI 활용 사례는 무엇인가?",
        "- 초보자가 부담 없이 따라 할 수 있는 실습은 무엇인가?",
        "- 개인정보와 민감정보를 어떻게 안내해야 하는가?",
        "",
        "확인할 자료",
        ...bullets.map((b) => "- " + b),
        "",
        "다음 단계",
        "- 실습 주제 3개 선정",
        "- 안내 메시지 초안 작성",
        "- 신청 데이터로 관심 주제 확인",
      ],
    };

    if (templateEl) templateEl.textContent = TEMPLATES[mode].join("\n");
    outputEl.textContent = outputs[mode].join("\n");
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => render(button.getAttribute("data-lab-mode")));
  });

  render("report");
})();
