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
    app.setProviderStatus("Running");
  };

  // called when the plugin is stopped or encounters an error
  plugin.stop = function() {
    client = undefined;
    app.debug('Plugin stopped');
    app.setProviderStatus('Stopped');
  };


  plugin.signalKApiRoutes = function(router) {
    const historyHandler = function(req, res, next) {
      const {
        skPath,
        context
      } = extractPath(req.path, app.selfId);
      if (!req.query.start || !req.query.end) {
        res.status(400).send('Query needs to contain both start and end parameters');
      } else if (!client) {
        res.status(501).send('No database connection');
        app.setProviderError("No database connection");
      } else {
        let start = new Date(req.query.start).toISOString();
        let end = new Date(req.query.end).toISOString();
        let query = `select * from ${skPath} where time > '${start}' and time <=  '${end}' and context =~ ${context} group by context, source`;
        app.debug("query: %s", query);
        client.query(query).then(result => result.groupRows.map(group => {
          let context = group.tags.context;
          let path = group.name;
          let source = group.tags.source;
          let timestamps = [];
          let values = [];
          group.rows.forEach(row => {
            timestamps.push(row.time);
            let value = row.value;
            if (row.jsonValue != null) {
              value = JSON.parse(row.jsonValue);
            } else if (row.stringValue != null) {
              value = row.stringValue;
            } else if (row.boolValue != null) {
              value = row.boolValue;
            }
            values.push(value);
          });
          return {
            context: context,
            timestamps: timestamps,
            properties: [{
              path: path,
              source: {
                label: source
              },
              values: values
            }]
          };
        })).then(result => {
          let history = {
            version: "1.1.0",
            startDate: start,
            endDate: end,
            objects: result
          };
          res.send(history);

        });
      }

    };
    const listHandler = function(req, res, next) {
      const path = extractPathElements(String(req.path).replace('/list/', ''), app.selfId);
      if (path[0] == 'paths') {
        let context = path.slice(1).join('.');
        let query = `show measurements where context =~ /${context}/`;
        app.debug("query: %s", query);
        client.query(query).then(result => result.map(item => item.name)).then(result => {
          let response = {
            version: "1.0.0",
            context: context,
            paths: result
          };
          res.send(response);
        });

      } else if (path[0] == 'vessels') {
        let skPath = path.slice(1).join('.');
        let query = `show tag values from /${skPath}.*/ with key = context`;
        app.debug("query: %s", query);
        client.query(query).then(result => {
          let seen = {};
          let set = [];
          // keep only unique values
          result.forEach(item => {
            if (!seen[item.value]) {
              seen[item.value] = true;
              set.push(item.value);
            }
          });
          return set;
        }).then(result => {
          let response = {
            version: "1.0.0",
            path: skPath,
            contexts: result
          };
          res.send(response);
        });

      } else {
        res.status(404).send('can only list paths or vessels');
      }
    };
    router.get('/history/*', historyHandler);
    router.get('/list/*', listHandler);
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
// Extract the path and context from the URL
function extractPath(path, selfId) {
  let result = String(path).replace('/history/', '');
  result = extractPathElements(result, selfId);
  if (result.length == 1) {
    let context = `/${result[0]}.*/`;
    let skPath = '/.*/';
    return {
      skPath,
      context
    };
  } else if (result.length > 1) {
    let context = `/${result[0]}\.${result[1]}\.*/`;
    let skPath = `/${result.slice(2).join('.')}.*/`;
    return {
      skPath,
      context
    };
  }
}

function extractPathElements(path, selfId) {
  let result = path;
  result =
    result.length > 0 ?
    result
    .replace(/\/$/, '')
    .replace(/self/, selfId)
    .split('/') :
    [];
  return result;
}
