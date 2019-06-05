import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/iron-pages/iron-pages.js';
import '../meta-entries/meta-entries.js';
import '../ref-embed-mixin/ref-embed-mixin.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
var GIVe = (function (give) {
  'use strict'

  Polymer({
    _template: html`
    <style include="give-shared-styles">
    :host {
      display: block;
      position: relative;
      height: 350px;
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      font-size: 12px;
    }
    iron-pages > div {
      height: 300px;
      overflow-y: auto;
      margin: 5px 0;
    }
    paper-checkbox {
      width: 150px;
      margin: 0.3em;
      overflow: hidden;
      vertical-align: middle;
      --paper-checkbox-label: {
        width: 124px;
      };
    }
    paper-tabs {
      --paper-tabs: {
        background: var(--light-primary-color);
      };
    }
  </style>
    <paper-tabs id="mainTabs" selected="{{selectedTab}}">
      <paper-tab>Experiment</paper-tab>
      <paper-tab>Tissue</paper-tab>
      <paper-tab>Cell Line</paper-tab>
      <paper-tab>Lab</paper-tab>
    </paper-tabs>

    <iron-pages id="listPages" selected="[[selectedTab]]">
      <div id="expPage">
        <template is="dom-repeat" items="[[expList]]">
          <paper-checkbox noink="" value="[[index]]">
            <span>[[item.name]]</span>
          </paper-checkbox>
        </template>
      </div>
      <div id="tissuePage">
        <template is="dom-repeat" items="[[tissueList]]">
          <paper-checkbox noink="" value="[[index]]">
            <span>[[item.name]]</span>
          </paper-checkbox>
        </template>
      </div>
      <div id="cellPage">
        <template is="dom-repeat" items="[[cellTypeList]]">
          <paper-checkbox noink="" value="[[index]]">
            <span>[[item.name]]</span>
          </paper-checkbox>
        </template>
      </div>
      <div id="labPage">
        <template is="dom-repeat" items="[[labList]]">
          <paper-checkbox noink="" value="[[index]]">
            <span>[[item.name]]</span>
          </paper-checkbox>
        </template>
      </div>
    </iron-pages>
`,

    is: 'genemo-track-filter-pages',

    behaviors: [
      give.RefEmbedMixin
    ],

    properties: {

      selectedTab: {
        type: Number,
        value: 0
      },

      initialized: {
        type: Boolean,
        value: false,
        readOnly: true
      },

      expList: {
        type: Array,
        value: function () {
          return []
        }
      },

      cellTypeList: {
        type: Array,
        value: function () {
          return []
        }
      },

      tissueList: {
        type: Array,
        value: function () {
          return []
        }
      },

      labList: {
        type: Array,
        value: function () {
          return []
        }
      },

      listOfLists: {
        type: Array,
        value: function () {
          return []
        }
      }

    },

    _setRefObj: function (refObj) {
      this._refObj = refObj
      this._clearForRef()
      if (this._refObj) {
        this._refObj.initMetaFilter().then(() => this._loadRef(refObj))
          .catch(() => {
            // TODO: remove spinner and show something saying meta data
            // not available
          })
      }
    },

    _clearForRef: function () {
      this._setInitialized(false)
      this.listOfLists.splice(0, this.listOfLists.length)
      this.splice('expList', 0, this.expList.length)
      this.splice('tissueList', 0, this.tissueList.length)
      this.splice('cellTypeList', 0, this.cellTypeList.length)
      this.splice('labList', 0, this.labList.length)
    },

    _loadRef: function (refObj) {
      // If user changes references too fast, it might happen that the
      // refObj called by this function is not the one this element
      // is changed into right now
      if (this._refObj && refObj && this._refObj.db === refObj.db) {
        var key

        if (refObj.metaFilter.expMap) {
          for (key in refObj.metaFilter.expMap) {
            if (refObj.metaFilter.expMap.hasOwnProperty(key)) {
              this.push('expList', { name: refObj.metaFilter.expMap[key].name, ids: refObj.metaFilter.expMap[key] })
            }
          }
          this.listOfLists.push(this.expList)
        }

        if (refObj.metaFilter.tissueMap) {
          for (key in refObj.metaFilter.tissueMap) {
            if (refObj.metaFilter.tissueMap.hasOwnProperty(key)) {
              this.push('tissueList', { name: key, ids: refObj.metaFilter.tissueMap[key] })
            }
          }
          this.listOfLists.push(this.tissueList)
        }

        if (refObj.metaFilter.cellLineMap) {
          for (key in refObj.metaFilter.cellLineMap) {
            if (refObj.metaFilter.cellLineMap.hasOwnProperty(key)) {
              this.push('cellTypeList', { name: key, ids: refObj.metaFilter.cellLineMap[key] })
            }
          }
          this.listOfLists.push(this.cellTypeList)
        }

        if (refObj.metaFilter.labMap) {
          for (key in refObj.metaFilter.labMap) {
            if (refObj.metaFilter.labMap.hasOwnProperty(key)) {
              this.push('labList', { name: key, ids: refObj.metaFilter.labMap[key] })
            }
          }
          this.listOfLists.push(this.labList)
        }

        this._setInitialized(true)
      }
    },

    getCurrentListMap: function () {
    // get the ids that corresponding to the current selection
      var result = []
      var resultMap = {}
      var checkboxList = dom(this.$.listPages.selectedItem).querySelectorAll('paper-checkbox')
      for (var i = 0; i < checkboxList.length; i++) {
        if (checkboxList[i].checked) {
          result = result.concat(this.listOfLists[this.selectedTab][i].ids)
        }
      }

      // convert id to map
      result.forEach(function (id) {
        resultMap[id] = true
      })

      return resultMap
    },

    setAllCheckboxes: function (flag) {
    // set all checkboxes to one value (flag)
      var checkboxList = dom(this.$.listPages.selectedItem).querySelectorAll('paper-checkbox')
      for (var i = 0; i < checkboxList.length; i++) {
        checkboxList[i].checked = flag
      }
    }
  })
  return give
})(GIVe || {})
