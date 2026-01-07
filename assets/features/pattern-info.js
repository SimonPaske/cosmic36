import { PATTERN_INFO } from "../infoContent.js";
import { $ } from "../ui/dom.js";
import { openTooltip, closeTooltip } from "../ui/tooltip.js";

export function initPatternInfo() {
  const patternInfoBtn = $("patternInfoBtn");
  if (!patternInfoBtn) return;

  patternInfoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (document.querySelector(".tooltip")) closeTooltip();
    else openTooltip(patternInfoBtn, PATTERN_INFO);
  });
}
