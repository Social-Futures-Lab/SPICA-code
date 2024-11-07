'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'dfc'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports, require('dfc'));
  } else {
    factory((root.choiceList = {}), root.dfc);
  }
}(typeof self !== 'undefined' ? self : this, function (exports, _) {

  function ChoiceButton (parent, value, shortcut, label, hideLabel) {
    this._parent = parent;
    this.dom = null;

    this._value = value;
    this._shortcut = shortcut;
    this._label = label;
    this._hideLabel = hideLabel

    this.bind();
  }

  ChoiceButton.prototype.bind = function () {
    if (this.dom === null) {
      this.dom = _('div', {
        'className': 'btn',
        'value': this._value,
      });
      if (this._shortcut !== null && this._shortcut.length > 0) {
        this.dom.appendChild(_('div', {'className': 'badge'}, _('', this._shortcut)))
      }
      if (this._label !== null) {
        this.dom.appendChild(_('span', {'className': this._hideLabel ? 'hide-until-active' : ''},
          [' ', this._label]))
      }

      if (this._value === null) {
        this._parent.confirmationContainer.appendChild(this.dom);
      } else {
        this._parent.choicesContainer.appendChild(this.dom);
        this._parent.choicesContainer.appendChild(document.createTextNode(' '));
      }

      this.dom.addEventListener('mousedown', (function (e) {
        if (e.button !== 0) {
          return;
        }
        this.click();
      }).bind(this));
    }
  };

  ChoiceButton.prototype.click = function () {
    if (this._value === null) {
      // is a confirmation button that does not invoke a pick action
      this._parent.onConfirm();
      return;
    }
    if (this.isActive()) {
      if (this._parent !== null) {
        this._parent.pick(null); // unpick it in the parent too
      }
    } else {
      this._parent.pick(this._value);
    }
  }

  ChoiceButton.prototype.setActive = function (isActive) {
    if (isActive) {
      this.dom.classList.add('active');
    } else {
      this.dom.classList.remove('active');
    }
  }

  ChoiceButton.prototype.isActive = function () {
    return this.dom.classList.contains('active');
  }

  function ChoiceList (dom, choices, confirmation) {
    this.dom = dom;
    this.choicesContainer = _('div', {'className': 'choice-list'});
    this.confirmationContainer = _('div', {'className': 'choice-list'});
    this.choices = this._build(choices);

    this.confirm = (typeof confirmation === 'string') ?
      new ChoiceButton(this, null, 'Enter', confirmation, false) : null;

    this.selected = null;
    this.confirmed = false;

    // Animation related items
    this._shakeTimer = null;

    this._promises = [];

    // Add the confirmation trigger if there is a confirm button
    this.dom.innerHTML = '';
    this.dom.appendChild(this.choicesContainer);
    this.dom.appendChild(this.confirmationContainer);
    if (this.choices.length > 0) {
      this.confirmationContainer.style.display = 'none';
    }
  }

  ChoiceList.prototype._handleKeyDown = function (e) {
    if (e.key === 'Escape') {
      this.reset();
    } else if (e.key === 'Enter') {
      this.onConfirm();
    } else if (this.hasOption(e.key)) {
      this.pick(e.key);
    }
  }

  ChoiceList.prototype._build = function (choices) {
    var choiceButtons = choices.map((function (choice, i) {
      return new ChoiceButton(this, choice.value, choice.shortcut, choice.label, choice.hideLabel === true);
    }).bind(this));

    // Bind keyboard shortcuts too!
    this._keyDownListener = this._handleKeyDown.bind(this);
    window.addEventListener('keydown', this._keyDownListener);

    return choiceButtons;
  }

  ChoiceList.prototype.hasOption = function (value) {
    return this.choices.some(function (choice) { return choice._value === value; });
  }

  ChoiceList.prototype.reset = function () {
    this.selected = null;
    this.choices.forEach(function (choice) {
      choice.setActive(false);
    });
    // hide the confirmation
    if (this.confirm) {
      this.confirmationContainer.style.display = 'none';
    }
  }

  ChoiceList.prototype.pick = function (value) {
    if (!this.hasOption(value)) {
      this.reset();
      this.triggerTest();
    } else {
      this.choices.forEach(function (choice) {
        if (choice._value === value) {
          choice.setActive(true);
        } else {
          choice.setActive(false);
        }
      });
      this.selected = value;
      this.confirmationContainer.style.display = '';
      this.triggerTest();
    }
  }

  ChoiceList.prototype.onConfirm = function () {
    // Check if we can even confirm
    if (this.selected !== null || this.choices.length === 0) {
      this.confirmed = true;

      if (this.confirm !== null) {
        this.confirm.setActive(true);
      }
      console.log('Confirmed!');
      this.triggerTest();
    } else {
      // Cannot confirm, shake!
      this.shake();
    }
  }

  ChoiceList.prototype.triggerTest = function () {
    this._promises.slice(0).forEach(function (trigger) {
      trigger();
    });
  }

  ChoiceList.prototype.shake = function () {
    if (this._shakeTimer !== null) {
      try { clearTimeout(this._shakeTimer); } catch (e) {}
    }
    this.dom.classList.add('shake');
    this._shakeTimer = setTimeout((function () {
      this.dom.classList.remove('shake');
    }).bind(this), 500)
  }

  ChoiceList.prototype.awaitSelection = function () {
    return new Promise((function (resolve, reject) {
      // Cannot immediately return, so let's bind this function to the promises list and await
      var promiseTrigger = (function () {
        // This might be a completion event, but we are not sure
        if (this.confirm !== null) {
          // we need to check the state of the confirmation
          if (this.confirmed && (this.selected !== null || this.choices.length === 0)) {
            // Unbind the current listener
            var index = this._promises.indexOf(promiseTrigger);
            if (index >= 0) {
              this._promises = this._promises.splice(index, 1);
            }
            // resolve
            resolve(this.selected);
          }
        } else {
          // just check the state of the selection
          if (this.selected !== null || this.choices.length === 0) {
            // Unbind the current listener
            var index = this._promises.indexOf(promiseTrigger);
            if (index >= 0) {
              this._promises = this._promises.splice(index, 1);
            }
            // resolve
            resolve(this.selected);
          }
        }
      }).bind(this);

      this._promises.push(promiseTrigger);
      // trigger a test immediately in case we can already resolve
      this.triggerTest();
    }).bind(this)).then((function (selected) {
      // clean up after ourselves!
      window.removeEventListener('keydown', this._keyDownListener);
      return selected;
    }).bind(this));
  }

  exports.ChoiceList = ChoiceList;
}));
