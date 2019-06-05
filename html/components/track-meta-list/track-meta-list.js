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

import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/iron-list/iron-list.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '../give-styles.js';
import './track-meta-entry.js';
import '../ref-embed-mixin/ref-embed-mixin.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="track-meta-list">
  <template>
    <style include="give-shared-styles">
      :host {
        position: relative;
        overflow-x: auto;
        @apply --layout-vertical;
      }
      track-meta-entry[header] {
        --meta-entry-paper-material-mixin: {
          background: var(--default-primary-color);
          color: var(--dark-theme-text-color);
          font-weight: bold;
        };
      }
      .groupHeader {
        position: absolute;
        top: 0;
        left: 0;
      }
      .listHolder {
        @apply --layout-flex;
        @apply --layout-relative;
        min-width: 99.5em;
      }
      #loadingBlock {
        display: block;
        pointer-events: none;
        @apply --layout-fit;
        z-index: 1;
        opacity: 0.8;
        background: var(--card-background-color);
      }
      iron-list {
        @apply --layout-fit;
      }
      paper-spinner {
        position: absolute;
        top: 50%;
        margin-top: -12px;
        left: 50%;
        margin-left: -12px;
        height: 24px;
        width: 24px;
        opacity: 1;
      }
    </style>
    <template is="dom-if" if="[[!_readiness]]">
      <div id="loadingBlock">
        <paper-spinner id="loadingSpinner" alt="Loading card content" active\$="[[!_readiness]]"></paper-spinner>
      </div>
    </template>
    <!-- TODO: Filter bar: filter keyword and column selector -->
    <track-meta-entry header=""></track-meta-entry>
    <div class="listHolder">
      <track-meta-entry hidden\$="[[_hideGroupHeader()]]" class="groupHeader">
      </track-meta-entry>
      <iron-list id="trackList" items="[[_dispTrackArray]]" as="trackEntry" selection-enabled="[[selectionEnabled]]" on-selected-items-changed="_selectedItemsChangedHandler" multi-selection="">
        <template>
          <track-meta-entry data-obj="[[trackEntry.dataObj]]" selected="{{selected}}" allow-selection="[[selectionEnabled]]" group-selected="[[trackEntry.groupSelected]]" track-select-lock="[[trackEntry.trackSelected]]" is-group="[[trackEntry.isGroup]]">
          </track-meta-entry>
        </template>
      </iron-list>
    </div>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class TrackMetaList extends give.RefEmbedMixin(PolymerElement) {
    static get is () {
      return 'track-meta-list'
    }

    static get properties () {
      return {
        _dispTrackArray: {
          type: Array,
          value () {
            return []
          }
        },

        _groupHeader: {
          type: String,
          value: ''
        },

        _readiness: {
          type: Boolean,
          value: false
        },

        selectionEnabled: {
          type: Boolean,
          value: false
        },

        selectedTracks: {
          type: Array,
          value () {
            return []
          }
        },

        selectedGroups: {
          type: Array,
          value () {
            return []
          }
        },

        numOfGroupsSelected: {
          type: Number,
          value: 0,
          readOnly: true,
          notify: true
        },

        filterObj: {
          type: Object,
          value: null,
          observer: '_filterObjChanged'
        }
      }
    }

    constructor () {
      super(...arguments)
      this._groupEntryDict = {}
      this._trackGroupEntries = []
      this._inUpdatingSelection = false
      this._isReady = true
      this._savedSelectedGroups = null
      this._savedExtraSelectedTracks = null
      this._selectedSet = new Set()
    }

    _refreshRefTrackReady () {
      if (this.filterObj) {
        this._updateDispTrackArrayFiltered()
      } else {
        this._updateDispTrackArrayFull()
      }
      Promise.resolve().then(() => (this._readiness = true))
    }

    _clearDispArray () {
      this._inUpdatingSelection = true
      this._dispTrackArray = []
      this._trackGroupEntries.splice(0)
      this._groupEntryDict = {}
      this._inUpdatingSelection = false
    }

    _updateDispTrackArrayFull () {
      this._clearDispArray()
      let newArray = []
      for (var key in this._refObj.groups) {
        if (this._refObj.groups.hasOwnProperty(key) &&
          this._refObj.groups[key].length > 0
        ) {
          var groupEntry = {
            isGroup: true,
            dataObj: this._refObj.groups[key],
            index: newArray.length,
            selected: false,
            trackSelected: false,
            groupSelected: false
          }
          this._groupEntryDict[groupEntry.dataObj.id] = groupEntry
          newArray.push(groupEntry)
          this._trackGroupEntries.push(groupEntry)
          this._refObj.groups[key].forEach(function (track) {
            newArray.push({ dataObj: track, groupSelected: false })
          }, this)
        }
      }
      this._dispTrackArray = newArray
      Promise.resolve().then(() => this._syncSelection())
    }

    _updateDispTrackArrayFiltered () {
      this._clearDispArray()
      let newArray = []
      this._refObj.tracks.filter(track => this.filterObj.filter(track))
        .forEach(track => {
          newArray.push({ dataObj: track, groupSelected: false })
        })
      this._dispTrackArray = newArray
      Promise.resolve().then(() => this._syncSelection())
    }

    _syncSelection () {
      this._inUpdatingSelection = true
      this._dispTrackArray.forEach(dispElem => {
        if (this._selectedSet.has(dispElem.dataObj.id)) {
          this.$.trackList.selectItem(dispElem)
        }
      })
      this._inUpdatingSelection = false
      this._selectedItemsChangedHandler()
    }

    _refreshRef () {
      this.refReadyPromise.then(() => this._refreshRefTrackReady())
    }

    _setRefObj (refObj) {
      if (super._setRefObj(refObj)) {
        this._readiness = false
        this._savedExtraSelectedTracks = null
        this._savedSelectedGroups = null
        this._restoreSelectionArrays()
        if (this._refObj) {
          this._refreshRef()
        }
      }
    }

    _restoreSelectionArrays () {
      if (this._savedExtraSelectedTracks) {
        this._selectedSet.clear()
        this.selectedTracks = this._savedExtraSelectedTracks.slice()
        this.selectedGroups = this._savedSelectedGroups.slice()
        this.selectedTracks.reduce(
          (previous, current) => previous.add(current.id),
          this._selectedSet
        )
        this.selectedGroups.reduce(
          (previous, current) => previous.add(current.id),
          this._selectedSet
        )
      } else {
        this.splice('selectedGroups', 0)
        this.splice('selectedTracks', 0)
        this._selectedSet.clear()
      }
    }

    _getDisplayedItems (tracks) {
      if (Array.isArray(tracks) && this.filters) {
        return tracks.filter(this._filterTracks, this)
      }
      return tracks
    }

    _filterObjChanged (newValue, oldValue) {
      if (this._isReady) {
        this._readiness = false
        if (oldValue && !newValue) {
          // filterObj has been removed
          // restore all display and restore selection status
          // clear saved selection
          this._savedExtraSelectedTracks = null
          this._savedSelectedGroups = null
          this._updateDispTrackArrayFull()
        } else if (newValue) {
          // new filterObj is in place
          // save the current group selection to this._savedSelectedGroups
          this._savedSelectedGroups = this.selectedGroups.slice()
          // save the current track selection
          // __that will not pass the new filter__
          // to this._savedExtraSelectedTracks
          this._savedExtraSelectedTracks = this.selectedTracks.filter(
            track => !this.filterObj.filter(track)
          )
          this._updateDispTrackArrayFiltered()
        }
        Promise.resolve().then(() => (this._readiness = true))
      }
    }

    _hideGroupHeader () {
      return !this._groupHeader
    }

    _selectedItemsChangedHandler (e, detail) {
      if (this._isReady && !this._inUpdatingSelection) {
        this._inUpdatingSelection = true
        this._restoreSelectionArrays()
        let selectedItems = this.$.trackList.selectedItems
        if (!this.filterObj) {
          this._trackGroupEntries.forEach(groupEntry => {
            groupEntry.selected = false
            this.set('_dispTrackArray.' + groupEntry.index + '.trackSelected',
              false)
          })
          // Procedure: go through all selected tracks, if the tracks are
          // selected but the groups are not, select the group.
          for (let i = 0; i < selectedItems.length; i++) {
            this._selectedSet.add(selectedItems[i].dataObj.id)
            if (selectedItems[i].isGroup) {
              selectedItems[i].selected = true
            } else {
              this.push('selectedTracks', selectedItems[i].dataObj)
              this._selectedSet.add(selectedItems[i].dataObj.groupID)
              if (!this._groupEntryDict[selectedItems[i].dataObj.groupID]
                .trackSelected
              ) {
                this.set(
                  '_dispTrackArray.' +
                    this._groupEntryDict[selectedItems[i].dataObj.groupID]
                      .index + '.trackSelected',
                  true
                )
              }
            }
          }
          this._trackGroupEntries.forEach(groupEntry => {
            if (groupEntry.trackSelected && !groupEntry.selected) {
              this.$.trackList.selectIndex(groupEntry.index)
              groupEntry.selected = true
            }
            if (groupEntry.selected) {
              this.push('selectedGroups', groupEntry.dataObj)
            }
          }, this)
          this._dispTrackArray.forEach(function (dispTrackElem, index) {
            if (!dispTrackElem.isGroup) {
              if (
                this._groupEntryDict[dispTrackElem.dataObj.groupID].selected
              ) {
                this.set('_dispTrackArray.' + index + '.groupSelected', true)
              } else {
                this.set('_dispTrackArray.' + index + '.groupSelected', false)
              }
            }
          }, this)
          this.$.trackList.notifyResize()
        } else {
          // filterObj is active, no group entries will be shown
          // first, select all tracks and groups with tracks in selectedItems
          for (let i = 0; i < selectedItems.length; i++) {
            this.push('selectedTracks', selectedItems[i].dataObj)
            this._selectedSet.add(selectedItems[i].dataObj.id)
            if (!this._selectedSet.has(selectedItems[i].dataObj.groupID)) {
              this.push('selectedGroups',
                this._refObj.groups[selectedItems[i].dataObj.groupID])
              this._selectedSet.add(selectedItems[i].dataObj.groupID)
            }
          }
          // then update all tracks' groupSelected attribute
          this._dispTrackArray.forEach(function (dispTrackElem, index) {
            if (
              this._selectedSet.has(dispTrackElem.dataObj.groupID)
            ) {
              this.set('_dispTrackArray.' + index + '.groupSelected', true)
            } else {
              this.set('_dispTrackArray.' + index + '.groupSelected', false)
            }
          }, this)
        }
        this._setNumOfGroupsSelected(this.selectedGroups.length)
        Promise.resolve().then(() => (this._inUpdatingSelection = false))
      }
    }
    // TODO: use on-scroll event of iron-list to implement group label
    //    floating
  }

  give.TrackMetaList = TrackMetaList
  window.customElements.define('track-meta-list', give.TrackMetaList)

  return give
})(GIVe || {})
