/**
 * google-reviews-widget
 * Render Google reviews from a local JSON file on any static website.
 * https://github.com/Treefella/google-reviews-widget
 *
 * Usage:
 *   <div id="reviews"></div>
 *   <script src="reviews-widget.js"></script>
 *   <script>
 *     GoogleReviewsWidget.init({
 *       url:       './reviews.json',   // path to your reviews.json
 *       container: '#reviews',         // CSS selector for the mount element
 *       max:       6,                  // max reviews to show (0 = all)
 *       theme:     'light',            // 'light' | 'dark'
 *       showBanner: true,              // show overall rating banner
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  var defaults = {
    url: './reviews.json',
    container: '#reviews',
    max: 6,
    theme: 'light',
    showBanner: true,
  };

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stars(n) {
    var filled = Math.round(n);
    var out = '';
    for (var i = 0; i < 5; i++) {
      out += i < filled ? '★' : '☆';
    }
    return out;
  }

  function renderBanner(data, root) {
    var banner = root.querySelector('.grw-banner');
    if (!banner) return;
    var rating = data.overall_rating || 5;
    var count = data.total_reviews || data.reviews_count || (data.reviews || []).length;
    banner.innerHTML =
      '<div class="grw-banner-stars">' + stars(rating) + '</div>' +
      '<div class="grw-banner-score">' + escapeHTML(String(rating)) + ' out of 5</div>' +
      '<div class="grw-banner-count">Based on ' + escapeHTML(String(count)) + ' Google reviews</div>' +
      '<div class="grw-google-badge">' +
        '<img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" width="16" height="16">' +
        '<span>Google Reviews</span>' +
      '</div>';
    banner.style.display = 'block';
  }

  function renderCards(reviews, root) {
    var list = root.querySelector('.grw-list');
    if (!list) return;
    list.innerHTML = reviews.map(function (r) {
      var name = escapeHTML(r.author_name || 'Anonymous');
      var initial = (r.author_name || '?').charAt(0).toUpperCase();
      var avatar = r.profile_photo_url
        ? '<img class="grw-avatar" src="' + escapeHTML(r.profile_photo_url) + '" alt="' + name + '">'
        : '<div class="grw-avatar grw-avatar-placeholder">' + escapeHTML(initial) + '</div>';
      return (
        '<div class="grw-card">' +
          '<span class="grw-quote">&ldquo;</span>' +
          '<div class="grw-header">' +
            avatar +
            '<div class="grw-author-info">' +
              '<div class="grw-author">' + name + '</div>' +
              '<div class="grw-stars">' + stars(r.rating || 5) + '</div>' +
            '</div>' +
          '</div>' +
          '<p class="grw-text">' + escapeHTML(r.text || '') + '</p>' +
          '<div class="grw-time">' +
            '<img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" width="13" height="13">' +
            '<span>' + escapeHTML(r.time || 'Google Review') + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function init(userOptions) {
    var opts = {};
    for (var k in defaults) opts[k] = defaults[k];
    for (var k in userOptions) opts[k] = userOptions[k];

    var mountEl = document.querySelector(opts.container);
    if (!mountEl) {
      console.warn('[google-reviews-widget] Container not found: ' + opts.container);
      return;
    }

    // Scaffold inner HTML
    mountEl.classList.add('grw-root', 'grw-theme-' + opts.theme);
    mountEl.innerHTML =
      (opts.showBanner ? '<div class="grw-banner" style="display:none"></div>' : '') +
      '<div class="grw-list"></div>';

    fetch(opts.url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var reviews = (data.reviews || []);
        if (opts.max > 0) reviews = reviews.slice(0, opts.max);

        if (!reviews.length) {
          mountEl.querySelector('.grw-list').innerHTML =
            '<p class="grw-empty">No reviews yet.</p>';
          return;
        }

        if (opts.showBanner) renderBanner(data, mountEl);
        renderCards(reviews, mountEl);
      })
      .catch(function (err) {
        console.error('[google-reviews-widget] Failed to load reviews:', err);
        mountEl.querySelector('.grw-list').innerHTML =
          '<p class="grw-empty">Could not load reviews.</p>';
      });
  }

  global.GoogleReviewsWidget = { init: init };
})(window);
