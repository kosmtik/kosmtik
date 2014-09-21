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


## Kown plugins

- kosmtik-overpass-layer: to add Overpass Layer in your carto project
- kosmtik-fetch-remote: automagically fetch remote files in your layers
