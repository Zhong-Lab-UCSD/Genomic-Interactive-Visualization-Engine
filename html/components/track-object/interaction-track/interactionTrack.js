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
   * @implements give.TrackObject
   */
  class InteractionTrack extends give.TrackObject {
    /**
     * typeList - get the key strings showing this type of data.
     *    This shall be the same as the `type` column for track entries in
     *    `trackDb` table so that GIVE is able to figure out the track is of
     *    this type.
     * @static
     * @property
     *
     * @returns {Array<string>}  return all keys matching this type.
     */
    static get typeList () {
      return ['interaction']
    }

    /**
     * _getWindowSpan - Get the number of windows for the track to span across
     * @static
     *
     * @return {number} number of windows this track will span across
     */
    static _getWindowSpan () {
      return this.INTERACTION_WINDOW_SPAN
    }
  }

  InteractionTrack._DataObjCtor = give.InteractionTrackData

  InteractionTrack._DomObjCtor = give.InteractionTrackDom

  InteractionTrack.INTERACTION_WINDOW_SPAN = 2

  give.TrackObject.registerTrack(InteractionTrack)

  give.InteractionTrack = InteractionTrack

  return give
})(GIVe || {})
