# SignalK history plugin

This package is designed to provide a historical data to clients, it uses the data stored by the [signalk-to-influxdb](https://github.com/tkurki/signalk-to-influxdb) plugin to provide this. The data is supplied in the format proposed [here](https://github.com/SignalK/specification/pull/513).

## Installation

To install this package clone it from git and run npm install. The signalk-to-influxdb plugin should also be installed and setup.

```
git clone https://github.com/codekilo/signalk-history-plugin.git
cd signalk-history-plugin
npm install
```

## configuration
The plugin has 3 parameters 

- host 
    + the IP address or hostname of the database server.
- port 
    + the port for the database.
- database
    + the name of the database the data is stored in.

## use

The plugin provides 3 REST endpoints

### GET /signalk/v1/api/history/\<path\> 
This endpoint requires two parameters `start` and `end`.
The data is returned in the proposed signalk history format.

### GET /signalk/v1/api/list/paths/\<vessel\> 
This endpoint provides a list of paths for which data is stored in the database for the specified vessel. Vessel is an optional parameter, when it is not provided the available paths for all vessels will be shown.

example output
```
{
    "version":"1.0.0",
    "context":"vessels.urn:mrn:imo:mmsi:205386990",
    "paths":
        ["communication","design.aisShipType", ...]
}
```


### GET /signalk/v1/api/list/vessels/\<path\> 

This endpoint provides a list of vessels for which data is stored in the database for the specified path. Path is an optional parameter, when it is not provided the available vessels for all paths will be shown.

example output
```
{
    "version":"1.0.0",
    "path":"navigation.position",
    "contexts":["aircraft.urn:mrn:imo:mmsi:249126747",
        "aircraft.urn:mrn:imo:mmsi:488088339",
        "vessels.urn:mrn:imo:mmsi:000000056", ...]
}
```
