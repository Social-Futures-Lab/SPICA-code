'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports);
  } else {
    factory((root.platform = {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {

  function MemoryStorageContext(parent) {
    this._store = (typeof parent === 'object' ? parent : {});
  }

  MemoryStorageContext.prototype.substorage = function (key) {
    if (!(key in this._store)) {
      this._store[key] = {};
    } else {
      throw new Error('Cannot create substorage. Key ' + key + ' taken');
    }
    return new MemoryStorageContext(this._store[key]);
  }

  MemoryStorageContext.prototype.create = function (key, value) {
    if (key in this._store) {
      throw new Error('Key ' + key + ' already exists. Create fails');
    }
    this._store[key] = value;
  }

  MemoryStorageContext.prototype.update = function (key, value) {
    if (!key in this._store) {
      throw new Error('Key ' + key + ' not found. Cannot update.');
    }
    if (typeof value === 'object' && value !== null) {
      if (typeof this._store[key] !== 'object' || this._store[key] === null) {
        this._store[key] = {};
      }
      for (var subkey in value) {
        this._store[key][subkey] = value;
      }
    } else {
      this._store[key] = value;
    }
  }

  MemoryStorageContext.prototype.read = function (key, defaultValue) {
    if (!key in this._store) {
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      } else {
        throw new Error('Key ' + key + ' not found and no fallback given.');
      }
    } else {
      return this._store[key];
    }
  }

  MemoryStorageContext.prototype.delete = function (key) {
    delete this._key;
  }

  MemoryStorageContext.prototype.serialize = function () {
    return JSON.stringify(this._store);
  }

  function Platform() {
    this._params = new URLSearchParams(window.location.search);
  }

  Platform.prototype.isDebugging = function () {
    return this._params.get('debug') === 'debug';
  }

  Platform.prototype.getStudyId = function () {
    return this._params.get('studyId');
  }

  Platform.prototype.getGroupName = function () {
    return this._params.get('group');
  }

  Platform.prototype.getSessionId = function () {
    return this._params.get('sessionId');
  }

  Platform.prototype.getParticipantId = function () {
    return this._params.get('participantId');
  }

  Platform.prototype.getConfigUrl = function () {
    return this._params.get('config');
  }

  Platform.prototype.getExitCode = function () {
    var exitCode = this._params.get('exitCode');
    if (exitCode === null) {
      return '';
    } else {
      return exitCode.split('').reverse().join('');
    }
  }

  Platform.prototype.getStorageContext = function () {
    return new MemoryStorageContext();
  }

  exports.Platform = Platform;
}));
