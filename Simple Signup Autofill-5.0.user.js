// ==UserScript==
// @name         Simple Signup Autofill
// @namespace    local
// @version      5.0
// @description  Autofill signup/contact
// @match        https://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const PROFILE = {
    firstName: 'Tajinder',
    middleName: 'Singh',
    lastName: 'Rattan',
    email: 'tsrattan@gmail.com',
    phone: '0490089704',
    suburb: 'Glendenning',
    postcode: '2761',
    stateShort: 'NSW',
    stateLong: 'New South Wales',
    country: 'Australia'
  };

  const RULES = [
    [/first\s*name|given\s*name/i, PROFILE.firstName],
    [/middle\s*name/i, PROFILE.middleName],
    [/last\s*name|surname|family\s*name/i, PROFILE.lastName],
    [/company\s*name|company|business/i, PROFILE.company],
    [/position|job\s*title|role/i, PROFILE.position],
    [/email\s*address|email|e-mail/i, PROFILE.email],
    [/telephone|phone|mobile|contact/i, PROFILE.phone],
    [/address|street/i, PROFILE.address],
    [/suburb|town|city/i, PROFILE.suburb],
    [/postcode|postal|zip/i, PROFILE.postcode],
    [/country/i, PROFILE.country],
    [/state|province|region/i, PROFILE.stateShort]
  ];

  function cleanText(text) {
    return (text || '')
      .replace(/\*/g, '')
      .replace(/error:.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function setValue(el, value) {
    if (!value || el.disabled || el.readOnly) return false;
    if (el.value && el.value.trim() !== '') return false;

    const proto = el.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    el.focus();
    setter ? setter.call(el, value) : (el.value = value);

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    el.blur();

    return true;
  }

  function getFieldText(el) {
    let parts = [
      el.name,
      el.id,
      el.placeholder,
      el.autocomplete,
      el.getAttribute('aria-label'),
      el.getAttribute('data-testid')
    ];

    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) parts.push(label.innerText);
    }

    const labelParent = el.closest('label');
    if (labelParent) parts.push(labelParent.innerText);

    const parent = el.parentElement;
    if (parent) {
      parent.querySelectorAll('label, span, div').forEach(item => {
        const txt = cleanText(item.innerText);
        if (txt.length > 0 && txt.length < 80) parts.push(txt);
      });
    }

    return cleanText(parts.filter(Boolean).join(' '));
  }

  function fillTextFields() {
    let count = 0;

    const fields = [...document.querySelectorAll('input, textarea')].filter(el => {
      const type = (el.type || '').toLowerCase();
      const r = el.getBoundingClientRect();

      return r.width > 0 &&
        r.height > 0 &&
        !['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'password'].includes(type);
    });

    for (const field of fields) {
      const text = getFieldText(field);

      for (const [regex, value] of RULES) {
        if (regex.test(text)) {
          if (setValue(field, value)) count++;
          break;
        }
      }
    }

    return count;
  }

  function selectOption(select, wantedValues) {
    const options = [...select.options];

    const found = options.find(opt => {
      const text = cleanText(opt.textContent).toLowerCase();
      const value = cleanText(opt.value).toLowerCase();

      return wantedValues.some(wanted => {
        wanted = wanted.toLowerCase();
        return text === wanted || value === wanted || text.includes(wanted);
      });
    });

    if (!found) return false;

    select.value = found.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  }

  function fillDropdowns() {
    let count = 0;

    const selects = [...document.querySelectorAll('select')].filter(select => {
      const r = select.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !select.disabled;
    });

    for (const select of selects) {
      const text = getFieldText(select).toLowerCase();

      if (/state|province|region/.test(text)) {
        if (selectOption(select, [PROFILE.stateShort, PROFILE.stateLong, 'new south wales'])) count++;
      }

      if (/country/.test(text)) {
        if (selectOption(select, [PROFILE.country, 'AU', 'Australia'])) count++;
      }
    }

    return count;
  }

  function autofill() {
    const textCount = fillTextFields();
    const dropdownCount = fillDropdowns();

    alert(`Autofill done: ${textCount} fields and ${dropdownCount} dropdowns filled. Review before submitting.`);
  }

  function addButton() {
    if (document.getElementById('simpleAutofillBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'simpleAutofillBtn';
    btn.type = 'button';
    btn.textContent = 'Autofill Form';

    Object.assign(btn.style, {
      position: 'fixed',
      top: '15px',
      right: '15px',
      zIndex: '2147483647',
      padding: '12px 16px',
      background: '#0078d4',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer'
    });

    btn.addEventListener('click', autofill);
    document.body.appendChild(btn);
  }

  setInterval(addButton, 1000);

})();