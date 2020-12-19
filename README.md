# mapbox-gl-elevation
![](https://github.com/watergis/mapbox-gl-elevation/workflows/Node.js%20Package/badge.svg)
![GitHub](https://img.shields.io/github/license/watergis/mapbox-gl-elevation)

This module adds elevation control to mapbox-gl.

## Installation:

```bash
npm i @watergis/mapbox-gl-elevation --save
```

## Demo:

See [demo](https://watergis.github.io/mapbox-gl-elevation/#12/-1.08551/35.87063).

![demo](./demo.gif)

## Test:

```
npm run build
npm start
```

open [http://localhost:8080](http://localhost:8080).

## Usage:

```ts
import MapboxElevationControl from "@watergis/mapbox-gl-elevation";
import '@watergis/mapbox-gl-elevation/css/styles.css';
import mapboxgl from 'mapbox-gl';

const map = new mapboxgl.Map();
map.addControl(new MapboxElevationControl(
        'https://wasac.github.io/rw-terrain/tiles/{z}/{x}/{y}.png',
        { 
          font: ['Roboto Medium'],
          fontSize: 12,
          fontHalo: 1,
          mainColor: '#263238',
          haloColor: '#fff',
        }
    ), 'top-right');
});
```

## Contribution

This Mapbox GL Elevation Control is still under development. so most welcome any feedbacks and pull request to this repository.
