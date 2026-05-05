// ==UserScript==
// @name         Auto Fill & Select Options
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatically fill input and select dropdown options
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function setReactInput(i, v) {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        s.call(i, v);
        i.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function waitFor(selector, test = () => true, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const id = setInterval(() => {
                const el = [...document.querySelectorAll(selector)].find(test);
                if (el) { clearInterval(id); resolve(el); }
                else if (Date.now() - start > timeout) {
                    clearInterval(id);
                    reject(new Error("Timeout: " + selector));
                }
            }, 100);
        });
    }

    async function run() {
        // Fill text input
        const input = await waitFor('input[placeholder="Enter your answer"]');
        setReactInput(input, "Rattan Tajinder");

        // Open first dropdown, select APAC
        const dd1 = document.querySelectorAll("div[aria-haspopup='listbox']")[0];
        dd1.click();
        const opt1 = await waitFor("div[role='option'] span[aria-label]", e => e.getAttribute("aria-label") === "APAC");
        opt1.click();

        // Wait for form to refresh — poll until second dropdown is ready
        // (listbox disappears = form is resetting, so we wait for it to be gone first)
        await new Promise(r => setTimeout(r, 200)); // brief pause before checking
        await waitFor("div[role='listbox']", () => false, 1000).catch(() => {}); // wait for listbox to close

        // Now poll until second dropdown appears and is clickable
        const dd2 = await waitFor("div[aria-haspopup='listbox']", (_, i, all) => all.indexOf(_) === 1);
        dd2.click();

        // Wait for SYD27 in the refreshed list
        const opt2 = await waitFor("div[role='option'] span[aria-label]", e => e.getAttribute("aria-label") === "SYD27", 6000);
        opt2.click();

        alert("Done: APAC + SYD27 + Rattan Tajinder");
    }

    run().catch(err => alert("Error: " + err.message));
})();
