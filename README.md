# Kosmtik

Very lite but extendable mapping framework to create Mapnik ready maps with
OpenStreetMap data (and more).

For now, only Carto based projects are supported (with .mml or .yml config),
but in the future we hope to plug in MapCSS too.

**Very very alpha, do not use it unless you like climbing in the ice!**

## Lite

Only the core needs:

- project loading
- local configuration management
- tiles server for live feedback when coding
- exports to common formats (Mapnik XML, PNG…)
- hooks everywhere to make easy to extend it with plugins


## Install

Clone this repository and:

```
npm install
```

## Usage

To get command line help, run:

```
node index.js -h
```

To run a Carto project (or `.yml`, `.yaml`):

```
node index.js project <path/to/your/project.mml>
```

Then open your browser at http://127.0.0.1:6789/.


## Local config

Because you often need to change the project config to match your
local env, for example to adapt the database connection credentials,
kosmtik comes with an internal plugin to manage that. You have two
options: with a json file named `localconfig.json`, or with a js module
name `localconfig.js`.

In both cases, the behaviour is the same, you create some rules to target
the configuration and changes the values. Those rules are started by the
keyword `where`, and you define which changes to apply using `then`
keyword. You can also filter the targeted objects by using the `if` clause.
See the examples below to get it working right now.

### Example of a json file
```
[
    {
        "where": "center",
        "then": [29.9377, -3.4216, 9]
    },
    {
        "where": "Layer",
        "if": {
            "Datasource.type": "postgis"
        },
        "then": {
            "Datasource.dbname": "burundi",
            "Datasource.password": "",
            "Datasource.user": "ybon",
            "Datasource.host": ""
        }
    },
    {
        "where": "Layer",
        "if": {
            "id": "hillshade"
        },
        "then": {
            "Datasource.file": "/home/ybon/Code/maps/hdm/DEM/data/hillshade.vrt"
        }
    }
]
```

### Example of a js module
```
exports.LocalConfig = function (localizer) {
    localizer.where('center').then([29.9377, -3.4216, 9]);
    localizer.where('Layer').if({'Datasource.type': 'postgis'}).then({
        "Datasource.dbname": "burundi",
        "Datasource.password": "",
        "Datasource.user": "ybon",
        "Datasource.host": ""
    });
};

```

## Kown plugins

- kosmtik-overpass-layer: to add Overpass Layer in your carto project
- kosmtik-fetch-remote: automagically fetch remote files in your layers
