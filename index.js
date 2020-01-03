const PLUGIN_ID = 'signalk-history-plugin';
const PLUGIN_NAME = 'SignalK History plugin';

module.exports = function(app) {
  var plugin = {};

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = 'Plugin to provide an improved history api';



  // called when the plugin is started
  plugin.start = function(options, restartPlugin) {
    app.setProviderStatus("Initializing");
    plugin.options = options;
    app.debug('Plugin started');
    // if (!app.historyProvider) {
    //   app.setProviderError("no history provider");
    //   // plugin.stop();
    // } else {
    app.setProviderStatus("Running");
    // }
  };

  // called when the plugin is stopped or encounters an error
  plugin.stop = function() {
    app.debug('Plugin stopped');
    app.setProviderStatus('Stopped');
  };

  plugin.signalKApiRoutes = function(router) {
    const historyHandler = function(req, res, next) {
      let path = String(req.path).replace('/history/', '');
      path =
        path.length > 0 ?
        path
        .replace(/\/$/, '')
        .replace(/self/, app.selfId)
        .split('/') :
        [];
      console.log("path: ", path);
      if (!req.query.start || !req.query.end) {
        res.status(400).send('Query needs to contain both start and end parameters');
      } else if (!req.app.historyProvider) {
        res.status(501).send('No history provider');
        app.setProviderError("No history provider");
      } else {
        let promises = [];
        let currentTime = new Date(req.query.start);
        const endTime = new Date(req.query.end);
        while (currentTime < endTime) {
          promises.push(new Promise(function(resolve, reject) {
            req.app.historyProvider.getHistory(currentTime, path, deltas => {
              resolve(deltas);
            });
          }));
          currentTime = new Date(currentTime.getTime() + 1000);
        }
        Promise.allSettled(promises).then((results) => {
          let deltas = [];
          results.forEach((result) => {
            if (deltas.length < 1) {
              deltas.push(result.value[0]);
            } else if (deltas[deltas.length - 1].updates[0].timestamp != result.value[0].updates[0].timestamp) {
              deltas.push(result.value[0]);
            }
          });
          console.log("promises: ", promises.length);
          console.log("deltas: ", deltas.length);
          res.send(deltas);
        });
      }

    };
    router.get('/history/*', historyHandler);
    return router;
  };

  // The plugin configuration
  plugin.schema = {

  };



  return plugin;
};
