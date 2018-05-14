var GIVe = (function (give) {
  'use strict'

  give.TASKSCHEDULER_EVENT_NAME = '_give-check-scheduled-task'

  give.TaskScheduler = function (tasks) {
    this.flags = {}
    this.tasks = []
    tasks = tasks || []
    if (!Array.isArray(tasks)) {
      tasks = [tasks]
    }
    tasks.forEach(function (task) {
      this.addTask(task)
    }, this)
    document.addEventListener(give.TASKSCHEDULER_EVENT_NAME, this.eventHandler.bind(this))
  }

  give.TaskScheduler.prototype.eventHandler = function (e) {
    if (e.detail && e.detail.flag) {
      if (!e.detail.removeFlag) {
        this.setFlag(e.detail.flag)
      } else {
        this.removeFlag(e.detail.flag)
      }
    } else {
      throw (new Error('Task scheduler error: task entry not valid.'))
    }
  }

  give.TaskScheduler.prototype.addTask = function (task) {
    if (task instanceof give.TaskEntry) {
      this.checkTaskAndRun(task)
      if (!task.isDone) {
        this.tasks.push(task)
      }
    } else {
      throw (new Error('Task scheduler error: task entry not valid.'))
    }
  }

  give.TaskScheduler.prototype.setFlag = function (flag) {
    if (!this.flags.hasOwnProperty(flag)) {
      this.flags[flag] = true
      this.tasks.forEach(this.checkTaskAndRun, this)
      this.tasks = this.tasks.filter(function (task) {
        return !task.isDone
      }, this)
    }
  }

  give.TaskScheduler.prototype.clearFlag = function () {
    this.flags = {}
  }

  give.TaskScheduler.prototype.removeFlag = function (flag) {
    if (this.flags.hasOwnProperty(flag)) {
      delete this.flags[flag]
    }
  }

  give.TaskScheduler.prototype.checkTaskAndRun = function (task) {
    task.checkPrerequisitesAndRun(this.flags)
  }

  give.mainTaskScheduler = new give.TaskScheduler()

  return give
})(GIVe || {})
