import $ from 'jquery';
import mapboxgl from 'mapbox-gl';
import MapboxElevationControl from '../dist/index';
import '../css/styles.css';

$(function(){
    // mapboxgl.accessToken='your mapbox access token'
    const map = new mapboxgl.Map({
        container: 'map',
        // style: 'mapbox://styles/mapbox/streets-v11',
        style:'https://wasac.github.io/mapbox-stylefiles/unvt/style.json',
        center: [29.898, -2.054],
        zoom: 9,
        hash:true,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new MapboxElevationControl(
        'https://wasac.github.io/rw-terrain/tiles/{z}/{x}/{y}.png',
        { tileSize: 512}
    ), 'top-right');
})