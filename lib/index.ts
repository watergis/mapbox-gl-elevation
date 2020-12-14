import { IControl, Map as MapboxMap } from "mapbox-gl";
import distance from '@turf/distance';
import { TerrainRGB } from '@watergis/terrain-rgb';

const SOURCE_LINE = 'elev-controls-source-line';
const LAYER_LINE = 'elev-controls-layer-line';
const LAYER_SYMBOL = 'elev-controls-layer-symbol';
const SOURCE_SYMBOL = 'elev-controls-source-symbol';

type Options = {
  tileSize: number;
  font: string[]
  fontSize: number;
  fontHalo: number;
  mainColor: string;
  haloColor: string;
  labelFormat?: Function;
  units: string;
}

/**
 * Mapbox GL Elevation Control.
 * @param {string} url - URL for terrain-rgb tilesets
 * @param {object} options - Options
 * @param {String} [options.units='kilometers'] - Any units [@turf/distance](https://github.com/Turfjs/turf/tree/master/packages/turf-distance) supports
 * @param {Function} [options.labelFormat] - Accepts number and returns label.
 * Can be used to convert value to any measuring units
 * @param {Array} [options.font=['sans]] - Array of fonts.
 * @param {String} [options.mainColor='#263238'] - Color of ruler lines.
 * @param {String} [options.haloColor='#fff'] - Color of halo and inner marker background.
 * @param {String} [options.fontSize='12'] - Label font size
 * @param {String} [options.fontHalo='1'] - Label font halo
 */

export default class MapboxElevationControl implements IControl
{

    private container: HTMLElement;
    private map?: MapboxMap;
    private button: HTMLButtonElement;
    private isQuery: boolean;
    private markers: mapboxgl.Marker[] = [];
    private coordinates : number[][] = [];
    private elevations: number[] = [];
    private elevLabels : string[]= [];
    private url: string;
    private labelFormat: Function;
    private units: string;
    
    private options: Options = {
      tileSize: 512,
      font: ['sans'],
      fontSize: 12,
      fontHalo: 1,
      mainColor: '#263238',
      haloColor: '#fff',
      units: 'kilometers',
    };

    constructor(url: string, options: Options)
    {
      this.url = url;
      if (options){
        this.options = Object.assign(this.options, options);
      }
      this.labelFormat = options.labelFormat || this.defaultLabelFormat;
      this.units = options.units;
      this.onDocumentClick = this.onDocumentClick.bind(this);
      this.mapClickListener = this.mapClickListener.bind(this);
      this.isQuery = false;
    }

    public getDefaultPosition(): string
    {
        const defaultPosition = "top-right";
        return defaultPosition;
    }

    public onAdd(map: MapboxMap): HTMLElement
    {
        this.map = map;
        this.container = document.createElement("div");
        this.container.classList.add('mapboxgl-ctrl');
        this.container.classList.add('mapboxgl-ctrl-group');
        this.container.classList.add('mapboxgl-elevation-list');
        this.button = document.createElement('button');
        this.button.classList.add('mapboxgl-elevation-control');
        this.button.setAttribute('type', 'button');
        this.button.addEventListener("click", () => {
          if (this.isQuery) {
            this.measuringOff();
          } else {
            this.measuringOn();
          }
        });
        this.container.appendChild(this.button);

        return this.container;
    }

    measuringOn(){
      this.markers = [];
      this.coordinates = [];
      this.elevations = [];
      this.elevLabels = [];
      this.isQuery = true;
      if (this.map){
        this.map.getCanvas().style.cursor = 'crosshair';
        this.button.classList.add('-active');

        this.map.addSource(SOURCE_LINE, {
          type: 'geojson',
          data: this.geoLineString(this.coordinates),
        });
        this.map.addSource(SOURCE_SYMBOL, {
          type: 'geojson',
          data: this.geoPoint(this.coordinates, this.elevLabels),
        });
        this.map.addLayer({
          id: LAYER_LINE,
          type: 'line',
          source: SOURCE_LINE,
          paint: {
            'line-color': this.options.mainColor,
            'line-width': 2,
          },
        });
        this.map.addLayer({
          id: LAYER_SYMBOL,
          type: 'symbol',
          source: SOURCE_SYMBOL,
          layout: {
            'text-field': '{text}',
            'text-font': this.options.font,
            'text-size': this.options.fontSize,
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.8,
            // @ts-ignore
            'text-justify': 'auto',
          },
          paint: {
            'text-color': this.options.mainColor,
            'text-halo-color': this.options.haloColor,
            'text-halo-width': this.options.fontHalo,
          },
        });

        this.map.on('click', this.mapClickListener);
        this.map.fire('elevation.on');
      }
    }

