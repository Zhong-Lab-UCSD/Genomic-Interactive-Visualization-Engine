/*
  List for tracks within one track group
  This DOM element must be placed in a flex container,
  otherwise the iron-list will not work
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '@polymer/paper-material/paper-material.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/iron-list/iron-list.js';
import '@polymer/iron-collapse/iron-collapse.js';
import '../track-control/track-mini-control.js';
import '../give-card/give-card-content-mixin.js';
import '../ref-embed-mixin/ref-embed-mixin.js';
import '../give-styles.js';
import '@webcomponents/shadycss/entrypoints/apply-shim.js';
import { beforeNextRender, afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="chart-track-group-list">
  <template>
    <style include="give-shared-styles iron-flex">
      :host {
        padding: 0.6em 0;
        position: relative;
        min-height: 2.65em;
        @apply --layout-vertical;
        @apply --layout-flex;
      }
      div.noTrackMsg {
        padding: 0 1em;
      }
      iron-list {
        padding: 0 1em;
        overflow-x: hidden;
        --iron-list-items-container: {
           @apply --chart-track-list-items-mixin;
        };
      }
    </style>
    <template is="dom-if" if="[[_listEmpty(group)]]">
      <div class="noTrackMsg"><em>(No tracks)</em></div>
    </template>
    <iron-list id="groupList" items="[[group.array]]" as="track" class="flex" selection-enabled="" multi-selection\$="[[!_computeSingleChoice(group)]]" on-selected-items-changed="_selectedItemsChangedHandler" selected-items="{{selected}}">
      <template>
        <track-mini-control track="[[track]]" selected="[[selected]]" single-choice="[[_computeSingleChoice(group)]]">
        </track-mini-control>
      </template>
    </iron-list>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class ChartTrackGroupList extends give.GiveCardContentMixin(PolymerElement) {
    constructor () {
      super(...arguments)
      this._updatingSelectedItems = false
      this._updatingGroups = false
    }

    static get is () {
      return 'chart-track-group-list'
    }

    static get properties () {
      return {
        settingKey: {
          type: String,
          value: give.GENEMO_SELECTED_KEY
        },

        group: {
          type: Object,
          observer: '_groupChanged',
          notify: true
        },

        instantChange: {
          type: Boolean,
          value: false
        },

        isSelected: {
          type: Boolean,
          value: false
        },

        allowTrackReordering: {
          type: Boolean,
          value: false
        },

        selected: {
          type: Array,
          value: function () {
            return []
          }
        },

        label: {
          type: String,
          value: ''
        },

        groupIcon: {
          type: String,
          value: null
        }
      }
    }

    ready () {
      super.ready()
      this._allowFlexShrink = !this.isSelected
      if (this.group) {
        this.groupIcon = this.groupIcon || this.group.icon
        this.label = this.label || this.group.label
      }
      this._setIcon(this.groupIcon || null)
      this._setIconAlt(this.label || 'Track group')
      this._setHeaderText(this.label || 'Track group')
    }

    /**
      * Called every time the element is inserted into the DOM. Useful for
      * running setup code, such as fetching resources or rendering.
      * Generally, you should try to delay work until this time.
      */
    connectedCallback () {
      super.connectedCallback()
      this.domReadyPromise = new Promise((resolve, reject) => {
        beforeNextRender(this, () => {
          if (this.isSelected && this.group) {
            this._syncGroupToSelection()
          }
          give._verbConsole.info('chartTrackGroupList: ready.')
          this._readiness = true
          resolve()
        })
      })
    }

    get contentHeight () {
      if (this.group) {
        return this._calcHeightBasedOnLines(this.displayedLines)
      }
      return null
    }

    get allowFlexShrink () {
      return this._allowFlexShrink &&
        this.displayedLines > this.constructor.MIN_SHRINKABLE_DISPLAY_LINES
    }

    get selectedArray () {
      if (this._computeSingleChoice(this.group)) {
        return this.selected ? [this.selected] : []
      } else {
        return this.selected
      }
    }

    _syncGroupToSelection () {
      if (!this.isSelected) {
        throw new give.GiveError(
          '_syncGroupToSelection() called on non-selected group list!'
        )
      }
      this._updatingSelectedItems = true
      this.$.groupList.clearSelection()
      afterNextRender(this, () => {
        this.group.forEach(
          (track, index) => this.$.groupList.selectIndex(index)
        )
        this._updatingSelectedItems = false
        this._updatingGroups = false
      })
    }

    _syncSelectionToGroup () {
      if (!this.isSelected) {
        throw new give.GiveError(
          '_syncSelectionToGroup() called on non-selected group list!'
        )
      }
      this._updatingSelectedItems = true
      // this.groupArray = this.selected.slice()
      this.group = give.TrackGroup.from(this.selected, this.group)
      this._updatingSelectedItems = false
    }

    _computeSingleChoice (group) {
      return !this.isSelected &&
        group.singleChoice && group.singleChoice !== '0'
    }

    _listEmpty (array) {
      return !array || !array.length
    }

    syncTrackSettingsToDom (scrollToSelected) {
      // this is used when resetting selection
      // DOM means this.$.groupList.selectedItems
      this._updatingSelectedItems = true
      if (this.group) {
        this.$.groupList.clearSelection()
        let firstSelected = null
        this.group.every((track, index) => {
          if (track.getSetting(this.settingKey)) {
            if (firstSelected === null) {
              firstSelected = index
            }
            this.$.groupList.selectIndex(index)
            return this.$.groupList.multiSelection
          }
          return true
        })
        if (scrollToSelected && firstSelected !== null) {
          // scroll to first selected item
          this.$.groupList.scrollToIndex(firstSelected)
        }
      }
      this._updateSelectedItems()
    }

    syncDomToTrackSettings () {
      // this is used when submitting the results
      if (this.group) {
        this.group.forEach((track, index) =>
          track.setSetting(this.settingKey, false)
        )
        if (this.$.groupList.selectedItems) {
          if (Array.isArray(this.$.groupList.selectedItems)) {
            this.$.groupList.selectedItems.forEach(track =>
              track.setSetting(this.settingKey, true))
          } else {
            this.$.groupList.selectedItem.setSetting(this.settingKey, true)
          }
        }
      }
    }

    resetAllTracks () {
      if (this.group) {
        this.group.forEach(track => track.resetSetting(this.settingKey))
        this.syncTrackSettingsToDom()
      }
    }

    applyFilter (map, flags) {
      this.group.forEach((track, index) => {
        if (flags.hasOwnProperty('matched') && map.hasOwnProperty(track.id)) {
          if (flags.matched) {
            this.$.groupList.selectIndex(index)
          } else {
            this.$.groupList.deselectIndex(index)
          }
        } else if (
          flags.hasOwnProperty('unmatched') && !map.hasOwnProperty(track.id)
        ) {
          if (flags.unmatched) {
            this.$.groupList.selectIndex(index)
          } else {
            this.$.groupList.deselectIndex(index)
          }
        }
      })
    }

    _selectedItemsChangedHandler (e) {
      if (this._readiness && !this._updatingSelectedItems &&
        !this._updatingGroups
      ) {
        this._updatingSelectedItems = true
        return Promise.resolve().then(() => this._updateSelectedItems(e.detail))
      }
    }

    _updateSelectedItems (eventDetail) {
      if (this._readiness && !this._updatingGroups) {
        if (this.instantChange) {
          this.syncDomToTrackSettings()
        }
        if (this.isSelected) {
          // remove the item that is not selected, then refresh the list
          this._syncSelectionToGroup()
        }
        give.fireSignal('selection-change', eventDetail, null, this)
        this._updatingSelectedItems = false
      }
    }

    get _collapsedInfoObject () {
      return {
        __tracks: this.selectedArray.length + ' / ' + this.group.length +
          ' tracks selected'
      }
    }

    _groupChanged (newValue, oldValue) {
      give.fireSignal('update-height', null, null, this)
      if (this.isSelected && this.group && !this._updatingGroups) {
        this._updatingGroups = true
        // Because the rendering of `<iron-list>` appears to have a debounce
        //    over ANIMATION_FRAME (which is after
        //    Polymer.RenderStatus.afterNextRender), this may cause problems in
        //    refreshing the selected tracks list.
        // Therefore, a forced `notifyResize()` is needed.
        this.$.groupList.notifyResize()
        this._syncGroupToSelection()
      }
    }

    syncSelectionFromExternalGroup (selectionGroup, scrollToFirst) {
      this._updatingSelectedItems = true
      // deselect the ones in `this.selected` but not in `selectionSet`
      for (let index = 0; index < this.selectedArray.length; index++) {
        let track = this.selectedArray[index]
        if (!selectionGroup.hasTrack(track)) {
          this.$.groupList.deselectItem(track)
          index--
        }
      }
      // select the ones in `selectionSet` but not in `this.selected`
      selectionGroup.forEach(track => {
        if (this.group.hasTrack(track)) {
          this.$.groupList.selectItem(track)
          if (scrollToFirst) {
            this.$.groupList.scrollToItem(track)
            scrollToFirst = false
          }
        }
      })
      this._updatingSelectedItems = false
    }

    get displayedLines () {
      if (!this.group || !this.group.length) {
        return 1
      }
      return Math.min(this.group.length,
        this.isSelected
          ? this.constructor.MAX_DISPLAY_LINES_SELECTED
          : this.constructor.MAX_DISPLAY_LINES)
    }

    _calcHeightBasedOnLines (lines) {
      return (lines * give.TrackMiniControl.heightProportion + 1.2) *
        parseFloat(window.getComputedStyle(this.shadowRoot.host)
          .getPropertyValue('font-size'))
    }

    // get _flexShrinkRatio () {
    //   if (this.group) {
    //     let displayedLines = this.displayedLines
    //     return displayedLines <= this.constructor.MIN_SHRINKABLE_DISPLAY_LINES
    //       ? 0 : this._calcHeightBasedOnLines(displayedLines)
    //   }
    // }

    get minContentHeight () {
      let displayedLines = this.displayedLines
      return displayedLines <= this.constructor.MIN_SHRINKABLE_DISPLAY_LINES
        ? this._calcHeightBasedOnLines(displayedLines)
        : this._calcHeightBasedOnLines(
          this.constructor.MIN_SHRINKABLE_DISPLAY_LINES
        )
    }
  }

  ChartTrackGroupList.MAX_DISPLAY_LINES_SELECTED = 8
  ChartTrackGroupList.MAX_DISPLAY_LINES = 45
  ChartTrackGroupList.MIN_SHRINKABLE_DISPLAY_LINES = 5

  give.ChartTrackGroupList = ChartTrackGroupList
  window.customElements.define(
    'chart-track-group-list', give.ChartTrackGroupList)

  return give
})(GIVe || {})
