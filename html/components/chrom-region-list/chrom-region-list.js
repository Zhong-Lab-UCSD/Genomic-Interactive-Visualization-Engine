import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-list/iron-list.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../chrom-region-selector/chrom-region-selector.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.ChromRegionList = Polymer({
    _template: html`
    <style include="give-shared-styles iron-flex iron-positioning">
    :host {
      display: block;
    }
    iron-list {
      padding: 0.5em;
      --iron-list-items-container: {
        margin: auto;
      };
    }
    #noResultContainer {
      padding: 0.8em;
    }
    paper-button {
      font-size: 0.9em;
      margin: 0
    }
    </style>
    <paper-card hidden\$="[[regionListEmpty]]" class="layout vertical fit">
      <div class="card-content flex" id="listContainer">
        <iron-list id="regionListDom" items="[[regionDispList]]" class="fit">
          <template>
            <chrom-region-selector id="[[item.name]]" region="[[item]]"></chrom-region-selector>
          </template>
        </iron-list>
      </div>
      <div class="card-actions">
        <a href\$="[[bedFileLink]]" download\$="[[bedFileName]]" id="bedLink" class="buttonLink" tabindex="-1">
          <paper-button id="downloadBed">
            <iron-icon icon="file-download"></iron-icon>Download BED File
          </paper-button>
        </a>
      </div>
    </paper-card>
    <div id="noResultContainer" hidden\$="[[!regionListEmpty]]">
      No result to display. <span>[[_getNoResultInfo(firstRun)]]</span>
    </div>
`,

    is: 'chrom-region-list',

    behaviors: [
      give.GenemoTabCardContentBehavior
    ],

    properties: {

      regionDispList: {
        type: Array,
        value: function () {
          return []
        }
      },

      textSize: {
        type: Number,
        value: 12    // unit is px
      },

      bedFileLink: {
        type: String,
        value: ''
      },

      bedFileName: {
        type: String,
        value: ''
      },

      regionListEmpty: {
        type: Boolean,
        readOnly: true,
        value: false
      },

      pageSize: {
        type: Number,
        value: 500
      },

      currentPage: {
        type: Number,
        value: 0,
        observer: '_pageNumChanged'
      }

    },

    created: function () {
      this.regionList = []
    },

    ready: function () {
      this._setIcon('list')
      this._setIconAlt('Results')
      this._setHeaderText('Results')
      this._setTabText('Results')

      this.firstRun = true

      this.setDOMReady(true)
      this.setReady(false)
    },

    _pageNumChanged: function (notReady) {
      if (this.currentPage * this.pageSize > this.regionList.length) {
        this.currentPage = 0
        return
      }
      this.setReady(false)
      this.async(this._updateContent.bind(this, notReady))
    },

    _updateContent: function (notReady) {
      this.splice('regionDispList', 0, this.regionDispList.length)
      if (this.regionList.length > 0) {
        for (var i = this.currentPage * this.pageSize;
          i < this.regionList.length &&
            i < (this.currentPage + 1) * this.pageSize;
          i++) {
          this.push('regionDispList', this.regionList[i])
        }
      }
      if (!this.firstRun && !notReady) {
        this.setReady(true)
      }
    },

    _getNoResultInfo: function (firstRun) {
      return firstRun
        ? 'Please use the query panel to get results.'
        : 'Please change your query to get results.'
    },

    setList: function (newList, annotationLine, inputFileName, notReady) {
      newList = newList || []
      this.regionList = newList
      this.splice('regionDispList', 0, this.regionDispList.length)
      if (this.regionList.length > 0) {
        this.setBEDFileLink(annotationLine, inputFileName)
        this.firstRun = false
        this._setRegionListEmpty(false)
      } else {
        this._setRegionListEmpty(true)
      }
      this._pageNumChanged(notReady)
    },

    getListBED: function (includeStrand) {
      var result = ''
      this.regionList.forEach(function (region) {
        result += region.regionToBed(includeStrand) + '\n'
      })
      return result
    },

    setBEDFileLink: function (annotationLine, inputFileName) {
      // bedFileLink is the link for BED files (global object)
      if (this.bedFileLink !== null) {
        window.URL.revokeObjectURL(give.bedFileLink)
      }

      inputFileName = inputFileName || ''
      annotationLine = annotationLine || ''

      if (this.regionList.length > 0) {
        // change the write BED part
        var inputFileNameStem = (inputFileName.lastIndexOf('.') >= 0)
          ? inputFileName.substring(0, inputFileName.lastIndexOf('.'))
          : inputFileName

        var BEDdata = new window.Blob([annotationLine +
          this.getListBED()], {type: 'text/plain'})
        this.bedFileLink = window.URL.createObjectURL(BEDdata)
        this.bedFileName = inputFileNameStem + '_result.bed'
      }
    }
  })

  return give
})(GIVe || {})
