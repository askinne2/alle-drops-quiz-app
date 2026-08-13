/**
 * AlleDrops Purchase Prerequisites gate — D-01 (disable ATC) + D-02 (fail open).
 *
 * Scope discipline: the submit buttons are looked up inside the block's nearest product
 * container, never at document scope. A product page can host more than one product form
 * (quick-add drawers, recommendations), and a document-wide query would disable buttons
 * belonging to products this block says nothing about.
 *
 * Fail-open is deliberate. If Sense renames the submit class, this script must NOT leave a
 * patient unable to buy — it warns for developers and leaves the theme's buttons alone.
 * The compensating control is CI: tests/sense-atc-selector-contract.test.ts fails loudly if
 * the vendored Sense excerpt stops carrying the class this file depends on.
 *
 * Buttons are re-queried on every sync rather than cached. Sense re-renders the buy-buttons
 * region on variant change, so a cached NodeList would point at detached nodes and the
 * replacement button would ship ungated.
 *
 * Ownership marker: this script only ever re-enables a button carrying its own
 * data-prereq-disabled attribute. A button the theme disabled for its own reasons (sold out,
 * unavailable variant) is left alone in both directions — this gate can add a reason to be
 * disabled, never grant availability the theme withheld.
 *
 * Logs are developer-facing only and carry no patient data — a selector-miss message and
 * nothing else.
 */
(function () {
  'use strict';

  var SUBMIT_SELECTOR = '.product-form__submit';
  var SCOPE_SELECTOR = 'product-info, .product, form[action*="/cart/add"]';
  var OWNED = 'prereqDisabled'; // dataset key -> data-prereq-disabled

  function initBlock(root) {
    if (root.dataset.prereqReady === '1') return;
    root.dataset.prereqReady = '1';

    var boxes = root.querySelectorAll('[data-prereq]');
    var helper = root.querySelector('[data-prereq-helper]');
    var scope = root.closest(SCOPE_SELECTOR);

    if (!scope || !scope.querySelectorAll(SUBMIT_SELECTOR).length) {
      // D-02 fail open: confirmations still render, theme buttons are untouched.
      console.warn(
        '[AlleDrops purchase prerequisites] No ' +
          SUBMIT_SELECTOR +
          ' found in the surrounding product form. Add-to-cart gating is disabled for this block; the confirmations still display.'
      );
      return;
    }

    function satisfied() {
      // A credited quiz row ships checked+disabled, which counts as satisfied.
      return Array.prototype.every.call(boxes, function (box) {
        return box.checked === true;
      });
    }

    function sync() {
      var ok = satisfied();
      var submits = scope.querySelectorAll(SUBMIT_SELECTOR);

      Array.prototype.forEach.call(submits, function (btn) {
        var ours = btn.dataset[OWNED] === '1';

        if (ok) {
          if (ours) {
            delete btn.dataset[OWNED];
            btn.disabled = false;
          }
          return;
        }

        if (btn.disabled && !ours) return; // theme-disabled for its own reason
        btn.dataset[OWNED] = '1';
        btn.disabled = true;
      });

      if (helper) {
        if (ok) {
          helper.setAttribute('hidden', '');
        } else {
          helper.removeAttribute('hidden');
        }
      }
    }

    Array.prototype.forEach.call(boxes, function (box) {
      box.addEventListener('change', sync);
    });

    sync();
  }

  function initAll() {
    var roots = document.querySelectorAll('[data-purchase-prerequisites]');
    Array.prototype.forEach.call(roots, initBlock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Theme editor re-renders the section; the fresh root has no prereqReady flag so it re-inits.
  document.addEventListener('shopify:section:load', initAll);
})();
