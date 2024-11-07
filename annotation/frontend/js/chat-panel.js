'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'dfc', 'marked'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports, require('dfc'), require('marked'));
  } else {
    factory((root.chatPanel = {}), root.dfc, root.marked);
  }
}(typeof self !== 'undefined' ? self : this, function (exports, _, marked) {

  function tokenizeToNChunks(text, n) {
    var averageChunkSize = text.length / n;
    var tokens = []
    for (var i = 0; i < n - 1; i++) {
      var currentChunkSize = Math.round(averageChunkSize * (0.9 + Math.random() * 0.2));
      tokens.push(text.slice(0, currentChunkSize));
      text = text.slice(currentChunkSize);
    }
    tokens.push(text);
    return tokens;
  }

  function ChatPanel(container) {
    this._dom = container;
    this._responseDom = null;

    this._interval = null;
    this._cancel = null;
  };

  ChatPanel.prototype.renderConversation = function (conversation, delayPerMessage) {
    if (this._interval !== null) {
      // Ongoing render! Let's cancel it
      try {
        clearInterval(this._interval);
        this._cancel();
        this._interval = null;
        this._cancel = null;
      } catch (e) {}
    }
    this._dom.innerHTML = '';
    this._responseDom = null;

    var queue = conversation.slice(0);
    return new Promise((function (resolve, reject) {
      var consumeQueue = (function () {
        if (queue.length === 0) {
          try {
            clearInterval(this._interval);
            this._interval = null;
            this._cancel = null;
          } catch (e) {}
          resolve();
        } else {
          var nextMessage = queue.shift();
          var messageDom = _('div', {
            'className': 'message ' + nextMessage['agent']
          }, [
            _('div', {'className': 'content'}, [], function (elem) {
              elem.innerHTML = marked.parse(nextMessage['text']);
            }),
            _('div', {'className': 'avatar'})
          ]);
          this._dom.insertBefore(messageDom, this._dom.firstChild);
        }
      }).bind(this);
      this._interval = setInterval(consumeQueue, delayPerMessage === 'number' ? delayPerMessage : 100);
      this._cancel = (function () {
        try {
          clearInterval(this._interval);
          this._interval = null;
        } catch (e) {}
        this._cancel = null;
        reject();

      }).bind(this);
    }).bind(this));
  };

  ChatPanel.prototype.renderResponse = function (responseMarkdown, delayPerToken) {
    if (this._interval !== null) {
      // task in progress, reject
      return Promise.reject(new Error('Already rendering response or conversation!'));
    }
    if (this._responseDom === null) {
      // Add the dom
      this._responseDom = _('div', {'className': 'content'}, []);
      this._dom.insertBefore(_('div', {
          'className': 'message chatbot'
        }, [
          this._responseDom,
          _('div', {'className': 'avatar'})
        ]), this._dom.firstChild);
    }
    if (responseMarkdown === null) {
      // Render throbber
      this._responseDom.innerHTML = '<div class="throbber"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
      try {
        this._dom.scrollTop = this._dom.scrollHeight;
      } catch (e) {}
      return Promise.resolve();
    }
    return new Promise((function (resolve, reject) {
      var tokenizedResponse = tokenizeToNChunks(responseMarkdown, 10);
      var currentResponse = '';
      var consumeQueue = (function () {
        if (tokenizedResponse.length === 0) {
          try {
            clearInterval(this._interval);
            this._interval = null;
            this._cancel = null;
          } catch (e) {}
          resolve();
        } else {
          var token = tokenizedResponse.shift();
          currentResponse += token;
          this._responseDom.innerHTML = marked.parse(currentResponse);
          try {
            this._dom.scrollTop = this._dom.scrollHeight;
          } catch (e) {}
        }
      }).bind(this);

      this._interval = setInterval(consumeQueue, delayPerToken === 'number' ? delayPerToken : 100);
      this._cancel = (function () {
        try {
          clearInterval(this._interval);
          this._interval = null;
        } catch (e) {}
        this._cancel = null;
        reject();

      }).bind(this);
    }).bind(this));
  };

  exports.ChatPanel = ChatPanel;
}));
