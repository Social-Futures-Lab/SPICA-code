'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['exports', 'dfc'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports, require('dfc'));
  } else {
    factory((root.taskManager = {}), root.dfc);
  }
}(typeof self !== 'undefined' ? self : this, function (exports, _) {

  function Task (task, predicates, cleanup) {
    this._task = task;
    this._setup = predicates;
    this._teardown = cleanup;
  }

  Task.prototype.run = function () {
    return Promise.all(this._setup).then(function (predicates) {

    })
  }

  function TaskManager (progressUpdater) {
    this._tasks = [];
    this._totalEnqueued = 0;

    this._progressUpdater = (typeof progressUpdater === 'function') ? progressUpdater : null;
  };

  TaskManager.prototype.onProgressChange = function () {
    return
  };

  TaskManager.prototype.enqueue = function (task) {
    this._tasks.push(task);
    this._totalEnqueued += 1;
    task._ordinal = this._totalEnqueued;
  };

  TaskManager.prototype.run = function (input, failMode) {
    // Consumes all the tasks and builds a promise
    return new Promise((function (resolve, reject) {
      if (this._tasks.length > 0) {
        // Pop the top task
        var task = this._tasks.shift();
        if (this._progressUpdater !== null) {
          this._progressUpdater(task._ordinal, this._totalEnqueued);
        }
        return resolve(task.run(input).catch(function (e) {
            console.error(e.stack);
            if (failMode === 'retry' || failMode === 'continue') {
              if (failMode === 'retry') {
                this._tasks.unshift(task); // Put the task back in
              }
            } else {
              // Bubble the error
              throw e;
            }
          }).then((function (output) {
            return this.run(output, failMode);
          }).bind(this)));
      } else {
        // No more tasks
        if (this._progressUpdater !== null) {
          this._progressUpdater(this._totalEnqueued, this._totalEnqueued);
        }
        resolve(input);
      }
    }).bind(this));
  };
  exports.TaskManager = TaskManager;
}));
