/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
/**
`resizable-tab-pages` is changed from Polymer neon-animated-pages to fit paper-tabs better.
It provides directional animations and can be resized if the pages are of different sizes.

`neon-animated-pages` manages a set of pages and runs an animation when switching between them. Its
children pages should implement `Polymer.NeonAnimatableBehavior` and define `entry` and `exit`
animations to be run when switching to or switching out of the page.

@group Neon Elements
@element neon-animated-pages
@demo demo/index.html
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { IronSelectableBehavior } from '@polymer/iron-selector/iron-selectable.js';
import { NeonAnimationRunnerBehavior } from '@polymer/neon-animation/neon-animation-runner-behavior.js';
import '@polymer/neon-animation/animations/opaque-animation.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="resizable-tab-pages">

  <style>

    :host {
      display: block;
      position: relative;
      transition-duration: 300ms;
	  overflow: hidden;
    }

    :host &gt; ::slotted(*) {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }

    :host &gt; ::slotted(:not(.iron-selected):not(.neon-animating)) {
      display: none !important;
    }

    :host &gt; ::slotted(.neon-animating) {
      pointer-events: none;
    }

  </style>

  <template>
    <slot id="content"></slot>
  </template>

</dom-module>`;

document.head.appendChild($_documentContainer.content);

Polymer({

  is: 'resizable-tab-pages',

  behaviors: [
    IronResizableBehavior,
    IronSelectableBehavior,
    NeonAnimationRunnerBehavior
  ],

  properties: {

    activateEvent: {
      type: String,
      value: ''
    },

    // if true, the initial page selection will also be animated according to its animation config.
    animateInitialSelection: {
      type: Boolean,
      value: false
    },

    greaterEntryAnimation: {
      type: String
    },

    lesserEntryAnimation: {
      type: String
    },

    greaterExitAnimation: {
      type: String
    },

    lesserExitAnimation: {
      type: String
    },

    horizontal: {
      type: Boolean,
      value: false,
      observer: '_horizontalChanged'
    }

  },

  observers: [
    '_selectedChanged(selected)'
  ],

  listeners: {
    'neon-animation-finish': '_onNeonAnimationFinish'
  },

  _selectedChanged: function(selected) {

    var selectedPage = this.selectedItem;
    var oldPage = this._valueToItem(this._prevSelected) || false;
	  var selectedIsGreater = (!oldPage || this._prevSelected < selected);
    this._prevSelected = selected;

    // on initial load and if animateInitialSelection is negated, simply display selectedPage.
    if (!oldPage && !this.animateInitialSelection) {
      this._completeSelectedChanged();
      return;
    }

    // insert safari fix.
    this.animationConfig = [{
      name: 'opaque-animation',
      node: selectedPage
    }];

    // configure selectedPage animations.
	  if(selectedIsGreater? this.greaterEntryAnimation: this.lesserEntryAnimation) {
      this.animationConfig.push({
        name: selectedIsGreater? this.greaterEntryAnimation: this.lesserEntryAnimation,
        node: selectedPage
      });
	  } else if (this.entryAnimation) {
      this.animationConfig.push({
        name: this.entryAnimation,
        node: selectedPage
      });
    } else {
      if (selectedPage.getAnimationConfig) {
        this.animationConfig.push({
          animatable: selectedPage,
          type: 'entry'
        });
      }
    }

    // configure oldPage animations iff exists.
    if (oldPage) {

      // cancel the currently running animation if one is ongoing.
      if (oldPage.classList.contains('neon-animating')) {
        this._squelchNextFinishEvent = true;
        this.cancelAnimation();
        this._completeSelectedChanged();
      }

      // configure the animation.
	    if(selectedIsGreater? this.greaterExitAnimation: this.lesserExitAnimation) {
        this.animationConfig.push({
          name: selectedIsGreater? this.greaterExitAnimation: this.lesserExitAnimation,
          node: oldPage
        });
	    } else if (this.exitAnimation) {
        this.animationConfig.push({
          name: this.exitAnimation,
          node: oldPage
        });
      } else {
        if (oldPage.getAnimationConfig) {
          this.animationConfig.push({
            animatable: oldPage,
            type: 'exit'
          });
        }
      }

      // display the oldPage during the transition.
      oldPage.classList.add('neon-animating');
    }

    // display the selectedPage during the transition.
    selectedPage.classList.add('neon-animating');

	  this.updateSize((this.horizontal? selectedPage.getBoundingClientRect().width: selectedPage.getBoundingClientRect().height) +
      'px', true);

    // actually run the animations.
    if (this.animationConfig.length > 1) {

      // on first load, ensure we run animations only after element is attached.
      if (!this.isAttached) {
        this.async(function () {
          this.playAnimation(undefined, {
            fromPage: null,
            toPage: selectedPage
          });
        });

      } else {
        this.playAnimation(undefined, {
          fromPage: oldPage,
          toPage: selectedPage
        });
      }

    } else {
      this._completeSelectedChanged(oldPage, selectedPage);
    }
  },

  /**
   * @param {Object=} oldPage
   * @param {Object=} selectedPage
   */
  _completeSelectedChanged: function(oldPage, selectedPage) {
    this.enableTransition(false);
    if (selectedPage) {
      selectedPage.classList.remove('neon-animating');
	    if(this.horizontal) {
          this.style.width = selectedPage.getBoundingClientRect().width + 'px';
	    } else {
          this.style.height = selectedPage.getBoundingClientRect().height + 'px';
	    }
    }
    if (oldPage) {
      oldPage.classList.remove('neon-animating');
    }
    if (!selectedPage || !oldPage) {
      var nodes = dom(this.$.content).getDistributedNodes();
      for (var node, index = 0; node = nodes[index]; index++) {
        node.classList && node.classList.remove('neon-animating');
      }
    }
    this.async(this._notifyPageResize);
  },

  _onNeonAnimationFinish: function(event) {
    if (this._squelchNextFinishEvent) {
      this._squelchNextFinishEvent = false;
      return;
    }
    this._completeSelectedChanged(event.detail.fromPage, event.detail.toPage);
  },

  _notifyPageResize: function() {
    var selectedPage = this.selectedItem;
    this.resizerShouldNotify = function(element) {
      return element == selectedPage;
    }
    this.notifyResize();
  },

  ready: function() {
    // Avoid transition at the beginning e.g. page loads and enable
    // transitions only after the element is rendered and ready.
    this._enableTransition = true;
  },

  updateSize: function(size, animated) {
    this.enableTransition(animated);
    var s = this.style;
    var nochange = s[this.dimension] === size;
    s[this.dimension] = size;
    if (animated && nochange) {
      this._transitionEnd();
    }
  },

  enableTransition: function(enabled) {
    this.style.transitionDuration = (enabled && this._enableTransition) ? '' : '0s';
  },

  _horizontalChanged: function() {
    this.dimension = this.horizontal ? 'width' : 'height';
    this.style.transitionProperty = this.dimension;
  },

	attached: function() {
      this.async(function() {
          this._completeSelectedChanged(null, this.selectedItem);
      }, 50);
	}

})
