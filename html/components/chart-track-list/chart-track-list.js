/* <link rel="import" href="../meta-track-filter/meta-track-filter.html"> */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/av-icons.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '../give-card/give-card.js';
import './chart-track-ref-list.js';
import './chart-track-group-list.js';
import '../ref-object/ref-object.js';
import '../give-styles.js';
import '../priority-manager/priority-manager.js';
import '@webcomponents/shadycss/entrypoints/apply-shim.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="chart-track-list">
  <template>
    <style include="give-shared-styles iron-flex iron-flex-alignment">
    :host {
      display: block;
      @apply --layout-vertical;
    }
    chart-track-group-list {
      @apply --chart-track-list-items-mixin;
    }
    div#contents {
      margin: 0;
      padding: 0.25em 0.5em;
      overflow-y: auto;
    }
    div.cardActions {
      padding: 0;
      margin: 0;
    }
    div.collapsedActions {
      margin: 0.5em -0.25em;
    }
    div.collapsedActions > paper-button {
      margin: 0 0.25em;
    }
    paper-button > iron-icon {
      width: 1.5em;
      height: 1.5em;
      margin-right: 0.3em;
    }
    paper-button.coloredText {
      color: var(--default-primary-color);
    }
    </style>
    <!-- Selected tracks DOM, by reference -->
    <div id="contents" class="flex layout vertical">
      <template is="dom-if" if="[[_calcShowSelected(showSelectedTracks, selectedTracksOnly)]]" restamp="true">
        <template is="dom-repeat" id="selectedTracksBlock" items="{{_refItemArray}}" as="refItemSelected">
          <give-card disable-folding="">
            <chart-track-group-list slot="body" group="{{refItemSelected.selectedTracks}}" group-icon="av:playlist-add-check" label="[[_calcSelectedTrackGroupLabel(refItemSelected.refObj)]]" setting-key="[[settingKey]]" is-selected="" allow-track-reordering="[[allowTrackReordering]]" on-selection-change="_selectionChangedInSelectedTracks">
            </chart-track-group-list>
          </give-card>
        </template>
      </template>
      <template is="dom-if" if="[[_calcCollapsedState(collapsable, selectedTracksOnly)]]">
        <div class="collapsedActions layout horizontal end-justified center">
          <paper-button on-tap="resetAllTracks" raised="">
            <iron-icon icon="settings-backup-restore"></iron-icon>
            Default tracks
          </paper-button>
          <paper-button on-tap="expand" class="colored" raised="">
            <iron-icon icon="add"></iron-icon>
            Add tracks
          </paper-button>
        </div>
      </template>
      <template is="dom-if" if="[[!_calcCollapsedState(collapsable, selectedTracksOnly)]]">
        <template is="dom-repeat" id="trackRefBlock" items="{{_refItemArray}}" as="refItem">
          <!-- Candidate tracks DOM, by reference -->
          <give-card class="flex">
            <chart-track-ref-list slot="body" ref="[[refItem.db]]" has-parent="" group-icon="[[_calcRefIcon(refItem.refObj)]]" label="[[_calcRefLabel(refItem.refObj)]]" setting-key="[[settingKey]]" group-id-list="[[groupIdList]]" selected-tracks="{{refItem.selectedTracks}}" instant-change="[[instantChange]]" priority-manager="{{refItem.priorityManager}}">
            </chart-track-ref-list>
          </give-card>
        </template>
      </template>
    </div>
    <template is="dom-if" if="[[!_calcCollapsedState(collapsable, selectedTracksOnly)]]">
      <div class="cardActions layout horizontal end-justified center">
        <template is="dom-if" if="[[withFilter]]" restamp="true">
          <paper-button on-tap="launchFilter">
            <iron-icon icon="filter-list"></iron-icon>
            Filter
          </paper-button>
          <!-- <meta-track-filter id="trackFilter" ref='[[ref]]'
            on-filter-tracks="_filterTracksHandler"></meta-track-filter> -->
        </template>
        <template is="dom-if" if="[[_calcControls(hasControls, collapsable, selectedTracksOnly)]]" restamp="true">
          <paper-button on-tap="resetAllTracks">
            <iron-icon icon="settings-backup-restore"></iron-icon>
            Default
          </paper-button>
          <paper-button on-tap="cancelChanges">
            <iron-icon icon="close"></iron-icon>
            Cancel
          </paper-button>
          <paper-button on-tap="submitChanges" class="coloredText">
            <iron-icon icon="check"></iron-icon>
            Update
          </paper-button>
        </template>
      </div>
    </template>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class ChartTrackList extends mixinBehaviors([
    IronResizableBehavior
  ], give.PriorityManagerCollectionEmbedMixin(PolymerElement)) {
    constructor () {
      super()
      this._updatingRef = false
      this._refTrackLists = []
      this.domReadyPromise = null
      this._updatingSelection = false
    }

    static get is () {
      return 'chart-track-list'
    }

    static get properties () {
      return {
        settingKey: {
          type: String,
          value: give.GENEMO_SELECTED_KEY
        },

        _refItemArray: {
          type: Array,
          value: function () {
            return []
          }
        },

        /**
         * Whether the list will include a part showing all selected tracks.
         * The list of selected tracks will immediately update if any track
         *  inside the list is unselected to achieve a "remove-track" effect.
         * @type {boolean}
         */
        showSelectedTracks: {
          type: Boolean,
          value: false
        },

        /**
         * Whether the list includes selected tracks __only__. This attribute is
         *    honored only when `this.collapsable` is `true`.
         * If this is set to `true`, the following properties will not be
         *    honored and will be treated as:
         *    * `this.showSelectedTracks` as if `true`,
         *    * `this.instantChange` as if `true`,
         *    * `this.withFilter` as if `false`,
         *    * `this.hasContorls` as if `false`.
         * If this is set to `false`, the following properties will not be
         *    honored and will be treated as:
         *    * `this.hasContorls` as if `true`.
         *    (All other properties will be honored as usual)
         * @type {boolean}
         */
        selectedTracksOnly: {
          type: Boolean,
          value: false,
          observer: '_collapseChangedObserver'
        },

        /**
         * Whether the list has a dual state, the fully expanded state and the
         *    collapsed (selected tracks only) state.
         * @type {boolean}
         */
        collapsable: {
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
        }
      }
    }

    _calcRefIcon (refObj) {
      return refObj.iconLabel
    }

    _calcRefLabel (refObj) {
      return refObj.commonName + ' (' + refObj.db + ') tracks'
    }

    // _calcPriorityManager (db) {
    //   return this.priorityManagers[db]
    // }

    _calcSelectedTrackGroupLabel (refObj) {
      return 'Selected tracks (' + refObj.db + ')'
    }

    _calcShowSelected (showSelectedTracks, collapsable, selectedTracksOnly) {
      return showSelectedTracks ||
        this._calcCollapsedState(collapsable, selectedTracksOnly)
    }

    _calcCollapsedState (collapsable, selectedTracksOnly) {
      return collapsable && selectedTracksOnly
    }

    get isCollapsed () {
      return this._calcCollapsedState(this.collapsable, this.selectedTracksOnly)
    }

    _calcControls (hasControls, collapsable, selectedTracksOnly) {
      return hasControls || (collapsable && !selectedTracksOnly)
    }

    _collapseChangedObserver (newCollapsedState, oldCollapsedState) {
      if (this.collapsable && !this.selectedTracksOnly) {
        // just expanded, synchronize the group selections
        afterNextRender(this, () => {
          this._refTrackLists =
            [...this.shadowRoot.querySelectorAll('chart-track-ref-list')]
          // notify all changes involving selectedTracks and priorityManager
          this._refItemArray.forEach((refItem, index) => {
            this.notifyPath('_refItemArray.' + index + '.priorityManager')
            this.notifyPath('_refItemArray.' + index + '.selectedTracks')
          })
          this._syncSelectionToGroups(true)
        })
      }
    }

    /**
     * _refreshRefTracks - refresh the selected status of all reference tracks
     *    and update `this._selectedTracks` object (and the DOMs associated with
     *    `this._selectedTracks`).
     *
     * @return {Promise<object>} A promise that resolves to
     *    `this._selectedTracks`.
     */
    _refreshRefTracks (scrollToSelected) {
      return new Promise((resolve, reject) => {
        afterNextRender(this, () => {
          this._refTrackLists =
            [...this.shadowRoot.querySelectorAll('chart-track-ref-list')]
          // By this time the `refObj`s should all have been initialized by
          //    `this.groupIdList` and/or `this.defaultIdList`
          resolve(Promise.all(this._refTrackLists.map(
            elem => elem.domReadyPromise
          )).then(() => {
            this._readiness = true
            this.syncPriorityManagerToDom(scrollToSelected)
            return this
          }))
        })
      });
    }

    _getUniqueRefArrayFromJson (refJsonString) {
      refJsonString = refJsonString || this.ref
      let refSet = new Set()
      let refArray = [refJsonString]
      try {
        let parsed = JSON.parse(refJsonString)
        if (Array.isArray(parsed)) {
          refArray = parsed
        }
      } catch (ignore) { }
      if (refArray.length <= 0) {
        return []
      } else {
        refArray.forEach(ref => refSet.add(ref))
      }
      return [...refSet.values()]
    }

    _syncRefJsonToArray () {
      this._refArray = this._getUniqueRefArrayFromJson(this.ref)
      return this.priorityManagersReadyPromise.then(() => {
        this._refItemArray = this._refArray.map((refDbName, index) => {
          let refObj = give.RefObject.findRefByDb(refDbName)
          return {
            db: refDbName,
            refObj: give.RefObject.findRefByDb(refDbName),
            selectedTracks: new give.TrackGroup(),
            priorityManager: this.priorityManagers[refObj.db]
          }
        })
        this._refItemArray.forEach((refItem, index) => {
          this.linkPaths('priorityManagers.' + refItem.db,
            '_refItemArray.' + index + '.priorityManager')
        })
      })
    }

    _refChanged (newValue, oldValue) {
      if (!this._updatingRef) {
        return (this.domReadyPromise = give.RefObject.allRefPromise.then(
          () => this._syncRefJsonToArray()
        ).then(() => this._refreshRefTracks(true)))
      }
    }

    static _prioritySort (itemA, itemB) {
      return itemA.priority < itemB.priority
        ? -1 : (itemA.priority > itemB.priority ? 1 : 0)
    }

    syncPriorityManagerToDom (scrollToSelected) {
      // this is used when resetting selection
      if (!this._readiness) {
        throw new give.GiveError('Track list not initialized!')
      }
      if (!this.isCollapsed) {
        this._refTrackLists.forEach(refTrackElem =>
          refTrackElem.syncPriorityManagerToDom(scrollToSelected))
      } else {
        this._refItemArray.forEach((refItem, index) => {
          refItem.selectedTracks =
            give.ChartTrackRefList.getSelectedTracksFromPriorityManager(
              refItem.refObj,
              refItem.priorityManager,
              refItem.selectedTracks
            )
          this.notifyPath('_refItemArray.' + index + '.selectedTracks')
        })
      }
    }

    syncDomToTrackSettings () {
      // this is used when submitting the results
      if (!this._readiness) {
        throw new give.GiveError('Track list not initialized!')
      }
      let results = this._refTrackLists.map(
        refTrackElem => refTrackElem.syncDomToTrackSettings())
      this.notifyPath('priorityManagers.*')
      return results.some(result => result)
    }

    resetAllTracks () {
      if (!this._readiness) {
        throw new give.GiveError('Track list not initialized!')
      }
      if (this.isCollapsed) {
        this._refItemArray.forEach((refItem, index) => {
          refItem.priorityManager.reset(refItem.refObj)
          this.notifyPath('_refItemArray.' + index + '.priorityManager')
        })
        this.syncPriorityManagerToDom()
        give.fireSignal('update-track-list', null, null, this)
      } else {
        this._refTrackLists.forEach(
          elem => elem.resetAllTracks())
      }
    }

    expand () {
      if (this.collapsable) {
        this.selectedTracksOnly = false
        give.fireSignal('list-expand', null, null, this)
      }
    }

    collapse () {
      if (this.collapsable) {
        this.selectedTracksOnly = true
      }
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

    _selectionChangedInSelectedTracks (e) {
      return this._syncSelectionToGroups()
    }

    _syncSelectionToGroups (scrollToSelected) {
      if (!this._updatingSelection) {
        this._updatingSelection = true
        if (!this.isCollapsed) {
          this._refTrackLists.forEach(
            elem => elem._syncSelectionToGroups(scrollToSelected))
        } else {
          // commit selections without any `<chart-track-ref-list>` element
          this._refItemArray.forEach((refItem, index) => {
            if (this.groupIdList && this.groupIdList.length > 0) {
              this.groupIdList.forEach(groupID => {
                if (refItem.refObj.groups.hasOwnProperty(groupID)) {
                  let group = refItem.refObj.groups[groupID]
                  group.forEach(track => track.setSetting(
                    this.settingKey, refItem.selectedTracks.hasTrack(track))
                  )
                }
              })
            } else {
              for (let key in refItem.refObj.groups) {
                if (refItem.refObj.groups.hasOwnProperty(key)) {
                  let group = refItem.refObj.groups[key]
                  group.forEach(track => track.setSetting(
                    this.settingKey, refItem.selectedTracks.hasTrack(track))
                  )
                }
              }
            }
            refItem.priorityManager.syncFromGroup(
              refItem.selectedTracks, true)
            this.notifyPath('_refItemArray.' + index + '.priorityManager')
          })
          give.fireSignal('update-track-list', null, null, this)
        }
        this._updatingSelection = false
      }
    }

    submitChanges () {
      if (this.syncDomToTrackSettings()) {
        give.fireSignal('update-track-list', null, null, this)
      }
      this.collapse()
    }

    cancelChanges () {
      this.syncPriorityManagerToDom()
      this.collapse()
    }

    applyFilter (map, flags) {
      if (!this._readiness) {
        throw new give.GiveError('Track list not initialized!')
      }
      this._refTrackLists.forEach(
        refTrackElem => refTrackElem.applyFilter(map, flags))
    }
  }

  give.ChartTrackList = ChartTrackList
  window.customElements.define('chart-track-list', give.ChartTrackList)

  return give
})(GIVe || {})
