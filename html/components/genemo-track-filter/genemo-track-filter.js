import './genemo-track-filter-pages.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '@polymer/neon-animation/neon-animations.js';
import { NeonAnimationRunnerBehavior } from '@polymer/neon-animation/neon-animation-runner-behavior.js';
import '../task-scheduler/task-scheduler.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  Polymer({
    _template: html`
    <style include="give-shared-styles">
    :host {
      display: none;
      position: absolute;
      left: 260px;
      top: 15px;
      width: 550px;
      z-index: 20;
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.2em;
      vertical-align: middle;
      padding: 1em;
    }

    paper-card {
      height: 100%;
      --paper-card-header: {
        color: var(--dark-theme-text-color);
        background: var(--primary-background-color);
      };
    }
  </style>
    <paper-card heading="Filter tracks">
      <div class="card-content">
        <genemo-track-filter-pages id="mainPage" ref="[[ref]]"></genemo-track-filter-pages>
      </div>
      <div class="card-actions">
        <paper-button noink="" on-tap="selectAll">Select all</paper-button>
        <paper-button noink="" on-tap="selectNone">Select none</paper-button>
        <paper-button noink="" raised="" on-tap="addToSelection">Add</paper-button>
        <paper-button noink="" raised="" on-tap="filterSelection">Filter</paper-button>
        <paper-button noink="" raised="" on-tap="excludeFromSelection">Exclude</paper-button>
        <paper-button noink="" on-tap="hide">Cancel</paper-button>
      </div>
    </paper-card>
`,

    is: 'genemo-track-filter',

    behaviors: [
      NeonAnimationRunnerBehavior
    ],

    properties: {

      opened: {
        type: Boolean,
        value: false
      },

      entryAnimation: {
        value: 'fade-in-animation'
      },

      exitAnimation: {
        value: 'fade-out-animation'
      },

      targetId: {
        type: String,
        value: null
      },

      ref: {
        type: String
      }

    },

    listeners: {
      'neon-animation-finish': '_onNeonAnimationFinish'
    },

    _onNeonAnimationFinish: function () {
      if (!this.opened) {
        this.style.display = 'none'
      }
    },

    show: function () {
      if (this.$.mainPage.initialized) {
        this.opened = true
        this.style.display = 'block'
        this.$.mainPage.$.mainTabs.notifyResize()
        this.playAnimation('entry')
      } else {
        this.fire('alert', { msg: 'Filter has not been initialized yet.' })
      }
    },

    hide: function () {
      this.opened = false
      this.playAnimation('exit')
    },

    selectAll: function () {
      this.$.mainPage.setAllCheckboxes(true)
    },

    selectNone: function () {
      this.$.mainPage.setAllCheckboxes(false)
    },

    addToSelection: function () {
      this.fire('filter-tracks', {
        targetId: this.targetId,
        map: this.$.mainPage.getCurrentListMap(),
        flags: { matched: true }
      })
      this.hide()
    },

    filterSelection: function () {
      this.fire('filter-tracks', {
        targetId: this.targetId,
        map: this.$.mainPage.getCurrentListMap(),
        flags: { unmatched: false }
      })
      this.hide()
    },

    excludeFromSelection: function () {
      this.fire('filter-tracks', {
        targetId: this.targetId,
        map: this.$.mainPage.getCurrentListMap(),
        flags: { matched: false }
      })
      this.hide()
    }
  })
  return give
})(GIVe || {})
