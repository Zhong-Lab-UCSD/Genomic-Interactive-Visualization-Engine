import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-button/paper-button.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.SearchCardContent = Polymer({
    _template: html`
    <style include="give-shared-styles">
    :host {
      display: block;
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.2em;
      vertical-align: middle;
      padding: 1em;
    }
    a:link {
      color: #FF9800;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    a:active {
      text-decoration: underline;
    }
    a:visited {
      color: #3F51B5;
    }
    /************************** Polymer and Material Design components below *********************/

    .vertTextBottomContainer > paper-dropdown-menu {
      padding: 0 0.4em 0 0.15em;
    }
    .vertMargined {
      margin: 0.2em 0;
    }
    .sampleButton {
      min-width: 7.5em;
    }
    </style>
    <iron-signals on-iron-signal-disable="signalDisabled" on-iron-signal-encodecheck="signalEncodeCheck"></iron-signals>
    <div class="vertMargined">
      <div class="vertTextBottomContainer clearFix">
        <div><span id="Reference" class="text">Reference: </span></div>
        <paper-dropdown-menu id="regionDropdown" label="Reference" class="vertMargined text" no-label-float="">
          <paper-menu class="dropdown-content" id="refToUpload" attr-for-selected="value" selected="{{currentRef}}">
            <template is="dom-repeat" items="[[ref]]" filter="_encodeFilter">
              <paper-item value="[[item.db]]"><span>[[item.db]]</span> (<span>[[item.commonName]]</span>)</paper-item>
            </template>
          </paper-menu>
        </paper-dropdown-menu>
        <paper-button id="fillSample" class="rightFloat vertMargined sampleButton" noink="" raised="" on-tap="fillSampleHandler"><span id="Use sample" class="text">Use sample</span></paper-button>
      </div>
      <paper-input id="urlFileInput" class="fullWidth text" label="URL for data file" floatinglabel="true" value="{{InputUrl}}"></paper-input>
      <paper-button class="fullWidth" raised="" noink="" id="fileSelectButton" on-tap="fileSelectionHandler">[[uploadButtonText]]</paper-button>
      <input style="display: none;" type="file" id="uploadFileInput" name="uploadFileInput" on-change="inputFileChangedFunc">
      <paper-tooltip fit-to-visible-bounds="" position="bottom" class="fullWidth" offset="-1"> <span id="Search against" class="text">Please specify the reference genome you would like to search against, then upload your custom peak file below for analysis. Either put your file on a public server and provide the URL, or directly upload the file here. (<a href="/goldenPath/help/customTrack.html#BED" target="_blank">BED, peaks format</a> files are accepted either by uploading or providing URL, <a href="/goldenPath/help/bigWig.html" target="_blank">bigWig files</a> are accepted by URL only.) </span></paper-tooltip>
    </div>
    <div>
      <paper-input id="returnEmail" class="fullWidth text" label="(Optional) Your email address" floatinglabel="true" value="{{UserEmail}}"></paper-input>
      <paper-tooltip fit-to-visible-bounds="" class="fullWidth" position="top" offset="0"> <span id="Computing time" class="text">Some results may take a while to compute. You may provide an email here to get notification once the analysis is completed.</span> </paper-tooltip>
    </div>
    <div>
      <paper-input id="urlFileToShow" class="fullWidth text" label="(Optional) Display file URL" floatinglabel="true" value="{{DisplayUrl}}"></paper-input>
      <paper-tooltip fit-to-visible-bounds="" class="fullWidth" position="top" offset="-1"> <span id="Provide url" class="text">You may also provide a URL for a <a href="/goldenPath/help/wiggle.html">wig</a> / <a href="/goldenPath/help/bigWig.html" target="_blank">bigWig</a> file <strong><em>for display purposes only</em></strong></span> </paper-tooltip>
    </div>
    <div>
      <paper-input id="searchRangeInput" class="fullWidth text" label="(Optional) Search range" floatinglabel="true" value="{{SearchRange}}"></paper-input>
      <paper-tooltip fit-to-visible-bounds="" class="fullWidth" position="top" offset="0"> <span id="Search Range" class="text">You can also specify the range to limit the search results to a certain genome location.</span> </paper-tooltip>
    </div>
    <paper-button id="Data selection" class="fullWidth vertMargined trackSelection text" raised="" noink="" on-tap="trackSelectionHandler"> Data selection </paper-button>
    <paper-button class="colored fullWidth vertMargined" raised="" id="fileSubmit" disabled\$="[[isDisabled]]" on-tap="submitForm">
      <iron-icon class="smallInline" icon="search" alt="search"></iron-icon>
      <span id="Search" class="text">Search</span> </paper-button>
      <!-- end upload new file part -->
`,

    is: 'search-card-content',

    behaviors: [
      give.GenemoTabCardContentBehavior
    ],

    properties: {
      MAX_FILENAME_LEN: {
        type: Number,
        readOnly: true,
        value: 25
      },

      sampleFile: {
        type: Object,
        value: {
          mm9: {
            file: 'http://www.genemo.org/sample/wgEncodeEM001954.txt'
          },
          hg19: {
            file: 'http://www.genemo.org/sample/wgEncodeEH000987_1.bigWig',
            range: 'chr1:1-135534747'
          }
        },
        readOnly: true
      },

      sampleRef: {
        type: String,
        value: 'mm9',
        readOnly: true
      },

      isEncodeOn: {
        type: Boolean,
        value: true
      },

      InputUrl: {
        type: String,
        value: '',
        observer: 'InputUrlChanged'
      },

      currentRef: {
        type: String,
        value: '',
        observer: 'currentRefChanged'
      },

      DisplayUrl: {
        type: String,
        value: ''
      },

      UserEmail: {
        type: String,
        value: ''
      },

      SearchRange: {
        type: String,
        value: ''
      },

      SearchRangeArr: {
        type: Array,
        value: function () {
          return []
        }
      },

      isDisabled: {
        type: Boolean,
        value: false
      },

      disableGroup: {
        type: String,
        value: 'query-search'
      },

      uploadButtonText: {
        type: String,
        value: ''
      },

      ref: {
        type: Array,
        value: function () {
          return []
        }
      }
    },

    created: function () {
      this.InputFile = new window.Blob()
    },

    setRef: function (spcArray) {
      if (Array.isArray(spcArray)) {
        this.splice('ref', 0, this.ref.length)
        this.ref.map = {}
        spcArray.forEach(function (ref) {
          this.push('ref', ref)
          this.ref.map[ref.db] = ref
        }, this)
      }
      this.setReady(true)
    },

    _encodeFilter: function (value) {
      return (value.isEncode || !this.isEncodeOn)
    },

    checkEncodeRef: function (flag) {
      if (typeof (flag) === 'boolean') {
        this.isEncodeOn = flag
      }
      if (this.ref.length > 0) {
        this.updateAllSpcActive()
      }
    },

    updateAllSpcActive: function () {
  // numbersOnly means no update of checkboxes to ref.isActive
  // otherwise ref.isActive will be updated first to reflect choice
      this.ref.updateAllSpcActiveNum()
    },

    inputFileChangedFunc: function () {
      var shortFileName = this.$.uploadFileInput.files[0].name
      if (shortFileName === '') {
        this.$.fileSelectButton.classList.remove('noTextTransformButton')
        this.uploadButtonText = 'Upload local file'
      } else {
        shortFileName = shortFileName.replace(/^C:\\fakepath\\/, '')
        if (shortFileName.length > this.MAX_FILENAME_LEN) {
          shortFileName = '...' + shortFileName.substring(shortFileName.length - this.MAX_FILENAME_LEN)
        }
        this.$.fileSelectButton.classList.add('noTextTransformButton')
        this.uploadButtonText = shortFileName
        this.InputUrl = ''
      }
    },

    InputUrlChanged: function (newValue, oldValue) {
      if (newValue.length > 0) {
        this.$.fileSelectButton.classList.remove('noTextTransformButton')
        this.uploadButtonText = 'Upload local file'
      }
    },

    currentRefChanged: function (newValue, oldValue) {
      this.fire('ref-changed', {newRef: newValue})
    },

    signalDisabled: function (e, detail) {
      if (detail.group === this.disableGroup) {
        if (detail.flag || (detail.flag === false)) {
          this.isDisabled = detail.flag
        } else {
          this.isDisabled = !this.isDisabled
        }
      }
    },

    signalEncodeCheck: function (e, detail) {
      this.checkEncodeRef(detail.flag)
    },

    loadSessionObj: function (sessionObj) {
      this.currentRef = sessionObj.db
      var inputFileName = sessionObj.originalFile
      var DisplayFileName = sessionObj.hasDisplay
                              ? (sessionObj.urlToShow.substring(
                                sessionObj.urlToShow.lastIndexOf('/') + 1))
                              : null
      var collapseObj = { Ref: this.currentRef, Input: inputFileName }
      if (DisplayFileName) {
        collapseObj.display = DisplayFileName
      }
      if (sessionObj.searchRange) {
        collapseObj.range = sessionObj.searchRange
      }
      this.updateCollapsedInfoObject(collapseObj)
    },

    fileSelectionHandler: function () {
      this.$.uploadFileInput.click()
    },

    trackSelectionHandler: function () {
      if (!this.currentRef) {
        this.fire('alert', {msg: 'Please select a reference genome before selecting data.'})
      } else {
        this.fire('switch-page', {selectedPageID: give.TRACK_LIST_PANEL_DOM_ID})
      }
    },

    fillSampleHandler: function () {
      if (!this.currentRef) {
        this.fire('alert', {msg: 'No reference is selected. Please select a reference before using the provided sample.'})
        return
      }
      if (!this.sampleFile[this.currentRef]) {
        this.fire('alert', {msg: 'No sample file is available for the selected reference.'})
        return
      }
      this.InputUrl = this.sampleFile[this.currentRef].file
      if (this.sampleFile[this.currentRef].range) {
        this.SearchRange = this.sampleFile[this.currentRef].range
      }
    },

    submitForm: function () {
      if (this.$.uploadFileInput.files.length <= 0 && this.InputUrl.length <= 0) {
        this.fire('alert', {msg: 'You need to provide the URL for your input file or select a file to upload!'})
        return false
      } else if (!this.currentRef) {
        this.fire('alert', {msg: 'You need to select the reference genome for your file!'})
        return false
      } else if (this.UserEmail.length > 0 && (this.UserEmail.indexOf('@') <= 0 ||
        (this.UserEmail.indexOf('@') >= this.UserEmail.lastIndexOf('.') - 1))) {
        this.fire('alert', {msg: 'Please provide a valid email address!'})
        return false
      }

      this.InputFile = this.$.uploadFileInput.files[0]

      var inputFileName = this.InputUrl.length > 0
                            ? (this.InputUrl.substring(this.InputUrl.lastIndexOf('/') + 1))
                            : (this.InputFile.name.substring(this.InputFile.name.lastIndexOf('/') + 1))
      var DisplayFileName = this.DisplayUrl.length > 0
                              ? (this.DisplayUrl.substring(this.DisplayUrl.lastIndexOf('/') + 1))
                              : null

      var collapseObj = { Ref: this.currentRef, Input: inputFileName }
      if (DisplayFileName) {
        collapseObj.display = DisplayFileName
      }

      if (this.SearchRange) {
        var chromRegex = /^chr\w+\s*(:|\s)\s*[0-9,]+\s*(-|\s)\s*[0-9,]+/i
        if (!chromRegex.test(this.SearchRange)) {
          this.fire('alert', {msg: 'Please specify search range in "chrXX:XXXXX-XXXXX" "chrXX XXXXX XXXXX".'})
          return false
        }
        this.SearchRangeArr = this.SearchRange.split(/[\s:-]+/g)
        this.SearchRange = this.SearchRangeArr[0] + ':' +
          this.SearchRangeArr[1] + '-' + this.SearchRangeArr[2]
        collapseObj.range = this.SearchRange
      }

      this.isDisabled = true
      this.updateCollapsedInfoObject(collapseObj)

      this.ref.map[this.currentRef].callOnTracksReady(this.fire.bind(this, 'submit-form', {sessionDataObj: {
        hasEmail: this.UserEmail.length > 0,
        email: this.UserEmail,
        file: this.InputFile,
        inputFileName: inputFileName,
        url: this.InputUrl,
        urlToShow: this.DisplayUrl,
        db: this.currentRef,
        searchRange: this.SearchRange,
        searchRangeArr: this.SearchRangeArr
      }}))
    },

    ready: function () {
      this._setIcon('search')
      this._setIconAlt('search')
      this._setHeaderText('Input file')
      this._setTabText('Search')

      this.uploadButtonText = 'Upload local file'

      this.setDOMReady(true)
      this.setReady(false)
    }
  })

  return give
})(GIVe || {})
