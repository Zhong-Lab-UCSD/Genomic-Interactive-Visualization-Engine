import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '../track-object/track-object.js';
import '../ref-object/ref-object.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.CustomTrackController = Polymer({
    _template: html`
    <style include="give-shared-styles">
    :host {
      padding: 0.5em;
      display: block;
    }
    paper-dialog {
      width: 300px;
    }
    paper-dialog > div.body {
      padding: 20px;
      margin: 0;
    }

    </style>
    <paper-button raised="" on-tap="openAddTrackDialog">Add custom track</paper-button>
    <paper-dialog id="mainDialog">
      <h2>Custom Tracks</h2>
      <div class="body">
        <paper-button class="fullWidth" raised="" noink="" id="fileSelectButton" on-tap="fileSelectionHandler">{{uploadButtonText}}</paper-button>
        <input style="display: none;" type="file" id="uploadFileInput" name="uploadFileInput" on-change="inputFileChangedFunc">
        <paper-input id="urlFileInput" class="fullWidth text" label="URL for track file" floatinglabel="true" value="{{InputUrl}}"></paper-input>
        <paper-input id="trackShortLabelInput" class="fullWidth text" label="Track short label" floatinglabel="true" value="{{trackShortLabel}}"></paper-input>
        <!-- maybe implement auto-detect in the future -->
        <paper-dropdown-menu id="typeDropdown" label="Track type" class="vertMargined text" no-label-float="">
          <paper-menu class="dropdown-content" id="refToUpload" attr-for-selected="value" selected="{{currentType}}">
            <template is="dom-repeat" items="[[trackTypes]]">
              <paper-item value="[[item.trackType]]">[[item.typeName]]</paper-item>
            </template>
          </paper-menu>
        </paper-dropdown-menu>
      </div>
      <div class="buttons">
        <paper-button dialog-dismiss="">Cancel</paper-button>
        <paper-button raised="" id="fileSubmit" on-tap="addTrack" disabled="[[isDisabled]]">
          <iron-icon class="smallInline" icon="add" alt="Add track"></iron-icon>
          <span id="Search" class="text">Add Track</span>
        </paper-button>
      </div>
    </paper-dialog>
`,

    is: 'custom-track-controller',

    properties: {
      MAX_FILENAME_LEN: {
        type: Number,
        readOnly: true,
        value: 25
      },

      ref: Object,   // this is the ref defined in libtracks.js
      // notice that ref should have chromSizes and location of centromeres included
      // tracks is also within ref
      // may need to provide additional API to get track data

      textSize: {
        type: Number,
        value: 12      // unit is px
      },

      InputUrl: {
        type: String,
        value: '',
        observer: 'InputUrlChanged'
      },

      uploadButtonText: {
        type: String,
        value: 'Upload local file'
      },

      customGroupLabel: {
        type: String,
        value: ''
      },

      trackShortLabel: {
        type: String,
        value: ''
      },

      trackTypes: {
        type: Array,
        value: function () {
          return []
        }
      },

      customTrackGroupID: {
        type: String,
        value: 'customTracks'
      },

      isDisabled: {
        type: Boolean,
        value: true
      }

    },

    created: function () {
      this.trackCtrlDOMs = []
    },

    ready: function () {
      this.push('trackTypes',
        {
          typeName: 'BED',
          trackType: 'bed'
        },
        {
          typeName: 'Interaction',
          trackType: 'interaction'
        },
        {
          typeName: 'Wig',
          trackType: 'wig'
        },
        {
          typeName: 'BigWig',
          trackType: 'bigwig'
        }
      )
    },

    factoryImpl: function (ref, prop) {
      this.setRef(ref)
    },

    openAddTrackDialog: function () {
      this.$.mainDialog.open()
    },

    setRef: function (newRef, trackCtrlDOMs) {
      // this will reset all tracks and redo the ref
      // note that the tracks should already be initialized before switching here
      if (!newRef) {
        throw (new give.GiveError('No new ref specified!'))
      }
      this.ref = newRef
      if (!this.ref.hasOwnProperty(this.customTrackGroupID)) {
        // no custom track group, add one
        this.customGroup = give.RefObject.createCustomGroup({ID: this.customTrackGroupID})
      }
      this.ref.groups[this.customTrackGroupID] = this.customGroup
      this.isDisabled = false
    },

    fileSelectionHandler: function () {
      this.$.uploadFileInput.click()
    },

    inputFileChangedFunc: function () {
      var shortFileName = this.$.uploadFileInput.files.length > 0 ? this.$.uploadFileInput.files[0].name : ''
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

    // TODO: add/remove/rearrange tracks
    addTrack: function (e, detail) {
      if (this.$.uploadFileInput.files.length <= 0 && this.InputUrl.length <= 0) {
        this.fire('alert', {msg: 'You need to provide the URL for your input file or select a file to upload!'})
        return false
      } else if (!this.currentType) {
        this.fire('alert', {msg: 'You need to select the type of the track!'})
        return false
      }
      var track = {
        settings: {
          isCustom: true,
          type: this.currentType,
          visibility: give.TrackObject.StatusEnum.VIS_FULL,
          adaptive: 'on'
        }
      }
      if (this.$.uploadFileInput.files.length > 0) {
        track.settings.localFile = this.$.uploadFileInput.files[0]
      } else {
        track.settings.remoteUrl = this.InputUrl
        track.settings.requestUrl = give.TrackObject.fetchCustomTarget
      }
      track.settings.shortLabel = this.trackShortLabel.length > 0
        ? this.trackShortLabel
        : 'Custom track #' + (this.customGroup.length + 1)
      track.tableName = 'custom' + this.customGroup.length
      this.ref.addCustomTrack(track, this.customTrackGroupID, this.fire.bind(this, 'update-track-structure'))
      this.$.mainDialog.close()
    }
  })

  return give
})(GIVe || {})
