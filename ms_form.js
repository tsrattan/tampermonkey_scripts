// ==UserScript==
// @name         Microsoft Forms Auto Fill Yes + SYD27
// @namespace    tampermonkey-msforms-autofill
// @version      2.0
// @description  Auto-selects Yes and SYD27 on Microsoft Forms, but lets you override manually.
// @match        https://forms.office.com/*
// @match        https://*.office.com/*
// @match        https://forms.cloud.microsoft/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    choiceAnswers: ['Yes', 'SYD27'],

    textAnswers: [
      {
        questionMatches: /\b(site|station|location|facility|building|code|depot)\b/i,
        value: 'SYD27'
      },
      {
        questionMatches: /\b(confirm|agree|accept|available|attend|acknowledge)\b/i,
        value: 'Yes'
      }
    ],

    scanDelayMs: 700,
    maxScans: 40
  };

  let scanCount = 0;
  let scriptChanging = false;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function normalise(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sameText(a, b) {
    return normalise(a).toLowerCase() === normalise(b).toLowerCase();
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  function getText(el) {
    if (!el) return '';
    return normalise(
      el.innerText ||
      el.textContent ||
      el.value ||
      el.getAttribute('aria-label') ||
      ''
    );
  }

  function getQuestion(el) {
    return el.closest(
      '[data-automation-id="questionItem"], [data-testid="question-item"], div[role="group"], .office-form-question-content'
    );
  }

  function markUserEdited(target) {
    if (scriptChanging) return;

    const question = getQuestion(target);
    if (question) {
      question.dataset.userEdited = '1';
    }
  }

  document.addEventListener('click', e => markUserEdited(e.target), true);
  document.addEventListener('input', e => markUserEdited(e.target), true);
  document.addEventListener('change', e => markUserEdited(e.target), true);

  function questionBlocks() {
    let blocks = Array.from(document.querySelectorAll(
      '[data-automation-id="questionItem"], [data-testid="question-item"], div[role="group"]'
    )).filter(isVisible);

    if (!blocks.length) {
      const controls = Array.from(document.querySelectorAll(
        'input, textarea, [role="radio"], [role="checkbox"], [role="combobox"], button[aria-haspopup="listbox"]'
      ));

      blocks = Array.from(new Set(
        controls
          .map(el => getQuestion(el) || el.closest('div'))
          .filter(Boolean)
          .filter(isVisible)
      ));
    }

    return blocks;
  }

  function hasChoiceAnswered(question) {
    return Boolean(
      question.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked, [role="radio"][aria-checked="true"], [role="checkbox"][aria-checked="true"]')
    );
  }

  function dropdownLooksAnswered(control) {
    const text = getText(control);

    if (!text) return false;

    return !/select|choose|answer|dropdown|required/i.test(text) && text.length < 80;
  }

  function clickElement(el) {
    scriptChanging = true;
    try {
      el.click();
    } finally {
      setTimeout(() => {
        scriptChanging = false;
      }, 200);
    }
  }

  function clickChoice(question, answerText) {
    if (hasChoiceAnswered(question)) return false;

    const candidates = Array.from(question.querySelectorAll(
      '[role="radio"], [role="checkbox"], label, [data-automation-id*="choice"], div, span'
    )).filter(isVisible);

    for (const candidate of candidates) {
      const text = getText(candidate);

      if (!sameText(text, answerText)) continue;

      const clickable =
        candidate.closest('[role="radio"], [role="checkbox"], label, button') ||
        candidate;

      clickElement(clickable);
      return true;
    }

    return false;
  }

  async function selectDropdown(question, answerText) {
    const dropdowns = Array.from(question.querySelectorAll(
      '[role="combobox"], button[aria-haspopup="listbox"], [aria-haspopup="listbox"]'
    )).filter(isVisible);

    for (const dropdown of dropdowns) {
      if (dropdownLooksAnswered(dropdown)) continue;

      scriptChanging = true;
      dropdown.click();
      await sleep(250);

      const options = Array.from(document.querySelectorAll(
        '[role="option"], [data-automation-id*="option"], [id*="option"]'
      )).filter(isVisible);

      const option = options.find(opt => sameText(getText(opt), answerText));

      if (option) {
        option.click();
        setTimeout(() => {
          scriptChanging = false;
        }, 300);
        return true;
      }

      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true
        })
      );

      scriptChanging = false;
      await sleep(100);
    }

    return false;
  }

  function setNativeValue(input, value) {
    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    scriptChanging = true;

    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(() => {
      scriptChanging = false;
    }, 200);
  }

  function fillTextInputs(question) {
    const questionText = getText(question);

    const rule = CONFIG.textAnswers.find(item =>
      item.questionMatches.test(questionText)
    );

    if (!rule) return false;

    const inputs = Array.from(question.querySelectorAll('input[type="text"], textarea'))
      .filter(isVisible)
      .filter(input => !input.disabled && !input.readOnly)
      .filter(input => !normalise(input.value));

    if (!inputs.length) return false;

    setNativeValue(inputs[0], rule.value);
    return true;
  }

  async function fillForm() {
    scanCount++;

    const questions = questionBlocks();

    for (const question of questions) {
      if (question.dataset.userEdited === '1') continue;

      let filled = false;

      for (const answer of CONFIG.choiceAnswers) {
        if (clickChoice(question, answer)) {
          filled = true;
          await sleep(150);
          break;
        }

        if (await selectDropdown(question, answer)) {
          filled = true;
          await sleep(150);
          break;
        }
      }

      if (!filled) {
        fillTextInputs(question);
      }
    }

    if (scanCount < CONFIG.maxScans) {
      setTimeout(fillForm, CONFIG.scanDelayMs);
    }
  }

  const observer = new MutationObserver(() => {
    if (scanCount < CONFIG.maxScans) {
      clearTimeout(window.__msFormsAutoFillTimer);
      window.__msFormsAutoFillTimer = setTimeout(fillForm, 400);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  fillForm();
})();
