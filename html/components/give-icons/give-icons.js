import '@polymer/iron-iconset-svg/iron-iconset-svg.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<iron-iconset-svg name="give-iconset" iconsize="24">
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24" enable-background="new 0 0 24 24" xml:space="preserve">
    <defs>
      <g id="manual-icon">
        <path d="M18,2H6c-1.1,0-2,0.9-2,2v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V4C20,2.899,19.1,2,18,2z M6,4h4.219v6.75L8.109,9.485
				L6,10.75V4z M16.041,20.125h-1.717v-1.717h1.717V20.125z M17.816,13.473l-0.771,0.791c-0.617,0.627-1.004,1.141-1.004,2.43h-1.717
				v-0.432c0-0.943,0.387-1.801,1.005-2.428l1.063-1.082c0.316-0.308,0.508-0.738,0.508-1.209c0-0.944-0.773-1.717-1.717-1.717
				c-0.945,0-1.718,0.772-1.718,1.717H11.75c0-1.896,1.536-3.433,3.434-3.433c1.896,0,3.434,1.535,3.434,3.433
				C18.616,12.298,18.307,12.984,17.816,13.473z"></path>
      </g>
      <g id="search-unavailable">
        <path d="M15.8,14.3l5,5l-1.5,1.5l-5-5V15L14,14.7c-1.1,1-2.6,1.6-4.2,1.6c-3.6,0-6.5-2.9-6.5-6.5c0-3.6,2.9-6.5,6.5-6.5
        	c0.7,0,1.5,0.1,2.1,0.4l-1.1,1.1l1.3,1.3c-0.7-0.4-1.5-0.7-2.3-0.7c-2.5,0-4.5,2-4.5,4.5s2,4.5,4.5,4.5c1.7,0,3.2-1,4-2.4l1.3,1.3
        	l0.4-0.4c-0.2,0.4-0.5,0.9-0.8,1.2l0.3,0.3H15.8z M20.7,4.7l-1.4-1.4l-2.1,2.1l-2.1-2.1l-1.4,1.4l2.1,2.1l-2.1,2.1l1.4,1.4l2.1-2.1
        	l2.1,2.1l1.4-1.4l-2.1-2.1L20.7,4.7z"></path>
      </g>
    </defs>
  </svg>
</iron-iconset-svg>`;

document.head.appendChild($_documentContainer.content);
