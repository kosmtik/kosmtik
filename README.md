# Kosmtik

[![Join the chat at https://gitter.im/kosmtik/kosmtik](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/kosmtik/kosmtik?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Dependency Status](https://david-dm.org/kosmtik/kosmtik.svg)](https://david-dm.org/kosmtik/kosmtik)
[![Build Status](https://travis-ci.org/kosmtik/kosmtik.svg?branch=master)](https://travis-ci.org/kosmtik/kosmtik)

Very lite but extendable mapping framework to create Mapnik ready maps with
OpenStreetMap data (and more).

For now, only Carto based projects are supported (with .mml or .yml config),
but in the future we hope to plug in MapCSS too.

**Alpha version, installable only from source**


## Lite

Only the core needs:

- project loading
- local configuration management
- tiles server for live feedback when coding
- exports to common formats (Mapnik XML, PNG…)
- hooks everywhere to make easy to extend it with plugins


## Screenshot

![screenshot](https://raw.github.com/kosmtik/kosmtik/master/screenshot.png "Screenshot of Kosmtik")


## Install

Clone this repository with ``git clone https://github.com/kosmtik/kosmtik.git``,
go to the downloaded directory with ``cd kosmtik``, and run:

```
npm install
```

## Update

Obtain changes from repository (e.g. `git pull`)

    rm -rf node_modules && npm install

To reinstall all plugins:

    node index.js plugins --reinstall

## Usage

To get command line help, run:

```
node index.js -h
```

To run a Carto project (or `.yml`, `.yaml`):

```
node index.js serve <path/to/your/project.mml>
```

Then open your browser at http://127.0.0.1:6789/.


You may also want to install plugins. To see the list of available ones, type:

```
node index.js plugins --available
```

And then pick one and install it like this:
```
node index.js plugins --install pluginname
```

For example:
```
node index.js plugins --install kosmtik-map-compare [--install kosmtik-overlay…]
```


## Local config

Because you often need to change the project config to match your
local env, for example to adapt the database connection credentials,
kosmtik comes with an internal plugin to manage that. You have two
options: with a json file named `localconfig.json`, or with a js module
name `localconfig.js`.

Place your localconfig.js or localconfig.json file in the same directory as your 
carto project (or `.yml`, `.yaml`).

In both cases, the behaviour is the same, you create some rules to target
the configuration and changes the values. Those rules are started by the
keyword `where`, and you define which changes to apply using `then`
keyword. You can also filter the targeted objects by using the `if` clause.
See the examples below to get it working right now.



### Example of a json file
```json
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
```javascript
exports.LocalConfig = function (localizer, project) {
    localizer.where('center').then([29.9377, -3.4216, 9]);
    localizer.where('Layer').if({'Datasource.type': 'postgis'}).then({
        "Datasource.dbname": "burundi",
        "Datasource.password": "",
        "Datasource.user": "ybon",
        "Datasource.host": ""
    });
    // You can also do it in pure JS
    project.mml.bounds = [1, 2, 3, 4];
};

```

## Known plugins

- [kosmtik-overpass-layer](https://github.com/kosmtik/kosmtik-overpass-layer): add Overpass Layer in your carto project
- [kosmtik-fetch-remote](https://github.com/kosmtik/kosmtik-fetch-remote): automagically fetch remote files in your layers
- [kosmtik-place-search](https://github.com/kosmtik/kosmtik-place-search): search places control
- [kosmtik-overlay](https://github.com/kosmtik/kosmtik-overlay): add an overlay above the map
- [kosmtik-open-in-josm](https://github.com/kosmtik/kosmtik-open-in-josm): open JOSM with current view
- [kosmtik-map-compare](https://github.com/kosmtik/kosmtik-map-compare): display a map side-by-side with your work
- [kosmtik-osm-data-overlay](https://github.com/kosmtik/kosmtik-osm-data-overlay): display OSM data on top of your map
- [kosmtik-tiles-export](https://github.com/kosmtik/kosmtik-tiles-export): export a tiles tree from your project
- [kosmtik-mbtiles-export](https://github.com/kosmtik/kosmtik-mbtiles-export): export your project in MBTiles

Run `node index.js plugins --available` to get an up to date list.
