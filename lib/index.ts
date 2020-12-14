import { IControl, Map as MapboxMap } from "mapbox-gl";
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
  elevLabelFormat?: Function;
}

/**
 * Mapbox GL Elevation Control.
 * @param {string} url - URL for terrain-rgb tilesets
 * @param {object} options - Options
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
    private elevLabelFormat: Function;
    
    private options: Options = {
      tileSize: 512,
      font: ['sans'],
      fontSize: 12,
      fontHalo: 1,
      mainColor: '#263238',
      haloColor: '#fff',
    };

    constructor(url: string, options: Options)
    {
      this.url = url;
      if (options){
        this.options = Object.assign(this.options, options);
      }
      this.elevLabelFormat = options.elevLabelFormat || this.defaultElevLabelFormat;
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
        if (elev < 0){
          elev = 0;
        }
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
      const { elevations, elevLabelFormat } = this;
      return elevations.map(elev => {
        return elevLabelFormat(elev);
      });
    }

    private defaultElevLabelFormat(elevation: number) {
      return `alt.${elevation}m`;
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