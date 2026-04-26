// ==UserScript==
// @name         Generic Signup Form Autofill Helper
// @namespace    local
// @version      1.0
// @description  Autofill common signup fields. Review before submitting.
// @match        http://*/*
// @match        https://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // EDIT THESE DETAILS
  const PROFILE = {
    firstName: 'Tajinder',
    middleName: 'Singh',
    lastName: 'Rattan
    fullName: 'Tajinder Singh Rattan',
    email: 'tsrattan@gmail.com',
    mobile: '0490089704',
    phone: '0490089704',

    address1: '14 Winten Drive',
    address2: '',
    suburb: 'Glendenning',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2761',
    country: 'Australia',

    dob: '23/10/1974', // example: 01/01/1990
  };

  const FIELD_MAP = [
    { keys: ['first name', 'firstname', 'given name', 'fname'], value: PROFILE.firstName },
    { keys: ['middle name', 'middlename', 'mname'], value: PROFILE.middleName },
    { keys: ['last name', 'lastname', 'surname', 'family name', 'lname'], value: PROFILE.lastName },
    { keys: ['full name', 'name'], value: PROFILE.fullName },

    { keys: ['email', 'e-mail'], value: PROFILE.email },
    { keys: ['mobile', 'mobile number', 'cell', 'cellphone'], value: PROFILE.mobile },
    { keys: ['phone', 'telephone', 'contact number'], value: PROFILE.phone },

    { keys: ['address line 1', 'address1', 'street address', 'street'], value: PROFILE.address1 },
    { keys: ['address line 2', 'address2', 'unit', 'apartment'], value: PROFILE.address2 },
    { keys: ['suburb', 'town'], value: PROFILE.suburb },
    { keys: ['city'], value: PROFILE.city },
    { keys: ['state', 'province', 'region'], value: PROFILE.state },
    { keys: ['postcode', 'postal code', 'zip', 'zipcode'], value: PROFILE.postcode },
    { keys: ['country'], value: PROFILE.country },

    { keys: ['date of birth', 'dob', 'birth date'], value: PROFILE.dob },
  ];

  function textForInput(input) {
    const parts = [
      input.name,
      input.id,
      input.placeholder,
      input.autocomplete,
      input.getAttribute('aria-label'),
      input.getAttribute('data-testid'),
      input.closest('label')?.innerText,
      document.querySelector(`label[for="${input.id}"]`)?.innerText,
      input.parentElement?.innerText
    ];

    return parts
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function setValue(input, value) {
    if (!value) return;

    input.focus();

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (input.tagName === 'TEXTAREA' && nativeTextAreaSetter) {
      nativeTextAreaSetter.call(input, value);
    } else if (nativeSetter) {
      nativeSetter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }

  function fillInputs() {
    const inputs = [...document.querySelectorAll('input, textarea')]
      .filter(input => {
        const type = (input.type || '').toLowerCase();
        return !['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'password'].includes(type);
      });

    let filled = 0;

    for (const input of inputs) {
      const text = textForInput(input);

      for (const field of FIELD_MAP) {
        if (field.keys.some(key => text.includes(key))) {
          setValue(input, field.value);
          filled++;
          break;
        }
      }
    }

    console.log(`Autofill helper filled ${filled} fields`);
  }

  function selectDropdowns() {
    const selects = [...document.querySelectorAll('select')];

    for (const select of selects) {
      const text = textForInput(select);
      let wanted = '';

      if (text.includes('state') || text.includes('province')) wanted = PROFILE.state;
      if (text.includes('country')) wanted = PROFILE.country;

      if (!wanted) continue;

      const option = [...select.options].find(opt =>
        opt.text.trim().toLowerCase() === wanted.toLowerCase() ||
        opt.value.trim().toLowerCase() === wanted.toLowerCase()
      );

      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function runAutofill() {
    fillInputs();
    selectDropdowns();
    alert('Autofill complete. Review all fields before submitting.');
  }

  function addButton() {
    if (document.getElementById('signupAutofillBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'signupAutofillBtn';
    btn.textContent = 'Autofill Signup';
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

    btn.onclick = runAutofill;

    document.body.appendChild(btn);
  }

  setTimeout(addButton, 1500);

})();