    measuringOff(){
      this.isQuery = false;
      if (this.map){
        this.map.getCanvas().style.cursor = '';
        this.button.classList.remove('-active');
        this.map.removeLayer(LAYER_LINE);
        this.map.removeLayer(LAYER_SYMBOL);
        this.map.removeSource(SOURCE_LINE);
        this.map.removeSource(SOURCE_SYMBOL);
        this.markers.forEach((m) => m.remove());
        this.map.off('click', this.mapClickListener);
        this.map.fire('elevation.off');
      }
    }

    mapClickListener(event){
      const this_ = this;
      let zoom = this.map?.getZoom();
      if (!zoom) {
        zoom = 15;
      }
      zoom = Math.round(zoom);
      const lnglat = [event.lngLat.lng, event.lngLat.lat]
      const trgb = new TerrainRGB(this.url, this.options.tileSize);
      trgb.getElevation(lnglat, zoom)
      .then(elev=>{
        if (this_.map) {
          const markerNode = document.createElement('div');
          markerNode.style.width = '12px';
          markerNode.style.height = '12px';
          markerNode.style.borderRadius = '50%';
          markerNode.style.background = this_.options.haloColor;
          markerNode.style.boxSizing = 'border-box';
          markerNode.style.border = `2px solid ${this_.options.mainColor}`;
          // @ts-ignore
          const marker = new mapboxgl.Marker({
            element: markerNode,
            draggable: true,
          }).setLngLat(event.lngLat).addTo(this_.map);
          this.markers.push(marker);

          this_.coordinates.push(lnglat);
          this_.elevations.push(elev);
          this_.elevLabels = this_.elevationsToLabels();
          // @ts-ignore
          this_.map.getSource(SOURCE_LINE).setData(this_.geoLineString(this.coordinates));
          // @ts-ignore
          this_.map.getSource(SOURCE_SYMBOL).setData(this_.geoPoint(this.coordinates, this.elevLabels));
        };
        
      })
    }

    elevationsToLabels() {
      const { coordinates, elevations, labelFormat, units } = this;
      let sum = 0;
      return coordinates.map((coordinate ,index) => {
        let elev = elevations[index];
        if (index === 0) return labelFormat(0, elev);
        sum += distance(coordinates[index - 1], coordinates[index], { units });
        return labelFormat(sum, elev);
      });
    }

    private defaultLabelFormat(length: number, elevation: number) {
      let lengthLabel = `${length.toFixed(2)} km`;
      if (length < 1) {
        lengthLabel = `${(length * 1000).toFixed()} m`;
      }
      let elevLabel = '';
      if (elevation > 0){
        elevLabel = `\nalt.${elevation}m`;
      }
      return `${lengthLabel}${elevLabel}`;
    }

    private geoLineString(coordinates: number[][] = []): any {
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      };
    }

    private geoPoint(coordinates: number[][] = [], labels: string[] = []): any {
      return {
        type: 'FeatureCollection',
        features: coordinates.map((c, i) => ({
          type: 'Feature',
          properties: {
            text: labels[i],
          },
          geometry: {
            type: 'Point',
            coordinates: c,
          },
        })),
      };
    }

    public onRemove(): void
    {
      if (!this.container || !this.container.parentNode || !this.map || !this.button) {
        return;
      }
      if (this.isQuery) {
        this.measuringOff();
      }
      this.map.off('click', this.mapClickListener);
      this.container.parentNode.removeChild(this.container);
      document.removeEventListener("click", this.onDocumentClick);
      this.map = undefined;
    }

    private onDocumentClick(event: MouseEvent): void{
      if (this.container && !this.container.contains(event.target as Element) && this.button) {
        this.button.style.display = "block";
      }
    }
}