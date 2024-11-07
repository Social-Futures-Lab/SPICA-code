'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'dfc',], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports, require('dfc'));
  } else {
    factory((root.accordionPage = {}), root.dfc);
  }
}(typeof self !== 'undefined' ? self : this, function (exports, _) {

  function AccordionPage () {
    this._pages = {};
    this._openPages = [];
  }

  AccordionPage.prototype.addPage = function (pageName, sectionDom) {
    this._pages[pageName] = sectionDom;
    // ensure that the section is closed on add
    sectionDom.classList.add('closed');
  }

  AccordionPage.prototype.unfoldTo = function (targetPages) {
    return new Promise((function (resolve, reject) {
      this._openPages = []; // All the pages are closed
      for (var pageName in this._pages) {
        if ((Array.isArray(targetPages) && targetPages.indexOf(pageName) >= 0) ||
          (typeof targetPages === 'string' && pageName === targetPage)) {

          this._pages[pageName].classList.remove('closed');
          this._openPages.push(pageName);
        } else {
          this._pages[pageName].classList.add('closed');
        }
      }
      return resolve();
    }).bind(this));
  }

  AccordionPage.prototype.open = function(pageName) {
    return new Promise((function (resolve, reject) {
      if (!(pagename in this._pages)) {
        return reject(new Error('Page ' + pageName + ' not managed by this accordion!'));
      }
      if (this._openPages.indexOf(pageName) >= 0) {
        return resolve(); // already open
      }
      this._pages[pageName].classList.remove('closed');
      this._openPages.push(pageName);
      return resolve();
    }).bind(this));
  }

  AccordionPage.prototype.close = function(pageName) {
    return new Promise((function (resolve, reject) {
      if (!(pagename in this._pages)) {
        return reject(new Error('Page ' + pageName + ' not managed by this accordion!'));
      }
      if (this._openPages.indexOf(pageName) < 0) {
        return resolve(); // not open
      }
      this._pages[pageName].classList.add('closed');
      this._openPages.splice(this._openPages.indexOf(pageName), 1);
      return resolve();
    }).bind(this));
  }

  exports.AccordionPage = AccordionPage;
}));
