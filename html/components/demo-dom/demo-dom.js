import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-localstorage/iron-localstorage.js';
import '@polymer/paper-material/paper-material.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '../give-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var GIVe = (function (give) {
  'use strict'

  give.DemoDom = Polymer({
    _template: html`
    <style include="give-shared-styles iron-flex">
      body {
        font-family: 'Roboto';
        font-size: 14px;
      }
      h2 {
        font-family: 'Roboto';
        font-size: 16px;
        line-height: 1.4em;
        margin: 1em 0em 0.5em 0em;
      }
      p {
        margin: 0.5em 0em;
        line-height: 1.4em;
      }
      paper-button.blue {
        background: var(--default-primary-color);
        color: var(--dark-theme-text-color);
      }
      paper-material {
        padding: 0.5em 1.5em;
        margin: 0.5em;
      }
      paper-button {
        margin: 0.5em;
      }
      .code {
        font-family: 'Consolas', monaco, monospace;
        background-color: var(--primary-background-color);
        padding: 0.2em 0.5em;
      }
    </style>
    <paper-material elevation="1">
      <h2>Get username, password for GIVE demo and/or set up reference databases.</h2>
      <p>This tool is created for <a href="https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/tutorials/2-dataSource.md">GIVE Tutorial 2: Populating a reference genome with a few data tracks on a MySQL compatible data source</a>.</p>
      <p>Please click "Create database" to get an account for GIVE demo database, and set up the reference database. The optional "Reference database label" field below can be used to customize your reference database name.</p>
      <p>The browser will save your previous information if you have created a user before, so you can use this tool to create a new reference database only. However, passwords are not be stored on the server. Therefore, if you cleared your browser cache and forgot your password, you will need to create a new account.</p>
      <paper-input label="Reference database label (optional)" value="{{DatabaseSuffix}}"></paper-input>
      <paper-button raised="" class="blue" on-tap="_createDatabase">Create database</paper-button>
      <paper-button raised="" on-tap="_removeStoredData">Remove stored user data</paper-button>
    </paper-material>
    <template is="dom-if" if="[[UserDataAvailable]]" restamp="true">
      <paper-material id="results" elevation="1">
        <p>Here is your account information. Please use the following account to access <a href="https://demo.give.genemo.org/phpmyadmin/">the MariaDB instance here</a>.</p>
        <paper-material elevation="1">
          <p>Your user name: <span class="code">[[UserData.username]]</span></p>
          <template is="dom-if" if="[[DBNameAvailable]]" restamp="true">
            <p>Your database name: <span class="code">[[UserData.dbname]]</span></p>
          </template>
          <template is="dom-if" if="[[PassAvailable]]" restamp="true">
            <p>Your password: <span class="code">[[UserData.password]]</span></p>
          </template>
        </paper-material>
      </paper-material>
    </template>
    <iron-ajax id="mainAjax" url="../../../../givdata/demoRequest.php" handle-as="json" method="POST" on-response="handleResponse"></iron-ajax>
    <iron-localstorage name="my-app-storage" value="{{StoredData}}" on-iron-localstorage-load="_loadLocalStorage" on-iron-localstorage-load-empty="_initializeLocalStorage">
    </iron-localstorage>
`,

    is: 'demo-dom',

    properties: {
      DatabaseSuffix: {
        type: String,
        value: ''
      },

      UserData: {
        type: Object,
        value: function () {
          return {}
        }
      },

      UserDataAvailable: {
        type: Boolean,
        value: false
      },

      PassAvailable: {
        type: Boolean,
        value: false
      },

      DBNameAvailable: {
        type: Boolean,
        value: false
      },

      StoredData: {
        type: Object,
        value: function () {
          return {}
        }
      }
    },

    ready: function () {

    },

    _initializeLocalStorage: function () {
      this.StoredData = {}
    },

    _loadLocalStorage: function () {
      this.set('UserData.username', this.StoredData.username)
      this.UserDataAvailable = this._objectAvailable()
      this.set('UserData.password', this.StoredData.password)
      this.PassAvailable = this._passAvailable()
    },

    _objectAvailable: function () {
      return !!this.UserData.username
    },

    _passAvailable: function () {
      return !!this.UserData.password
    },

    _dbAvailable: function () {
      return !!this.UserData.dbname
    },

    _removeStoredData: function () {
      this.set('StoredData', {})
      this.set('UserData', {})
      this.UserDataAvailable = this._objectAvailable()
      this.PassAvailable = this._passAvailable()
      this.DBNameAvailable = this._dbAvailable()
    },

    _createDatabase: function () {
      var params = {}
      if (this.DatabaseSuffix) {
        params.suffix = this.DatabaseSuffix
      }
      if (this.StoredData.token) {
        params.token = this.StoredData.token
      }
      this.$.mainAjax.params = params
      this.$.mainAjax.generateRequest()
    },

    handleResponse: function (e, detail) {
      var data = detail.response
      if (data.token) {
        this.set('UserData.username', data.username)
        this.set('StoredData.username', data.username)
        this.UserDataAvailable = this._objectAvailable()
        if (data.pass) {
          this.set('UserData.password', data.pass)
          this.set('StoredData.password', data.pass)
          this.PassAvailable = this._passAvailable()
        }
        if (data.db) {
          this.set('UserData.dbname', data.db)
          this.DBNameAvailable = this._dbAvailable()
        }
        this.set('StoredData.token', data.token)
      } else {
        window.alert('Error!')
      }
    }
  })
  return give
})(GIVe || {})
