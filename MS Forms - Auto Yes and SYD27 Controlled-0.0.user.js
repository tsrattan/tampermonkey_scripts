// ==UserScript==
// @name         MS Forms - Auto Yes and SYD27 Controlled
// @match        https://forms.office.com/Pages/ResponsePage.aspx*
// @match        https://forms.office.com/*
// @run-at       document-idle
// @all-frames   true
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  console.log("MS Forms autofill running");

  const TARGET_DROPDOWN = "SYD27";
  const completedQuestions = new WeakSet();

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function clickNoScroll(el) {
    if (!el) return;
    el.click();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getQuestions() {
    return [...document.querySelectorAll('[data-automation-id*="question"], [role="group"]')]
      .filter(q => q.innerText && q.innerText.trim().length > 0);
  }

  async function selectSYD27Dropdowns() {
    const questions = getQuestions();

    for (const question of questions) {
      if (completedQuestions.has(question)) continue;

      const text = question.innerText.toUpperCase();

      // Skip if SYD27 already visible in this question
      if (text.includes(TARGET_DROPDOWN)) {
        completedQuestions.add(question);
        continue;
      }

      const dropdown =
        question.querySelector('[role="combobox"]') ||
        question.querySelector('button[aria-haspopup="listbox"]') ||
        question.querySelector('button') ||
        question.querySelector('div[aria-haspopup="listbox"]');

      if (!dropdown) continue;

      clickNoScroll(dropdown);
      await sleep(400);

      const options = [...document.querySelectorAll('[role="option"], button, span, div')];

      const syd27Option = options.find(opt =>
        (opt.innerText || "").trim().toUpperCase() === TARGET_DROPDOWN
      );

      if (syd27Option) {
        clickNoScroll(syd27Option);
        completedQuestions.add(question);
        await sleep(300);
      } else {
        // Close dropdown if wrong one opened
        document.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true
        }));
        await sleep(200);
      }
    }
  }

  function selectYesRadios() {
    const questions = getQuestions();

    questions.forEach(question => {
      if (completedQuestions.has(question)) return;

      const alreadyChecked = question.querySelector(
        '[role="radio"][aria-checked="true"], input[type="radio"]:checked'
      );

      if (alreadyChecked) return;

      const yesOption = [...question.querySelectorAll('[role="radio"], label, span, div')]
        .find(el => (el.innerText || "").trim().toLowerCase() === "yes");

      if (!yesOption) return;

      const clickable =
        yesOption.closest('[role="radio"]') ||
        yesOption.closest('label') ||
        yesOption.parentElement;

      clickNoScroll(clickable);
      completedQuestions.add(question);
    });
  }

  async function runAutofill() {
    await sleep(1200);

    // Dropdown first, so the first SYD27 question is not missed
    await selectSYD27Dropdowns();

    // Then yes/no questions
    selectYesRadios();

    // One second pass for lazy-loaded fields
    await sleep(1200);
    await selectSYD27Dropdowns();
    selectYesRadios();

    console.log("MS Forms autofill finished");
  }

  runAutofill();
})();