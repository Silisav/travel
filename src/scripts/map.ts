/**
 * The route map (Leaflet: there is no native slippy-map API). Loaded only on /map/.
 * Same setup as 2016: default pins with linked popups, the red route line, same view.
 * Tiles: keyless OpenStreetMap, softened to pastel with a CSS filter (see map.css).
 * Swap TILES for Stamen Watercolor (Stadia Maps) once that domain is registered.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface Route {
  home: { name: string; coords: [number, number] };
  stops: { name: string; href: string; coords: [number, number]; dates: string }[];
}

export function renderMap(container: HTMLElement) {
  const route = JSON.parse(container.dataset.route ?? '{}') as Route;
  // Visible (and sized) before Leaflet measures it.
  container.classList.add('map--ready');

  // Astro imports images as metadata objects; Leaflet wants plain URLs.
  L.Icon.Default.mergeOptions({
    iconUrl: iconUrl.src,
    iconRetinaUrl: iconRetinaUrl.src,
    shadowUrl: shadowUrl.src,
  });
  // Leaflet otherwise guesses the image path from its CSS file location.
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

  const map = L.map(container, { minZoom: 1, maxZoom: 16 }).setView([14, 116], 3);
  L.tileLayer(TILES, { attribution: ATTRIBUTION, minZoom: 1, maxZoom: 16 }).addTo(map);

  L.marker(route.home.coords, { alt: route.home.name, title: route.home.name })
    .bindPopup(route.home.name)
    .addTo(map);
  for (const stop of route.stops) {
    const link = Object.assign(document.createElement('a'), {
      href: stop.href,
      textContent: stop.name,
    });
    L.marker(stop.coords, { alt: `${stop.name} (${stop.dates})`, title: stop.name })
      .bindPopup(link)
      .addTo(map);
  }

  L.polyline([route.home.coords, ...route.stops.map((s) => s.coords)], {
    color: 'red',
    weight: 5,
    opacity: 0.5,
  }).addTo(map);
}
