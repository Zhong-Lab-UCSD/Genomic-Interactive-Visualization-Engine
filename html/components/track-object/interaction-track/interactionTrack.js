/**
 * @license
 * Copyright 2017 GIVe Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var GIVe = (function (give) {
  'use strict'

  /**
   * Object representing a BED track, see `GIVe.TrackObject` for details.
   * @typedef {object} InteractionTrack
   * @class give.InteractionTrack
   *
   * @constructor
   * @implements give.TrackObject
   * @param {string} ID - The ID of the new track object
   * @param {object} Settings - Settings of the new track. Dictionary format.
   *   Note that if `Settings` has a property named `settings`,
   *   it will be merged with `this.Settings`, while properties in
   *   `Settings.settings` take precedence in cases of conflict names
   * @param {RefObjectLiteral} ref - the reference the track is using
   */
  give.InteractionTrack = function (ID, Settings, ref) {
    give.TrackObject.apply(this, arguments)
    this.windowSpan = give.InteractionTrack.INTERACTION_WINDOW_SPAN
  }

  give.extend(give.TrackObject, give.InteractionTrack)

  give.InteractionTrack.getType = function () {
    return ['interaction']
  }

  give.InteractionTrack.prototype._DataObjCtor = give.InteractionTrackData

  give.InteractionTrack.prototype._DomObjCtor = give.InteractionTrackDOM

  give.TrackObject.registerTrack(give.InteractionTrack)

  give.InteractionTrack.INTERACTION_WINDOW_SPAN = 2

  return give
})(GIVe || {})
