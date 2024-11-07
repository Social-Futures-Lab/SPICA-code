'use strict';

(function (AccordionPage, ChatPanel, ChoiceList, Platform, TaskManager) {
  var ATTENTION_DESCRIPTION = [
    'the response is inappropriate [1]',
    'the response is somewhat inappropriate [2]',
    'I am undecided about the response [3]',
    'the response is somewhat appropriate [4]',
    'the response is appropriate [5]'
  ]
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
  function $(e) {
    return document.getElementById(e);
  }

  function SurveyTask(globalPageManager) {
    this._globalPageManager = globalPageManager;
  }

  SurveyTask.prototype.run = function (storageContext) {
    return this._globalPageManager.unfoldTo(['survey']).then((function () {
      var surveyChoice = new ChoiceList($('survey-choice-list'), [], 'Submit');
      return surveyChoice.awaitSelection().then(function () {
        return storageContext;
      });
    }).bind(this));
  }

  function InstructionsTask(globalPageManager) {
    this._globalPageManager = globalPageManager;
  }

  InstructionsTask.prototype.run = function (storageContext) {
    return this._globalPageManager.unfoldTo(['instructions']).then((function () {
      var instructionsChoice = new ChoiceList($('instructions-choice-list'), [], 'Continue');
      return instructionsChoice.awaitSelection().then(function () {
        return storageContext;
      });
    }).bind(this));
  }

  function AnnotationTask(config, globalPageManager, subtaskPageManager, chatPanel) {
    this._config = config;
    this._globalPageManager = globalPageManager;
    this._subtaskPageManager = subtaskPageManager;
    this._chatPanel = chatPanel;
  }

  AnnotationTask.prototype._queueResponsePreferences = function (promise, storage) {
    return promise.then((function () {
        return this._subtaskPageManager.unfoldTo(['rate-response']);
      }).bind(this)).then((function () {
        var responsePreferencesChoice = new ChoiceList($('task-response-preferences-choice-list'), [
          { 'value': '1', 'shortcut': '1', 'label': 'Inappropriate', 'hideLabel': true },
          { 'value': '2', 'shortcut': '2', 'label': 'Somewhat Inappropriate', 'hideLabel': true },
          { 'value': '3', 'shortcut': '3', 'label': 'Undecided', 'hideLabel': true },
          { 'value': '4', 'shortcut': '4', 'label': 'Somewhat Appropriate', 'hideLabel': true },
          { 'value': '5', 'shortcut': '5', 'label': 'Appropriate', 'hideLabel': true },
        ], 'Confirm');
        return responsePreferencesChoice.awaitSelection().then(function (result) {
          storage.create('response-rating', result);
          return result;
        });
      }).bind(this));
  };

  AnnotationTask.prototype._queueStrategyPreferences = function (promise, responseMode, storage) {
    return promise.then((function () {
        $('task-strategy-desc').innerText = this._config.strategy[responseMode];
        return this._subtaskPageManager.unfoldTo(['rate-strategy']);
      }).bind(this)).then((function () {
        var strategyPreferencesChoice = new ChoiceList($('task-strategy-preferences-choice-list'), [
          { 'value': '1', 'shortcut': '1', 'label': 'Inappropriate', 'hideLabel': true },
          { 'value': '2', 'shortcut': '2', 'label': 'Somewhat Inappropriate', 'hideLabel': true },
          { 'value': '3', 'shortcut': '3', 'label': 'Undecided', 'hideLabel': true },
          { 'value': '4', 'shortcut': '4', 'label': 'Somewhat Appropriate', 'hideLabel': true },
          { 'value': '5', 'shortcut': '5', 'label': 'Appropriate', 'hideLabel': true },
        ], 'Confirm');
        return strategyPreferencesChoice.awaitSelection().then(function (result) {
          storage.create('strategy-rating', result);
          return result;
        });;
      }).bind(this));
  };

  AnnotationTask.prototype._queueAttention = function (promise, storage) {
    // pick an attention level
    var reference = 1 + Math.floor(Math.random() * 5);
    storage.create('rating-reference', reference);
    return promise.then((function () {
      // show the attention target
      $('task-test-rating-desc').innerText = ATTENTION_DESCRIPTION[reference - 1];
      return this._subtaskPageManager.unfoldTo(['test-rating']);
    }).bind(this)).then((function () {
      var attentionPreferencesChoice = new ChoiceList($('task-test-preferences-choice-list'), [
        { 'value': '1', 'shortcut': '1', 'label': 'Inappropriate', 'hideLabel': true },
        { 'value': '2', 'shortcut': '2', 'label': 'Somewhat Inappropriate', 'hideLabel': true },
        { 'value': '3', 'shortcut': '3', 'label': 'Undecided', 'hideLabel': true },
        { 'value': '4', 'shortcut': '4', 'label': 'Somewhat Appropriate', 'hideLabel': true },
        { 'value': '5', 'shortcut': '5', 'label': 'Appropriate', 'hideLabel': true },
      ], 'Confirm');
      return attentionPreferencesChoice.awaitSelection().then(function (result) {
        storage.create('attention-rating', result);
        return result;
      });;
    }).bind(this));
  }

  AnnotationTask.prototype.run = function (storageContext) {
    return new Promise((function (resolve, reject) {
      // Get a task-local storage
      var taskStorage = storageContext.substorage(this._config.id);

      // Make base promise
      var basePromise = this._globalPageManager.unfoldTo(['task']).then((function () {
          // open the intro part of the subtask
          return this._subtaskPageManager.unfoldTo(['intro']);
        }).bind(this)).then((function () {
          // Setup the chat prompt
          return this._chatPanel.renderConversation(this._config.conversation);
        }).bind(this)).then((function () {
          // Make the conversation
          return this._chatPanel.renderResponse(null);
        }).bind(this)).then((function () {
          var initialConfirmationChoice = new ChoiceList($('task-initial-choice-list'), [], 'Continue');
          return initialConfirmationChoice.awaitSelection();
        }).bind(this));

      // Shuffle
      var responseModeOrder = [];
      for (var responseMode in this._config.responses) {
        responseModeOrder.push(responseMode);
      }
      responseModeOrder.sort();
      shuffle(responseModeOrder)

      // Now roll the dice for where to insert the attention check question
      var attnCheckIndex = this._config.attention ?
        Math.floor(Math.random() * responseModeOrder.length) : -1;

      // Save the metadata
      var rngTracker = taskStorage.substorage('rng');
      rngTracker.create('order', responseModeOrder);
      rngTracker.create('attention', attnCheckIndex);

      // Chain the sub questions onto the promise
      responseModeOrder.forEach((function (responseMode, i) {
        var responseModeStorage = taskStorage.substorage(responseMode);
        basePromise = basePromise.then((function () {
          // Close the question
          return this._subtaskPageManager.unfoldTo([]);
        }).bind(this)).then((function () {
          // pick some version of the response
          var selectedIndex = Math.floor(Math.random() * this._config.responses[responseMode].length);
          rngTracker.create(responseMode + ':example', selectedIndex)
          // render the response
          return this._chatPanel.renderResponse(
            this._config.responses[responseMode][selectedIndex], 100);
        }).bind(this));
        basePromise = this._queueResponsePreferences(basePromise, responseModeStorage);
        // basePromise = this._queueStrategyPreferences(basePromise, responseMode, responseModeStorage);
        if (i === attnCheckIndex) {
          basePromise = this._queueAttention(basePromise, taskStorage.substorage('attention'));
        }
      }).bind(this));

      return resolve(basePromise.then(function () {
        return storageContext;
      }));
    }).bind(this));
  }

  function SubmitTask (apiUrl, participantId, groupName, taskId, sessionId, commentsDom, participantIdBackupDom) {
    this._apiUrl = apiUrl;
    this._participantId = participantId;
    this._groupName = groupName;
    this._taskId = taskId;
    this._sessionId = sessionId;

    this._commentsDom = commentsDom;
    this._participantIdBackupDom = participantIdBackupDom;
  }

  SubmitTask.prototype._sendResults = function (results) {
    return fetch(this._apiUrl, {
      'method': 'post',
      'mode': 'cors',
      'cache': 'no-cache',
      'headers': {
        'content-type': 'application/json'
      },
      'body': JSON.stringify(results)
    }).then(function (resp) {
      return resp.json();
    }).then(function (response) {
      if (response.status === 200) {
        return response;
      } else {
        if (confirm('Warning: The server responded with something this application does not recognize:\n' +
          JSON.stringify(response) + '\n\n' +
          'As a result, we may not have correctly saved your results. \n' +
          'If the response above looks successful, press [OK] to continue. Otherwise, press [Cancel] to show debugging information and try to recover results.')) {

          // treat as success
          return response;
        } else {
          throw new Error('User indicated server response was error.');
        }
      }
    }).catch((function (error) {
      // likely network or remote error
      if (confirm('Error: Something went wrong while trying to save your results:\n' +
        error + '\n\n' +
        'Your results were probably not recorded.\n' +
        'Press [OK] to retry. Press [Cancel] to show debugging information and try to recover results.')) {

        // retry
        return this._sendResults(results);
      } else {
        throw error;
      }

    }).bind(this))
  }

  SubmitTask.prototype.run = function (storageContext) {
    try {
      localStorage['results-backup'] = storageContext.serialize();
    } catch (e) {}
    // make this task infinitely retry
    return new Promise((function (resolve, reject) {

      // assemble the task
      var results = {
        'participantId': this._participantId !== null ?
          this._participantId : this._participantIdBackupDom.value,
        'sessionId': this._sessionId,
        'group': this._groupName,
        'taskId': this._taskId,
        'results': storageContext.serialize(),
        'feedback': this._commentsDom.value
      };
      return resolve(this._sendResults(results));
    }).bind(this));
  }

  function loadConfig(url) {
    return fetch(url).then(function (resp) {
      return resp.json();
    });
  }

  window.addEventListener('load', function () {
    var platform = new Platform('prolific');

    if (platform.getParticipantId() !== null) {
      $('platform-notice-noid').style.display = 'none';
      $('platform-request-id').style.display = 'none';
    } else {
      $('platform-participant-id').value = platform.getParticipantId();
    }

    loadConfig(platform.getConfigUrl()).then((function (config) {
      var taskManager = new TaskManager(function (current, total) {
        $('main-progress').style.width = (current / total * 100) + '%';
        $('main-progress-label').innerText = 'Page ' + current + ' of ' + total;
      });
      var pageAccordion = new AccordionPage();
      pageAccordion.addPage('survey', $('survey'));
      pageAccordion.addPage('task', $('task'));
      pageAccordion.addPage('instructions', $('instructions'));
      pageAccordion.addPage('error', $('error'));

      var taskAccordion = new AccordionPage();
      taskAccordion.addPage('intro', $('task-initial'));
      taskAccordion.addPage('rate-response', $('task-question-rate-response'));
      taskAccordion.addPage('rate-strategy', $('task-question-rate-strategy'));
      taskAccordion.addPage('test-rating', $('task-question-rating-test'));

      var chatPanel = new ChatPanel($('task-chat-panel'));

      // inject attention checks into random tasks
      var attentionIndices = [];
      if ((typeof config['attention'] ==='number') && config.attention > 0) {
        var taskIndices = config.tasks.map(function (_, i) { return i; });
        shuffle(taskIndices);
        attentionIndices = taskIndices.slice(0, config.attention);
        console.log('Insert attention ' + attentionIndices);
      }

      // queue up tasks
      var tasks = config.tasks.map(function (taskData, i) {
        var copyTaskData = {};
        for (var key in taskData) {
          copyTaskData[key] = taskData[key];
        }
        // move over the response modes
        copyTaskData['strategy'] = config['strategy'];
        // set the attention flag if this is one of the places to attend
        if (attentionIndices.indexOf(i) >= 0) {
          copyTaskData['attention'] = true;
        }
        return copyTaskData;
      });
      taskManager.enqueue(new InstructionsTask(pageAccordion));
      tasks.forEach(function (taskConfig) {
        taskManager.enqueue(new AnnotationTask(taskConfig, pageAccordion, taskAccordion, chatPanel));
      })
      taskManager.enqueue(new SurveyTask(pageAccordion));

      // queue up the record task
      var configPath = platform.getConfigUrl().split('/');
      var configFile = configPath[configPath.length - 1].split('.');
      if (platform.isDebugging()) {
        taskManager.enqueue(new SubmitTask('http://127.0.0.1:5000/api/submit',
          platform.getParticipantId(),
          platform.getGroupName(),
          configFile[0],
          platform.getSessionId(),
          $('feedback'),
          $('platform-participant-id')));
      } else {
        taskManager.enqueue(new SubmitTask('https://tone.cs.washington.edu/api/submit',
          platform.getParticipantId(),
          platform.getGroupName(),
          configFile[0],
          platform.getSessionId(),
          $('feedback'),
          $('platform-participant-id')));
      }

      return taskManager.run(platform.getStorageContext()).then(function () {
        window.location.href = 'https://app.prolific.com/submissions/complete?cc=' + platform.getExitCode();
      }).catch(function (error) {
        $('error-stack-trace').innerText = error.stack;
        $('error-results-snapshot').innerText = btoa(localStorage['results-backup']);
        return pageAccordion.unfoldTo(['error']);
      });
    }).bind(this)).catch(function (e) {
      alert('An error happened! Please contact the study coordinator. \n\nInformation: \n' + e);
    });
  });
})(this.accordionPage.AccordionPage, this.chatPanel.ChatPanel, this.choiceList.ChoiceList, this.platform.Platform, this.taskManager.TaskManager);
