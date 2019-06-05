const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="give-track-styles">
  <template>
    <style>
    svg text {
      font-size: var(--base-font-size, var(--default-font-size));
      pointer-events: none;
      dominant-baseline: central;
    }

    svg text::selection {
      background: none;
    }

    svg polygon.linkedRegion {
      mix-blend-mode: multiply;
      stroke-opacity: 0;
    }

    svg polygon.linkedRegion.partialOutside {
      fill-opacity: 0.03;
    }

    svg polygon.linkedRegion.fullyInside {
      fill-opacity: 0.4;
    }

    svg polygon.linkedRegion.partialOutside:hover {
      stroke-opacity: 1;
      fill-opacity: 0.2;
    }

    svg polygon.linkedRegion.fullyInside:hover {
      stroke-opacity: 1;
      fill-opacity: 0.7;
    }

    svg rect.pointerHandler {
      fill: none;
      pointer-events: all;
    }

    svg rect.pointerHandler.grab {
      cursor: grab;
      cursor: -webkit-grab;
    }

    svg rect.pointerHandler.grabbing {
      cursor: grabbing;
      cursor: -webkit-grabbing;
    }

    svg polygon.wiggleShapes {
      fill-opacity: 0.6;
      stroke-width: 1;
    }

    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
