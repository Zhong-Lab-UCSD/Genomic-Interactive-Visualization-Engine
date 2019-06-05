import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import '../ref-object/ref-object.js';
var GIVe = (function (give) {
/**
 * Behavior that allows to choose reference from its name.
 *
 * When the requested reference is not available (for example, needs to be
 * loaded from some external sources), the request will be queued so that
 * it can be executed when the references are ready.
 *
 * @polymer
 * @mixinFunction
 */

  give.RefEmbedMixin = dedupingMixin(base =>
    class extends base {
      static get properties () {
        return {
          /**
             * The reference used in the embedded browser.
             * Reference names needs to be in UCSC format.
             * Please see [GIVe.RefObject](../ref-object/)
             * to see available references on GIVe server.
             */
          ref: {
            type: String,
            notify: true,
            observer: '_refChanged'
          },

          /**
             * The GIVe.RefObject for reference.
             * Contains chromosomal layout and track information.
             * @type {GIVe.RefObject}
             */
          _refObj: {
            type: Object
          },

          /**
             * Whether this object needs a reference with valid `chromInfo`.
             */
          needsChromInfo: {
            type: Boolean,
            value: true
          },

          /**
           * Promise resolved to `this` when the tracks in the reference are
           * ready. This will be set as `true` if the promise gets resolved.
           * @type {Promise}
           */
          refReadyPromise: {
            type: Object,
            value: null
          },

          _changingRef: {
            type: Boolean,
            value: false
          }
        }
      }

      /**
       * The observer function to handle changes in `this.ref`.
       *
       * this will reset all tracks and redo the ref
       * note that the tracks should already be initialized before switching here
       * After this, this.changeAllViewWindows should be called.
       *
       * If references are not ready (for example, need to be populated from a
       * server), `this._setRefAfterReadyCheck` will be called
       * after they are ready.
       *
       * @async
       * @param  {string} newValue - new reference name
       * @param  {string} oldValue - old reference name
       */
      _refChanged (newValue, oldValue) {
        if (!this._changingRef) {
          if (newValue) {
            return give.RefObject.allRefPromise
              .then(() => this._setRefAfterReadyCheck(newValue))
              .catch(err => {
                // call UI warning procedures in the future
                give.fireSignal('give-warning', { msg: err.message })
                this.refReadyPromise = Promise.reject(err)
              })
              .finally(() => {
                this._changingRef = true
                this.ref = this.refObj ? this.refObj.db : null
                this._changingRef = false
              })
          } else if (this.refObj) {
            let err = new give.GiveError('No ref value supplied!')
            give._verbConsole.warn(err)
            this.refReadyPromise = Promise.reject(err)
          }
        }
      }

      /**
       * Get the current reference of the element.
       *
       * @return {GIVe.RefObject}  reference currently used.
       */
      get refObj () {
        return this._refObj
      }

      /**
       * _setRefAfterReadyCheck - The function actually called after
       * the references are ready.
       *
       * @param  {string|GIVe.RefObject} ref - the reference name or reference
       *    object
       */
      _setRefAfterReadyCheck (ref) {
        this._setRefObj(give.RefObject.findRefByDb(ref))
      }

      /**
       * Simple function to set reference directly.
       *
       * @param  {GIVe.RefObject} refObj the reference object
       * @returns {boolean} Whether the reference object has been changed.
       */
      _setRefObj (refObj) {
        if (!this.refObj || this.refObj.db !== refObj.db) {
          if (!this.needsChromInfo || refObj.chromInfo) {
            // reference has been changed, needs to switch
            this._refObj = refObj
            this.refReadyPromise = refObj.initTracks()
          } else {
            this.refReadyPromise = Promise.reject(
              new give.GiveError('No ChromInfo available for ref "' +
              refObj.db + '"!')
            )
          }
          return true
        }
        return false
      }
    }
  )

  return give
})(GIVe || {})
