const PLUGIN_ID = 'signalk-history-plugin';
const PLUGIN_NAME = 'SignalK History plugin';
const Influx = require('influx');

module.exports = function(app) {
  var plugin = {};
  var client;

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = 'Plugin to provide an improved history api';



  // called when the plugin is started
  plugin.start = function(options, restartPlugin) {
    app.setProviderStatus("Initializing");
    plugin.options = options;
    app.debug('Plugin started');
    client = new Influx.InfluxDB({
      host: options.host,
      port: options.port, // optional, default 8086
      protocol: 'http', // optional, default 'http'
      database: options.database
    });
    client
      .getDatabaseNames()
      .then(names => {
        app.debug('Connected');
        if (!names.includes(options.database)) {
          app.setProviderError("database not found");
          plugin.stop();
        }
      })
      .catch(err => {
        console.log(err);
        app.setProviderError(err);
        plugin.stop();
      });
    // if (!app.historyProvider) {
    //   app.setProviderError("no history provider");
    //   // plugin.stop();
    // } else {
    app.setProviderStatus("Running");
    // }
  };

  // called when the plugin is stopped or encounters an error
  plugin.stop = function() {
    client = undefined;
    app.debug('Plugin stopped');
    app.setProviderStatus('Stopped');
  };

  plugin.signalKApiRoutes = function(router) {
    const historyHandler = function(req, res, next) {
      const path = extractPath(req.path, app.selfId);
      console.log("path: ", path);
      if (!req.query.start || !req.query.end) {
        res.status(400).send('Query needs to contain both start and end parameters');
      } else if (!client) {
        res.status(501).send('No database connection');
        app.setProviderError("No database connection");
      } else {
        let promises = [];
        const endTime = new Date(req.query.end);
        const historyProvider = req.app.historyProvider;
        for (let currentTime = new Date(req.query.start); currentTime < endTime; currentTime = new Date(currentTime.getTime() + 1000)) {
          promises.push(new Promise(function(resolve, reject) {
            historyProvider.getHistory(currentTime, path, deltas => {
              resolve(deltas);
            });
          }));

        }
        Promise.allSettled(promises).then((results) => {
          let deltas = [];
          let lastTimestamps = {};
          results.forEach((result) => {
            result.value.forEach(obj => {
              let deltaPath = obj.updates[0].values[0].path;
              if (!lastTimestamps[deltaPath] || lastTimestamps[deltaPath] != obj.updates[0].timestamp) {
                deltas.push(obj);
                lastTimestamps[deltaPath] = obj.updates[0].timestamp;
              }
            });
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
    required: ['host', 'port', 'database'],
    properties: {
      host: {
        type: 'string',
        title: 'Host',
        default: 'localhost'
      },
      port: {
        type: 'number',
        title: 'Port',
        default: 8086
      },
      database: {
        type: 'string',
        title: 'Database'
      }
    }

  };



  return plugin;
};

function extractPath(path, selfId) {
  let result = String(path).replace('/history/', '');
  result =
    result.length > 0 ?
    result
    .replace(/\/$/, '')
    .replace(/self/, selfId)
    .split('/') :
    [];
  return result;
}
