/**
@license
Copyright 2017 GIVe Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '@polymer/paper-material/paper-material.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '../track-object/track-object.js';
import '../give-styles.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="track-meta-entry">
  <template>
    <style include="give-shared-styles">
      :host{
        overflow: visible;
      }
      paper-material {
        display: table;
        padding: 0;
        background: var(--card-background-color);
        @apply --meta-entry-paper-material-mixin;
      }
      paper-material > div:not(.status) {
        padding: 1em 0.5em;
        word-break: break-word;
      }
      paper-material div.group-overlay {
        @apply --layout-fit;
        @apply --layout-horizontal;
        @apply --meta-entry-group-overlay-mixin;
        padding: 0;
        background: var(--light-primary-color);
      }
      paper-material > div.selection-border {
        @apply --layout-fit;
        @apply --meta-entry-selection-border-mixin;
        box-sizing: border-box;
        border: 0.5px var(--secondary-text-color) solid;
        pointer-events: none;
        transition: opacity 0.15s;
        transition: border 0.15s;
      }
      paper-material:not([allow-selection]) > div.selection-border {
        opacity: 0.4;
      }
      paper-material[group-selected] > div.selection-border {
        border: 3px var(--lighter-accent-color) solid;
      }
      paper-material[selected] > div.selection-border {
        border: 3px var(--accent-color) solid;
      }
      paper-material:not([allow-selection]) div.status iron-icon {
        opacity: 0;
      }
      paper-material[selected] div.status iron-icon {
        color: var(--dark-theme-text-color);
      }
      paper-material[group-selected] div.status {
        background: var(--lighter-accent-color);
      }
      paper-material[selected] div.status {
        background: var(--accent-color);
      }
      paper-material div.group-overlay div.groupInfo {
        @apply --layout-flex;
        padding: 1em 1em 1em 0.5em;
      }
      paper-material div.group-overlay span.groupTrackCount {
        float: right;
        font-style: italic;
      }
      paper-material div.group-overlay span.groupID {
        font-weight: 500;
      }
      paper-material > div.table-cell {
        display: table-cell;
      }
      div.status {
        width: 1em;
        min-width: 1em;
        padding: 0.3em 0.5em;
        vertical-align: top;
        transition: background 0.15s;
      }
      div.status iron-icon {
        width: 1em;
        height: 1em;
        color: var(--primary-text-color);
        transition: color 0.15s;
        transition: opacity 0.15s;
        /** reserved for Polymer 2.0 update */
        /* opacity: var(--primary-text-opacity); */
      }
      div.status paper-tooltip {
        --paper-tooltip: {
          width: auto;
          padding: 0.2em 1em;
          font-size: 1em;
          white-space: normal;
          line-height: 1.4em;
          z-index: 20;
        };
      }
      div.trackID {
        width: 12em;
        min-width: 12em;
      }
      div.trackType {
        width: 7em;
        min-width: 7em;
      }
      div.shortLabel {
        width: 10em;
        min-width: 10em;
      }
      div.longLabel {
        width: 30em;
        min-width: 30em;
      }
      div.dataType {
        width: 10em;
        min-width: 10em;
      }
      div.cellType {
        width: 10em;
        min-width: 10em;
      }
      div.labName {
        width: 10em;
        min-width: 10em;
      }
    </style>
    <paper-material elevation="1" selected\$="[[selected]]" group-selected\$="[[groupSelected]]" allow-selection\$="[[allowSelection]]">
      <template is="dom-if" if="[[isGroup]]">
        <div class="group-overlay">
          <div class="status">
            <template is="dom-if" if="[[_showUnavailable(_isHeader, selected, groupSelected)]]">
              <div>
                <iron-icon icon="block">
                </iron-icon>
                <paper-tooltip position="right" fit-to-visible-bounds="">
                  Unselected group will not be available in the embedded
                  browser.<br>
                  Click on the group or any of its member track(s) to select
                  this group.
                </paper-tooltip>
              </div>
            </template>
            <template is="dom-if" if="[[_showAvailable(_isHeader, selected, groupSelected)]]">
              <div>
                <iron-icon icon="check-circle">
                </iron-icon>
                <paper-tooltip position="right">
                  This group will be available in the embedded browser.
                </paper-tooltip>
              </div>
            </template>
            <template is="dom-if" if="[[trackSelectLock]]">
              <div>
                <iron-icon icon="lock-outline">
                </iron-icon>
                <paper-tooltip position="right">
                  This group has track(s) selected to be shown by default.<br>
                  Unselect all tracks within this group before unselecting
                  this group.
                </paper-tooltip>
              </div>
            </template>
          </div>
          <div class="groupInfo">
            [[_groupLabel]]
            (Group ID: <span class="groupID">[[_groupID]]</span>)
            <span class="groupTrackCount">
              [[_trackCount]] [[_trackCountSuffix]]
            </span>
          </div>
        </div>
      </template>
      <div class="table-cell status">
        <template is="dom-if" if="[[!isGroup]]">
          <template is="dom-if" if="[[_showUnavailable(_isHeader, selected, groupSelected)]]">
            <div>
              <iron-icon icon="block">
              </iron-icon>
              <paper-tooltip position="right">
                The group of this track is not selected. <br>
                Therefore, this track will not be available in the embedded
                browser.
              </paper-tooltip>
            </div>
          </template>
          <template is="dom-if" if="[[_showAvailable(_isHeader, selected, groupSelected)]]">
            <div>
              <iron-icon icon="check-circle">
              </iron-icon>
              <paper-tooltip position="right">
                This track will be available in the embedded browser.
              </paper-tooltip>
            </div>
          </template>
          <template is="dom-if" if="[[_showDefault(_isHeader, selected, groupSelected)]]">
            <div>
              <iron-icon icon="visibility">
              </iron-icon>
              <paper-tooltip position="right">
                This track will be shown by default in the embedded browser.
              </paper-tooltip>
            </div>
          </template>
        </template>
      </div>
      <div class="table-cell trackID">[[_trackID]]</div>
      <div class="table-cell trackType">[[_trackType]]</div>
      <div class="table-cell shortLabel">[[_shortLabel]]</div>
      <div class="table-cell longLabel">[[_longLabel]]</div>
      <div class="table-cell dataType">[[_dataType]]</div>
      <div class="table-cell cellType">[[_cellType]]</div>
      <div class="table-cell labName">[[_labName]]</div>
      <div class="selection-border"></div>
    </paper-material>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class TrackMetaEntry extends PolymerElement {
    static get is () {
      return 'track-meta-entry'
    }

    static get properties () {
      return {
        dataObj: {
          type: Object,
          value () {
            return {}
          },
          observer: '_dataObjChanged'
        },

        _groupLabel: {
          type: String,
          value: ''
        },

        _groupID: {
          type: String,
          value: ''
        },

        _trackCount: {
          type: Number,
          value: 0
        },

        _trackCountSuffix: {
          type: String,
          computed: '_getTrackCountSuffix(_trackCount)'
        },

        _trackID: {
          type: String
        },

        _trackType: {
          type: String
        },

        _shortLabel: {
          type: String
        },

        _longLabel: {
          type: String
        },

        _dataType: {
          type: String
        },

        _cellType: {
          type: String
        },

        _labName: {
          type: String
        },

        selected: {
          type: Boolean,
          value: false,
          notify: true
        },

        groupSelected: {
          type: Boolean,
          value: false
        },

        allowSelection: {
          type: Boolean,
          value: false
        },

        isGroup: {
          type: Boolean,
          value: false
        },

        trackSelectLock: {
          type: Boolean,
          value: false
        },

        _isHeader: {
          type: Boolean,
          value: false
        }
      }
    }

    _showUnavailable (_isHeader, selected, groupSelected) {
      return !_isHeader && !selected && !groupSelected
    }

    _showAvailable (_isHeader, selected, groupSelected) {
      return !_isHeader && (selected || groupSelected)
    }

    _showDefault (_isHeader, selected, groupSelected) {
      return !_isHeader && selected && groupSelected
    }

    _dataObjChanged (newValue, oldValue) {
      this._isHeader = false
      if (newValue instanceof give.TrackObject) {
        this._groupID = ''
        this._groupLabel = ''
        this._trackCount = 0
        this._trackID = newValue.tableNames
        this._trackType = newValue.typeTrunk
        this._shortLabel = newValue.getSetting('shortLabel', 'string')
        this._longLabel = newValue.getSetting('longLabel', 'string')
        this._dataType = newValue.title || this._shortLabel
        this._cellType = newValue.getSetting('cellType', 'string')
        this._labName = newValue.getSetting('labName', 'string')
      } else {
        this._trackID = 'Track ID'
        this._trackType = 'Type'
        this._shortLabel = 'Short label'
        this._longLabel = 'Description'
        this._dataType = 'Data type'
        this._cellType = 'Cell type'
        this._labName = 'Lab name'
        if (newValue instanceof give.TrackGroup) {
          this._groupID = newValue.id
          this._groupLabel = newValue.label ||
            'Group: ' + newValue.id
          this._trackCount = newValue.length
        } else {
          this._isHeader = true
        }
      }
    }

    _getTrackCountSuffix (trackCount) {
      return 'track' + (trackCount > 1 ? 's' : '')
    }
  }

  give.TrackMetaEntry = TrackMetaEntry
  window.customElements.define('track-meta-entry', give.TrackMetaEntry)

  return give
})(GIVe || {})
