// ==UserScript==
// @name          MS Forms QA/QC - Prefill + Select YES
// @namespace    http://tampermonkey.net/
// @version      2026-04-26
// @description  QAQC form etc!
// @author       You
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==


(function () {
  'use strict';

  const DATA = {
    supervisor: 'Rattan Tajinder',
    officer: '',
    region: 'APAC',
    site: 'SYD27'
  };

  function fillText(questionText, value) {
    const questions = [...document.querySelectorAll('[data-automation-id="questionItem"]')];

    for (const q of questions) {
      if (q.innerText.toLowerCase().includes(questionText.toLowerCase())) {
        const input = q.querySelector('input[type="text"], input:not([type]), textarea');
        if (input) {
          input.focus();
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.blur();
        }
      }
    }
  }

  function selectDropdown(questionText, optionText) {
    const questions = [...document.querySelectorAll('[data-automation-id="questionItem"]')];

    for (const q of questions) {
      if (q.innerText.toLowerCase().includes(questionText.toLowerCase())) {
        const dropdown = q.querySelector('[role="combobox"], button');
        if (!dropdown) return;

        dropdown.click();

        setTimeout(() => {
          const options = [...document.querySelectorAll('[role="option"], span, div')]
            .filter(el => el.innerText && el.innerText.trim() === optionText);

          if (options.length > 0) {
            options[0].click();
          }
        }, 500);
      }
    }
  }

  function selectAllYesVisible() {
    let count = 0;

    const yesOptions = document.querySelectorAll('[data-automation-value="Yes"]');

    yesOptions.forEach(el => {
      const label = el.closest('label');
      if (label) {
        label.click();
        count++;
      }
    });

    console.log(`Selected YES answers: ${count}`);
  }

  function addButton() {
    if (document.getElementById('qaYesHelperBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'qaYesHelperBtn';
    btn.textContent = 'Fill + Select YES';
    btn.style.position = 'fixed';
    btn.style.top = '15px';
    btn.style.right = '15px';
    btn.style.zIndex = '999999';
    btn.style.padding = '12px 16px';
    btn.style.background = '#0078d4';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';

    btn.onclick = () => {
      runHelper();
      alert('Done. YES selected where visible. Review before submitting.');
    };

    document.body.appendChild(btn);
  }

  function runHelper() {
    fillText('Screening Supervisor name', DATA.supervisor);
    fillText('Screening Officer name', DATA.officer);

    selectDropdown('Region', DATA.region);

    setTimeout(() => {
      selectDropdown('Site Acronym', DATA.site);
    }, 800);

    setTimeout(() => {
      selectAllYesVisible();
    }, 1500);
  }

  // Auto run once
  setTimeout(runHelper, 3000);

  // Add manual button
  setTimeout(addButton, 3000);

})();
