/* <link rel="import" href="../meta-track-filter/meta-track-filter.html"> */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import { beforeNextRender, afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/av-icons.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../give-card/give-card-content-mixin.js';
import './chart-track-list.js';
import '../ref-object/ref-object.js';
import '../ref-embed-mixin/ref-embed-mixin.js';
import '../give-styles.js';
import '@webcomponents/shadycss/entrypoints/apply-shim.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="chart-track-ref-list">
  <template>
    <style include="give-shared-styles iron-flex">
    :host {
      padding: 0.25em 0.5em;
      @apply --layout-vertical;
      @apply --layout-justified;
    }
    chart-track-group-list {
      @apply --chart-track-list-items-mixin;
    }
    .cardActions {
      padding: 0;
      margin: 0.25em -0.5em -0.25em -0.5em;
    }
    </style>
    <template is="dom-if" if="[[showSelectedTracks]]" restamp="true">
      <give-card disable-folding="">
        <chart-track-group-list slot="body" id="selectedTrackList" group="{{selectedTracks}}" class="selectedTracks" group-icon="av:playlist-add-check" label="Selected tracks" setting-key="[[settingKey]]" is-selected="" allow-track-reordering="[[allowTrackReordering]]" priority-manager="[[priorityManager]]" on-selection-change="_selectionChangedInSelectedTracks">
        </chart-track-group-list>
      </give-card>
    </template>
    <template is="dom-repeat" id="groupBlock" items="[[groupArray]]" as="group">
      <!-- this is the track group DOM -->
      <give-card class="flex">
        <chart-track-group-list slot="body" group="[[group]]" setting-key="[[settingKey]]" instant-change="[[instantChange]]" priority-manager="[[priorityManager]]" on-selection-change="_updateSelectedTracks">
        </chart-track-group-list>
      </give-card>
    </template>
    <template is="dom-if" if="[[_calcControls(hasControls, withFilter)]]" restamp="true">
      <div class="cardActions" id="cardActionContainer">
        <template is="dom-if" if="[[withFilter]]" restamp="true">
          <paper-button on-tap="launchFilter">
            <iron-icon icon="filter-list"></iron-icon>
            Filter
          </paper-button>
          <paper-button on-tap="resetAllTracks">
            <iron-icon icon="refresh"></iron-icon>
            Reset to default
          </paper-button>
          <!-- <meta-track-filter id="trackFilter" ref='[[ref]]'
                on-filter-tracks="_filterTracksHandler"></meta-track-filter> -->
        </template>
        <template is="dom-if" if="[[hasControls]]" restamp="true">
          <paper-button on-tap="cancelChanges">
            <iron-icon icon="close"></iron-icon>
            Cancel
          </paper-button>
          <paper-button on-tap="submitChanges">
            <iron-icon icon="check"></iron-icon>
            OK
          </paper-button>
        </template>
      </div>
    </template>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class ChartTrackRefList extends give.GiveCardContentMixin(
    give.RefEmbedMixin(PolymerElement)) {
    constructor () {
      super(...arguments)
      this.domReadyPromise = null
    }
    static get is () {
      return 'chart-track-ref-list'
    }

    static get properties () {
      return {
        settingKey: {
          type: String,
          value: give.GENEMO_SELECTED_KEY
        },

        groupIcon: {
          type: String
        },

        groupArray: {
          type: Array,
          value: function () {
            return []
          }
        },

        groupIdList: {
          // this is the array of allowed group IDs in the list
          type: Array
        },

        defaultTrackIdList: {
          type: Array
        },

        showSelectedTracks: {
          type: Boolean,
          value: false
        },

        allowTrackReordering: {
          type: Boolean,
          value: false
        },

        /**
         * Whether the track controller will support filter function
         * @type {boolean}
         */
        withFilter: {
          type: Boolean,
          value: false
        },

        /**
         * Whether the track controller will reflect change immediately
         * without calling this.syncDomToTrackSettings().
         * This is always false if hasControls === true
         * @type {boolean}
         */
        instantChange: {
          type: Boolean,
          value: false
        },

        /**
         * Whether the track controller will show OK/Cancel controls
         * @type {boolean}
         */
        hasControls: {
          type: Boolean,
          value: false
        },

        /**
         * Selected tracks as a track group.
         * @type {give.TrackGroup}
         */
        selectedTracks: {
          type: Object,
          notify: true
        },

        priorityManager: {
          type: Object,
          notify: true
        },

        /**
         * Whether this component __has a parent to control track objects and
         *  selection__ (instead of as a stand-alone element), if this is set to
         *  `false`, it will attempt to handle data synchronization between the
         *  backend and the frontend automatically.
         *
         * If there is a parent responsible for synchronization (typically
         *  a `<chart-track-list>` element), setting this to `true` can reduce
         *  unnecessary computational cost.
         * @type  {boolean}
         */
        hasParent: {
          type: Boolean,
          value: false
        }
      }
    }

    /**
     * Use for one-time configuration of your component after local DOM is
     * initialized.
     */
    ready () {
      super.ready()
      this._allowFlexShrink = true
      this._setIcon(this.groupIcon || null)
      this._setIconAlt(this.label || 'Tracks')
      this._setHeaderText(this.label || 'Tracks')
      this._updatingSelection = false
    }

    /**
      * Called every time the element is inserted into the DOM. Useful for
      * running setup code, such as fetching resources or rendering.
      * Generally, you should try to delay work until this time.
      */
    connectedCallback () {
      super.connectedCallback()
      return this._refChanged(this.ref)
    }

    _calcControls (hasControls, withFilter) {
      return hasControls && withFilter
    }

    get contentHeight () {
      let giveCards = [...this.shadowRoot.querySelectorAll('give-card')]
      // add all height of group cards
      let height = giveCards.reduce(
        (height, card) => (
          height + 0.5 * this.fontSize +
            parseFloat(window.getComputedStyle(card)
              .getPropertyValue('flex-basis'))
        ), 0
      )
      if (this._calcControls(this.hasControls, this.withFilter)) {
        height += 0.5 * this.fontSize + parseFloat(window.getComputedStyle(
          this.shadowRoot.querySelector('#cardActionContainer')
        ).getPropertyValue('height')) - 0.5 * this.fontSize
      }
      return height
    }

    get fontSize () {
      return parseFloat(window.getComputedStyle(this.shadowRoot.host)
        .getPropertyValue('font-size'))
    }

    get minContentHeight () {
      let giveCards = [...this.shadowRoot.querySelectorAll('give-card')]
      // add all height of group cards
      let minHeight = giveCards.reduce(
        (minHeight, card) => (
          minHeight + 0.5 * this.fontSize +
            parseFloat(window.getComputedStyle(card)
              .getPropertyValue('min-height'))
        ),
        this._calcControls(this.hasControls, this.withFilter)
          ? 0 : 0.5 * this.fontSize
      )
      if (this._calcControls(this.hasControls, this.withFilter)) {
        minHeight += 0.5 * this.fontSize + parseFloat(window.getComputedStyle(
          this.shadowRoot.querySelector('#cardActionContainer')
        ).getPropertyValue('height')) - 0.5 * this.fontSize
      }
      return minHeight
    }

    _refreshRefTracks () {
      this.splice('groupArray', 0)
      this._totalTrackNumber = 0
      if (this.groupIdList && this.groupIdList.length > 0) {
        this.groupIdList.forEach(groupID => {
          if (this.refObj.groups.hasOwnProperty(groupID)) {
            this.push('groupArray', this.refObj.groups[groupID])
            this._totalTrackNumber += this.refObj.groups[groupID].length
          }
        })
      } else {
        for (let key in this.refObj.groups) {
          if (this.refObj.groups.hasOwnProperty(key)) {
            this.push('groupArray', this.refObj.groups[key])
            this._totalTrackNumber += this.refObj.groups[key].length
          }
        }
      }
      // If this component is a stand-alone element, call
      //  `this.syncPriorityManagerToDom()`. Otherwise
      //  `this.syncPriorityManagerToDom()` should be
      //  called explicitly in the parent to synchronize Dom and data model.
      return new Promise((resolve, reject) => {
        beforeNextRender(this, () => {
          this._trackGroupElems =
            [...this.shadowRoot.querySelectorAll('chart-track-group-list:not([is-selected])')]
          beforeNextRender(this,
            () => resolve(Promise.all(this._trackGroupElems.map(
              elem => elem.domReadyPromise
            )).then(() => {
              if (!this.hasParent) {
                afterNextRender(this,
                  () => this.syncPriorityManagerToDom(true))
              }
              this._readiness = true
              return this
            }))
          )
        })
      });
    }

    updateAllGroupDOM () {
      this._readiness = false
      this.domReadyPromise = this.refObj.initTracks()
        .then(() => this._refreshRefTracks())
      return this.domReadyPromise
    }

    static _prioritySort (itemA, itemB) {
      return itemA.priority < itemB.priority
        ? -1 : (itemA.priority > itemB.priority ? 1 : 0)
    }

    /**
     * Set the reference to new reference
     *
     * this will reset all tracks and redo the ref
     * note that the tracks should already be initialized before switching here
     *
     * @param  {string|GIVe.RefObject} newRef - New Reference, either name or
     *    GIVe.RefObject
     */
    _setRefObj (refObj) {
      // TODO: may need to add something to remove the override array
      if (super._setRefObj(refObj)) {
        this.groupIcon = this.groupIcon || this.refObj.iconLabel
        this.label = this.label || this.refObj.commonName
        this._setIcon(this.groupIcon || null)
        this._setIconAlt(this.label || 'Tracks')
        this._setHeaderText(this.label || 'Tracks')
        if (!this.hasParent && !this.priorityManager) {
          this.priorityManager = new give.PriorityManager(
            refObj, this.defaultTrackIdList, this.groupIdList)
        }
        return this.updateAllGroupDOM()
      }
    }

    syncPriorityManagerToDom (scrollToSelected) {
      // this is used when resetting selection or to initialize DOMs
      // use priorityManager to build `this.selectedTracks`
      if (!this._readiness) {
        throw new give.GiveError('Ref list not initialized!')
      }
      this._syncPriorityManagerToSelectedTracks()
      this._updatingSelection = true
      this._trackGroupElems.forEach(
        elem => elem.syncTrackSettingsToDom(scrollToSelected))
      this._updatingSelection = false
    }

    _syncPriorityManagerToSelectedTracks () {
      if (this.refObj) {
        this._updatingSelection = true
        this.selectedTracks =
          this.constructor.getSelectedTracksFromPriorityManager(
            this.refObj, this.priorityManager, this.selectedTracks
          )
        this._updatingSelection = false
      }
    }
    
    static getSelectedTracksFromPriorityManager (
      refObj, priorityManager, oldSelectedTracks
    ) {
      return give.TrackGroup.from(
        priorityManager.trackIdList.map(
          trackId => refObj.tracks.get(trackId)
        ).filter(track => !(track instanceof give.CoorTrack)),
        oldSelectedTracks
      )
    }

    static getInitSelectedTracksFromPriorityManager(
      refObj, priorityManager, oldSelectedTracks
    ) {
      return give.TrackGroup.from(
        priorityManager.initTrackIdList.map(
          trackId => refObj.tracks.get(trackId)
        ).filter(track => !(track instanceof give.CoorTrack)),
        oldSelectedTracks
      )
    }
    
    syncDomToTrackSettings () {
      // this is used when submitting the results
      // convert `this.selectedTracks` to priorityManager
      if (!this._readiness) {
        throw new give.GiveError('Ref list not initialized!')
      }
      if (this.priorityManager.syncFromGroup(this.selectedTracks, true)) {
        this._trackGroupElems.forEach(elem => elem.syncDomToTrackSettings())
        // orders of selectedTracks may have changed
        this._syncPriorityManagerToSelectedTracks()
        this.notifyPath('priorityManager')
        return true
      }
      return false
    }

    resetAllTracks () {
      if (!this._readiness) {
        throw new give.GiveError('Ref list not initialized!')
      }
      if (!this.hasParent || this.instantChange) {
        this.priorityManager.reset(
          this.refObj, this.defaultTrackIdList, this.groupIdList)
        return this.syncPriorityManagerToDom()
      } else {
        this._updatingSelection = true
        this.selectedTracks =
          this.constructor.getInitSelectedTracksFromPriorityManager(
            this.refObj, this.priorityManager, this.selectedTracks
          )
        this._updatingSelection = false
        this._syncSelectionToGroups(true)
      }
    }

    _signalClose () {
      give.fireSignal('list-collapse', null, null, this)
    }

    /**
     * launchFilter - Show track filter element
     */
    launchFilter () {
      if (this.shadowRoot.querySelector('#trackFilter')) {
        this.shadowRoot.querySelector('#trackFilter').show()
      }
    }

    /**
     * _filterTracksHandler - Event handler to filter the track
     *
     * @param  {Object} e - event from the track filter element
     */
    _filterTracksHandler (e) {
      if (!e.detail.targetId || e.detail.targetId === this.id) {
        e.stopPropagation()
        this.applyFilter(e.detail.map, e.detail.flags)
      }
      // Otherwise the filter wants to change some other list (extremely rare),
      // when whoever listens to filter-tracks event will handle.
    }

    submitChanges () {
      return this.syncDomToTrackSettings().then(() => this._signalClose())
    }

    cancelChanges () {
      return this.syncPriorityManagerToDom().then(() => this._signalClose())
    }

    applyFilter (map, flags) {
      if (!this._readiness) {
        throw new give.GiveError('Ref list not initialized!')
      }
      this._updatingSelection = true
      this._trackGroupElems.forEach(elem => elem.applyFilter(map, flags))
      this._updatingSelection = false
      this._updateSelectedTracks()
    }

    _updateSelectedTracks () {
      if (!this._updatingSelection) {
        this._updatingSelection = true
        let selectedArray = this._trackGroupElems.reduce(
          (trackArray, elem) => trackArray.concat(elem.selectedArray),
          [])
        this.selectedTracks = give.TrackGroup.from(
          selectedArray, this.selectedTracks, true)
        this._updatingSelection = false
      }
    }

    get _collapsedInfoObject () {
      return {
        __tracks: this.selectedTracks.length + ' / ' + this._totalTrackNumber +
          ' tracks selected'
      }
    }

    _selectionChangedInSelectedTracks (e) {
      return this._syncSelectionToGroups()
    }

    _syncSelectionToGroups (scrollToSelected) {
      if (!this._updatingSelection) {
        this._updatingSelection = true
        // this.selectedTracks = give.TrackGroup.from(
        //   this.shadowRoot.querySelector('#selectedTrackList').selectedArray,
        //   this.selectedTracks
        // )
        this._trackGroupElems.forEach(
          elem => elem.syncSelectionFromExternalGroup(
            this.selectedTracks, scrollToSelected))
        this._updatingSelection = false
      }
    }
  }

  give.ChartTrackRefList = ChartTrackRefList
  window.customElements.define(
    'chart-track-ref-list', give.ChartTrackRefList)

  return give
})(GIVe || {})
