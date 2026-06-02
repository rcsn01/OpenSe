(function () {
  var storageKey = 'opense.mobile.config.v1';
  var discoveryPath = '/.well-known/opense-desktop.json';
  var form = document.getElementById('setup-form');
  var input = document.getElementById('accounts-url');
  var button = document.getElementById('setup-button');
  var status = document.getElementById('setup-status');

  var describeError = function (error) {
    if (!error) return 'Unknown error';
    var parts = [];
    if (error.name) parts.push(error.name);
    if (error.message) parts.push(error.message);
    return parts.length ? parts.join(': ') : String(error);
  };

  var normalizeAccountsUrl = function (value) {
    var parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Accounts URL must start with http or https.');
    }
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/+$/, '');
  };

  var validateDiscovery = function (value) {
    if (!value || typeof value !== 'object') {
      throw new Error('Discovery response must be a JSON object.');
    }
    if (value.version !== 1) {
      throw new Error('Unsupported discovery version.');
    }
    if (typeof value.supabaseUrl !== 'string' || !/^https?:\/\//.test(value.supabaseUrl)) {
      throw new Error('Discovery response must include a valid Supabase URL.');
    }
    if (typeof value.supabasePublishableKey !== 'string' || !value.supabasePublishableKey.trim()) {
      throw new Error('Discovery response must include a Supabase publishable key.');
    }
    if (typeof value.googleAuthEnabled !== 'boolean') {
      throw new Error('Discovery response must include googleAuthEnabled.');
    }
    return {
      version: 1,
      instanceName: typeof value.instanceName === 'string' && value.instanceName.trim() ? value.instanceName.trim() : 'OpenSe',
      supabaseUrl: value.supabaseUrl.trim().replace(/\/+$/, ''),
      supabasePublishableKey: value.supabasePublishableKey.trim(),
      googleAuthEnabled: value.googleAuthEnabled
    };
  };

  try {
    var stored = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    if (stored && stored.accountsUrl) {
      input.value = stored.accountsUrl;
    }
  } catch (error) {
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.textContent = 'Connecting...';
    button.disabled = true;

    Promise.resolve()
      .then(function () {
        var accountsUrl = normalizeAccountsUrl(input.value);
        var discoveryUrl = accountsUrl + discoveryPath;
        status.textContent = 'Fetching ' + discoveryUrl + ' ...';

        return fetch(discoveryUrl)
          .then(function (response) {
            var contentType = response.headers.get('content-type') || 'unknown';
            if (!response.ok) {
              throw new Error(
                'Discovery request failed.\nURL: ' + discoveryUrl +
                '\nHTTP: ' + response.status + ' ' + response.statusText +
                '\nContent-Type: ' + contentType
              );
            }

            return response.text().then(function (body) {
              var trimmed = body.trim();
              if (trimmed.indexOf('<!doctype') === 0 || trimmed.indexOf('<html') === 0) {
                throw new Error(
                  'Discovery endpoint returned HTML instead of JSON.\nURL: ' + discoveryUrl +
                  '\nContent-Type: ' + contentType +
                  '\nPreview: ' + trimmed.slice(0, 160)
                );
              }

              try {
                return JSON.parse(body);
              } catch (error) {
                throw new Error(
                  'Discovery endpoint returned invalid JSON.\nURL: ' + discoveryUrl +
                  '\nContent-Type: ' + contentType +
                  '\nError: ' + describeError(error) +
                  '\nPreview: ' + trimmed.slice(0, 160)
                );
              }
            });
          })
          .catch(function (error) {
            if (error && error.message && error.message.indexOf('Discovery') === 0) {
              throw error;
            }
            throw new Error(
              'Could not fetch the discovery endpoint.\nURL: ' + discoveryUrl +
              '\nError: ' + describeError(error) +
              '\nIf this works in Safari, reinstall the app from Xcode so local-network and WebView HTTP permissions refresh.'
            );
          })
          .then(function (json) {
            var discovery = validateDiscovery(json);
            status.textContent = 'Connected. Opening Accounts...';
            window.localStorage.setItem(storageKey, JSON.stringify({ accountsUrl: accountsUrl, discovery: discovery }));
            window.location.assign('./accounts/index.html#/login');
          });
      })
      .catch(function (error) {
        status.textContent = describeError(error);
      })
      .finally(function () {
        button.disabled = false;
      });
  });
})();
