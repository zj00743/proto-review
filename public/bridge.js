(function () {
  'use strict';
  var PARENT = window.parent;
  if (PARENT === window) return;

  var commentMode = false;
  var hoveredEl = null;
  var watchedAnchors = [];
  var currentRoute = location.pathname + location.hash;

  // Highlight overlay
  var hl = document.createElement('div');
  hl.setAttribute('data-pp-hl', '');
  hl.style.cssText =
    'position:fixed;pointer-events:none;z-index:2147483647;' +
    'border:2px solid #6366f1;background:rgba(99,102,241,0.08);' +
    'display:none;border-radius:4px;transition:all 0.06s ease;';

  // ── Route detection ──
  function getRoute() {
    return location.pathname + location.hash;
  }

  function onRouteChange() {
    var newRoute = getRoute();
    if (newRoute !== currentRoute) {
      currentRoute = newRoute;
      PARENT.postMessage({ type: 'pp-route-changed', route: currentRoute }, '*');
      updatePositions();
    }
  }

  // Intercept SPA navigation
  var origPush = history.pushState;
  var origReplace = history.replaceState;
  history.pushState = function () {
    origPush.apply(this, arguments);
    setTimeout(onRouteChange, 0);
  };
  history.replaceState = function () {
    origReplace.apply(this, arguments);
    setTimeout(onRouteChange, 0);
  };

  // ── Selector generation ──
  function getSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    var parts = [];
    var cur = el;
    while (cur && cur !== document.documentElement && cur !== document.body) {
      var sel = cur.tagName.toLowerCase();
      if (cur.id) {
        parts.unshift('#' + CSS.escape(cur.id));
        break;
      }
      var parent = cur.parentElement;
      if (parent) {
        var sibs = [];
        for (var i = 0; i < parent.children.length; i++) {
          if (parent.children[i].tagName === cur.tagName) sibs.push(parent.children[i]);
        }
        if (sibs.length > 1) {
          sel += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
        }
      }
      parts.unshift(sel);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function getOwnText(el) {
    var parts = [];
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) {
        var t = el.childNodes[i].nodeValue;
        if (t) parts.push(t.trim());
      }
    }
    return parts.join(' ').slice(0, 80);
  }

  function getAnchor(el) {
    var r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: typeof el.className === 'string' ? el.className : null,
      textSnippet: (el.textContent || '').trim().slice(0, 80),
      selector: getSelector(el),
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      ownText: getOwnText(el),
      parentTag: el.parentElement ? el.parentElement.tagName.toLowerCase() : null,
      parentClass: el.parentElement && typeof el.parentElement.className === 'string'
                     ? el.parentElement.className : null,
      childCount: el.children.length,
    };
  }

  // ── Element identity verification ──
  function verifyElement(el, anchor) {
    if (anchor.parentTag) {
      var actualParentTag = el.parentElement ? el.parentElement.tagName.toLowerCase() : null;
      if (actualParentTag !== anchor.parentTag) return false;
    }
    if (anchor.ownText) {
      var actualOwn = getOwnText(el);
      if (actualOwn !== anchor.ownText) return false;
    }
    if (anchor.textSnippet) {
      var actualText = (el.textContent || '').trim().slice(0, 80);
      if (actualText !== anchor.textSnippet) return false;
    }
    if (anchor.className !== undefined && anchor.className !== null) {
      var actualClass = typeof el.className === 'string' ? el.className : null;
      if (actualClass !== anchor.className) return false;
    }
    return true;
  }

  // ── Element finding (strict matching + identity verification) ──
  function findElement(anchor) {
    if (!anchor) return null;

    if (anchor.selector) {
      try {
        var el = document.querySelector(anchor.selector);
        if (el && el.tagName.toLowerCase() === anchor.tag && verifyElement(el, anchor)) {
          return el;
        }
      } catch (e) {}
    }

    if (anchor.id) {
      var byId = document.getElementById(anchor.id);
      if (byId && byId.tagName.toLowerCase() === anchor.tag && verifyElement(byId, anchor)) {
        return byId;
      }
    }

    return null;
  }

  function isVisible(el) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;

    var r = el.getBoundingClientRect();
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (parseFloat(s.opacity) === 0) return false;
    if (r.width <= 0 || r.height <= 0) return false;
    if (r.bottom < 0 || r.top > window.innerHeight) return false;
    if (r.right < 0 || r.left > window.innerWidth) return false;

    var parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
      var ps = getComputedStyle(parent);
      var ov = ps.overflow + ps.overflowX + ps.overflowY;
      if (ov.indexOf('hidden') !== -1 || ov.indexOf('clip') !== -1) {
        var pr = parent.getBoundingClientRect();
        if (r.bottom <= pr.top || r.top >= pr.bottom ||
            r.right <= pr.left || r.left >= pr.right) return false;
      }
      parent = parent.parentElement;
    }
    return true;
  }

  // ── Position tracking ──
  function updatePositions() {
    if (watchedAnchors.length === 0) return;
    var positions = [];
    for (var i = 0; i < watchedAnchors.length; i++) {
      var item = watchedAnchors[i];
      var el = findElement(item.anchor);
      if (el && isVisible(el)) {
        var r = el.getBoundingClientRect();
        positions.push({
          commentId: item.commentId,
          visible: true,
          rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        });
      } else {
        positions.push({ commentId: item.commentId, visible: false });
      }
    }
    PARENT.postMessage({ type: 'pp-positions-update', positions: positions }, '*');
  }

  var updateTimer = null;
  function scheduleUpdate() {
    if (updateTimer) return;
    updateTimer = setTimeout(function () {
      updateTimer = null;
      updatePositions();
    }, 40);
  }

  // ── Comment mode handlers ──
  function onMouseMove(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === hl || el.hasAttribute('data-pp-hl')) {
      hl.style.display = 'none';
      hoveredEl = null;
      return;
    }
    var target = el;
    var r = target.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) {
      target = target.parentElement || target;
    }
    hoveredEl = target;
    var rect = hoveredEl.getBoundingClientRect();
    hl.style.display = 'block';
    hl.style.top = rect.top + 'px';
    hl.style.left = rect.left + 'px';
    hl.style.width = rect.width + 'px';
    hl.style.height = rect.height + 'px';
  }

  function onClickCapture(e) {
    if (!commentMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (!hoveredEl) return;
    var anchor = getAnchor(hoveredEl);
    var elRect = hoveredEl.getBoundingClientRect();
    anchor.clickOffsetX = elRect.width > 0 ? (e.clientX - elRect.left) / elRect.width : 0.5;
    anchor.clickOffsetY = elRect.height > 0 ? (e.clientY - elRect.top) / elRect.height : 0.5;
    PARENT.postMessage({
      type: 'pp-element-clicked',
      anchor: anchor,
      route: getRoute(),
      clickX: e.clientX,
      clickY: e.clientY,
    }, '*');
    hl.style.display = 'none';
  }

  // ── Screenshot capture ──
  var captureSettleTimer = null;
  var lastBodyLength = 0;

  function scheduleCaptureOnSettle() {
    if (captureSettleTimer) clearTimeout(captureSettleTimer);
    captureSettleTimer = setTimeout(function () {
      captureSettleTimer = null;
      var curLen = (document.body.textContent || '').length;
      if (curLen !== lastBodyLength) {
        lastBodyLength = curLen;
        captureScreenshot();
      }
    }, 2000);
  }

  function captureScreenshot() {
    if (typeof html2canvas === 'undefined') return;
    window.scrollTo(0, 0);
    setTimeout(function () {
      html2canvas(document.body, {
        scale: 0.5,
        useCORS: true,
        logging: false,
        allowTaint: true,
      }).then(function (canvas) {
        var dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        PARENT.postMessage({ type: 'pp-screenshot-captured', dataUrl: dataUrl }, '*');
      }).catch(function () {});
    }, 500);
  }

  // ── Message handling ──
  function onMessage(e) {
    if (!e.data || typeof e.data.type !== 'string') return;
    switch (e.data.type) {
      case 'pp-enter-comment-mode':
        commentMode = true;
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('click', onClickCapture, true);
        document.documentElement.style.cursor = 'crosshair';
        break;

      case 'pp-exit-comment-mode':
        commentMode = false;
        hl.style.display = 'none';
        hoveredEl = null;
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClickCapture, true);
        document.documentElement.style.cursor = '';
        break;

      case 'pp-watch-anchors':
        watchedAnchors = e.data.anchors || [];
        updatePositions();
        break;

      case 'pp-scroll-to':
        var el = findElement(e.data.anchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var r = el.getBoundingClientRect();
          hl.style.display = 'block';
          hl.style.top = r.top + 'px';
          hl.style.left = r.left + 'px';
          hl.style.width = r.width + 'px';
          hl.style.height = r.height + 'px';
          setTimeout(function () { hl.style.display = 'none'; }, 2000);
        }
        break;
    }
  }

  // ── Init ──
  function init() {
    if (!document.body) { requestAnimationFrame(init); return; }
    document.body.appendChild(hl);

    window.addEventListener('message', onMessage);
    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);

    var observer = new MutationObserver(function () {
      scheduleUpdate();
      scheduleCaptureOnSettle();
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
    });

    setInterval(updatePositions, 500);

    currentRoute = getRoute();
    lastBodyLength = (document.body.textContent || '').length;
    PARENT.postMessage({ type: 'pp-bridge-ready', route: currentRoute }, '*');
    scheduleCaptureOnSettle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
