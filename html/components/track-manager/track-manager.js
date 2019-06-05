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
import '../ref-selector/ref-selector.js';

import '../track-filter/track-filter.js';
import '../track-meta-list/track-meta-list.js';
import '../html-builder/html-builder.js';
import '../give-styles.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/app-layout/app-layout.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="track-manager">
  <template>
    <style include="give-shared-styles iron-flex iron-flex-alignment iron-positioning">
      :host {
        position: relative;
        overflow-x: auto;
        @apply --layout-vertical;
      }
      app-toolbar {
        background-color: var(--primary-background-color);
        color: var(--primary-text-color);
        --app-toolbar-font-size: var(--base-font-size);
      }
      app-toolbar > *[main-title] {
        font-size: 1.4em;
        margin: 0 1em;
      }
      app-toolbar > div#htmlGeneratorButtons {
        padding: 0 0.5em;
      }
      app-toolbar div paper-button {
        margin: 0 0.1em;
        background: var(--card-background-color);
      }
      app-toolbar div paper-button[toggles] {
        transition: background-color 0.3s;
      }
      app-toolbar div paper-button[toggles][active] {
        background-color: rgba(0, 0, 0, 0.2);
      }
      paper-button#clearFilterBtn {
        padding: 0.1em;
        min-width: 0;
        margin: -0.3em 0 -0.3em 0.5em;
      }
      paper-button#clearFilterBtn iron-icon {
        width: 1.5em;
        height: 1.5em;
      }
      paper-button.placeHoldingBtn {
        visibility: hidden;
      }
      paper-button.placeHoldingBtn[visible] {
        visibility: visible;
      }
      ref-selector {
        --base-font-size: 12px;
        margin: 0 0.5em 0.5em 0.5em;
      }
    </style>
    <app-toolbar>
      <slot id="logo" name="logo"></slot>
      <span main-title="">[[titleText]]</span>
      <ref-selector ref="{{currentRef}}"></ref-selector>
      <div id="filterButtons">
        <paper-button id="filterBtn" raised="" toggles="" active="{{_filterDialogOn}}" on-tap="toggleFilter" disabled\$="[[!_calcIntroHidden(currentRef)]]">
          [[filterText]]
          <paper-button raised="" id="clearFilterBtn" hidden\$="[[!_filterActive]]" on-tap="clearFilter">
            <iron-icon icon="clear"></iron-icon>
          </paper-button>
        </paper-button>
      </div>
      <div id="htmlGeneratorButtons">
        <paper-button raised="" toggles="" active="{{generatorMode}}">
          HTML Generator Mode
        </paper-button>
        <paper-button class="placeHoldingBtn" raised="" id="generateHtmlBtn" visible\$="[[generatorMode]]" on-tap="generateHtml" disabled\$="[[!numOfGroupsSelected]]">
          Generate
        </paper-button>
      </div>
    </app-toolbar>
    <div class="layout vertical flex" hidden\$="[[_calcIntroHidden(currentRef)]]">
      <slot id="introDiv" name="managerIntro"></slot>
    </div>
    <track-meta-list id="mainMetaList" class="flex self-center" ref="[[currentRef]]" selection-enabled\$="[[generatorMode]]" num-of-groups-selected="{{numOfGroupsSelected}}" hidden\$="[[!currentRef]]" filter-obj="[[_trackFilter]]">
    </track-meta-list>
    <html-builder id="mainHtmlBuilder" ref="[[currentRef]]"></html-builder>
    <paper-dialog id="filterDialog" on-iron-overlay-closed="_filterClosed">
      <track-filter id="mainTrackFilter" ref="[[currentRef]]" has-value="{{_filterHasValue}}">
      </track-filter>
      <div class="buttons">
        <paper-button dialog-confirm="" disabled\$="[[!_filterHasValue]]">
          <iron-icon icon="filter-list"></iron-icon>
          Filter
        </paper-button>
        <paper-button dialog-dismiss="">
          Cancel
        </paper-button>
      </div>
    </paper-dialog>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class TrackManager extends PolymerElement {
    static get is () {
      return 'track-manager'
    }

    static get properties () {
      return {
        currentRef: {
          type: String,
          value: '',
          observer: '_refChanged'
        },

        generatorMode: {
          type: Boolean,
          value: false
        },

        numOfGroupsSelected: {
          type: Number
        },

        titleText: {
          type: String,
          value: 'Data Hub'
        },

        _filterHasValue: {
          type: Boolean
        },

        _filterDialogOn: {
          type: Boolean
        },

        _filterActive: {
          type: Boolean,
          computed: '_calcFilterActive(_trackFilter)'
        },

        _trackFilter: {
          type: Object,
          value: null
        },

        filterText: {
          type: String,
          value: 'Filter'
        }
      }
    }

    generateHtml () {
      this.$.mainHtmlBuilder.createDialog(null,
        this.$.mainMetaList.selectedGroups,
        this.$.mainMetaList.selectedTracks
      )
    }

    _refChanged (newRef, oldRef) {
      this.clearFilter()
    }

    _calcIntroHidden (currentRef) {
      return !!currentRef
    }

    _calcFilterActive (_trackFilter) {
      return !!_trackFilter
    }

    _filterClosed (e, detail) {
      if (this.$.filterDialog.closingReason.confirmed) {
        this._trackFilter = this.$.mainTrackFilter.createFilter()
        this.filterText = 'Filter: ' + this.$.mainTrackFilter.filterDesc
        this.$.filterDialog.closingReason.confirmed = false
      }
      this._filterDialogOn = this.$.filterDialog.opened
    }

    toggleFilter () {
      this.$.filterDialog.toggle()
      this._filterDialogOn = this.$.filterDialog.opened
    }

    clearFilter (e) {
      if (e && e.stopPropagation) {
        e.stopPropagation()
      }
      this._trackFilter = null
      this.filterText = 'Filter'
    }
  }

  give.TrackManager = TrackManager
  window.customElements.define('track-manager', give.TrackManager)

  return give
})(GIVe || {})
