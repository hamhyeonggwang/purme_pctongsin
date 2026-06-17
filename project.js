/* ============================================================
   PROJECT.BLD  ::  AI 프로젝트 기획서 빌더
   ============================================================ */
(function () {
  "use strict";

  const form = document.getElementById("projectForm");
  const output = document.getElementById("projectOutput");
  if (!form || !output) return;

  function value(id) {
    const el = document.getElementById(id);
    return el && el.value.trim() ? el.value.trim() : "미정";
  }

  function render() {
    const problem = value("projectProblem");
    const user = value("projectUser");
    const data = value("projectData");
    const automation = value("projectAutomation");

    output.textContent = [
      "AI 프로젝트 미니 기획서",
      "",
      "1. 문제 정의",
      `- ${problem}`,
      "",
      "2. 대상 사용자",
      `- ${user}`,
      "",
      "3. 사용할 데이터/자료",
      `- ${data}`,
      "",
      "4. AI 활용 방식",
      `- ${automation}`,
      "",
      "5. MVP 범위",
      "- 입력 화면 1개와 결과 화면 1개로 시작합니다.",
      "- 첫 버전은 복잡한 로그인이나 결제 없이 내부 실습용으로 검증합니다.",
      "- 결과 품질은 운영자가 샘플 5개 이상으로 직접 확인합니다.",
      "",
      "6. 다음 실습 과제",
      "- 좋은 입력 예시와 나쁜 입력 예시를 각각 3개씩 만든다.",
      "- 개인정보 입력 금지 문구를 화면에 배치한다.",
      "- 사용자가 결과를 수정할 수 있는 체크리스트를 추가한다.",
    ].join("\n");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });

  form.addEventListener("input", render);
  render();
})();
