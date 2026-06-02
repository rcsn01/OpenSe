(function () {
  var supportedApps = { accounts: true, etl: true, stoqr: true };

  var getPlugin = function (name) {
    return window.Capacitor && window.Capacitor.Plugins
      ? window.Capacitor.Plugins[name]
      : undefined;
  };

  var mobileDeepLinkToPath = function (value) {
    var parsed = new URL(value);
    if (parsed.protocol !== 'opense:' || parsed.hostname !== 'mobile') {
      return '';
    }

    var parts = parsed.pathname.split('/').filter(Boolean);
    var appName = parts.shift();
    if (!supportedApps[appName]) {
      return '';
    }

    var routePath = '/' + parts.join('/');
    if (routePath === '/') {
      return '/' + appName + '/index.html#/' + parsed.search + parsed.hash;
    }

    return '/' + appName + '/index.html#' + routePath + parsed.search + parsed.hash;
  };

  var routeDeepLink = function (value) {
    var path = mobileDeepLinkToPath(value);
    if (!path) {
      return false;
    }

    window.location.assign(new URL(path, window.location.href).toString());
    return true;
  };

  var openExternal = function (url) {
    var Browser = getPlugin('Browser');
    if (Browser && Browser.open) {
      return Browser.open({ url: url });
    }

    window.location.assign(url);
    return Promise.resolve();
  };

  window.openseMobile = {
    openExternal: openExternal,
    routeDeepLink: routeDeepLink
  };

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    var href = target ? target.getAttribute('href') : '';
    if (href && href.indexOf('opense://mobile/') === 0 && routeDeepLink(href)) {
      event.preventDefault();
    }
  }, true);

  var App = getPlugin('App');
  if (!App) {
    return;
  }

  if (App.addListener) {
    App.addListener('appUrlOpen', function (event) {
      var Browser = getPlugin('Browser');
      if (Browser && Browser.close) {
        Browser.close().catch(function () {});
      }
      if (event && event.url) {
        routeDeepLink(event.url);
      }
    });
  }

  if (App.getLaunchUrl) {
    App.getLaunchUrl().then(function (event) {
      if (event && event.url) {
        routeDeepLink(event.url);
      }
    }).catch(function () {});
  }
})();
