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
        req.app.historyProvider.getHistory(new Date(req.query.start), path, deltas => {
          console.log(deltas.length);
          res.send(deltas);
        });
        console.log(req.query);
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
