<script lang="ts" module>
	export type MapRequest = {
		id: string;
		title: string;
		categoryName: string;
		plz: string;
		city: string;
		lat: number | null;
		lng: number | null;
		distanceKm: number | null;
	};
</script>

<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';
	import { formatDistance } from '#lib/geo.ts';

	let {
		requests,
		origin = null,
		radiusKm = null
	}: {
		requests: MapRequest[];
		origin?: { lat: number; lng: number; plz: string; city: string } | null;
		radiusKm?: number | null;
	} = $props();

	let container: HTMLDivElement;
	let L = $state<typeof import('leaflet')>();
	let map = $state<LeafletMap>();
	let layers: LayerGroup | undefined;

	// Leaflet needs `window`, so it is loaded in the browser only.
	$effect(() => {
		let cancelled = false;
		let created: LeafletMap | undefined;
		import('leaflet').then((mod) => {
			if (cancelled) return;
			L = mod.default ?? mod;
			created = L.map(container, { scrollWheelZoom: false }).setView([51.2, 10.4], 6);
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 18,
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · PLZ: <a href="https://www.geonames.org">GeoNames</a>'
			}).addTo(created);
			map = created;
		});
		return () => {
			cancelled = true;
			created?.remove();
		};
	});

	/** Several requests in one PLZ share a position, so they become one marker with a list. */
	function groupByPosition(list: MapRequest[]) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local helper, not state
		const groups = new Map<string, { lat: number; lng: number; items: MapRequest[] }>();
		for (const r of list) {
			if (r.lat === null || r.lng === null) continue;
			const key = `${r.lat},${r.lng}`;
			const group = groups.get(key) ?? { lat: r.lat, lng: r.lng, items: [] };
			group.items.push(r);
			groups.set(key, group);
		}
		return [...groups.values()];
	}

	// Built from DOM nodes, not HTML strings, so titles can't inject markup.
	function popupContent(items: MapRequest[]) {
		const root = document.createElement('div');
		const place = document.createElement('div');
		place.className = 'mb-1 text-xs text-stone-500';
		const distance = items[0].distanceKm;
		place.textContent = `${items[0].plz} ${items[0].city}${distance !== null ? ` · ${formatDistance(distance)}` : ''}`;
		root.append(place);
		const list = document.createElement('ul');
		list.className = 'space-y-1';
		for (const r of items) {
			const li = document.createElement('li');
			const link = document.createElement('a');
			link.href = `/anfragen/${r.id}`;
			link.className = 'font-medium text-emerald-700 hover:underline';
			link.textContent = r.title;
			const category = document.createElement('div');
			category.className = 'text-xs text-stone-500';
			category.textContent = r.categoryName;
			li.append(link, category);
			list.append(li);
		}
		root.append(list);
		return root;
	}

	// Redraw markers whenever the results change (e.g. after filtering).
	$effect(() => {
		if (!L || !map) return;
		layers?.remove();
		layers = L.layerGroup().addTo(map);
		const bounds = L.latLngBounds([]);

		for (const group of groupByPosition(requests)) {
			const count = group.items.length;
			const icon = L.divIcon({
				className: '',
				html: `<div class="request-marker">${count > 1 ? count : ''}</div>`,
				iconSize: [28, 28],
				iconAnchor: [14, 14],
				popupAnchor: [0, -14]
			});
			L.marker([group.lat, group.lng], {
				icon,
				title: count > 1 ? `${count} Anfragen` : group.items[0].title
			})
				.bindPopup(() => popupContent(group.items))
				.addTo(layers);
			bounds.extend([group.lat, group.lng]);
		}

		if (origin) {
			const center = L.latLng(origin.lat, origin.lng);
			L.circleMarker(center, { radius: 6, color: '#1c1917', weight: 2, fillOpacity: 1 })
				.bindTooltip(`${origin.plz} ${origin.city}`)
				.addTo(layers);
			if (radiusKm) {
				const circle = L.circle(center, {
					radius: radiusKm * 1000,
					color: '#059669',
					weight: 1,
					fillOpacity: 0.06
				}).addTo(layers);
				// With a radius, frame the search area; shipping results far away stay reachable by zooming out.
				map.fitBounds(circle.getBounds(), { padding: [20, 20], animate: false });
				return;
			}
			bounds.extend(center);
		}

		if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12, animate: false });
		else map.setView([51.2, 10.4], 6, { animate: false });
	});
</script>

<div
	bind:this={container}
	class="isolate h-[65vh] min-h-80 w-full rounded-lg border border-stone-200 bg-stone-100"
></div>

<style>
	:global(.request-marker) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 9999px;
		border: 3px solid white;
		background: #059669;
		color: white;
		font-size: 12px;
		font-weight: 700;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
	}
</style>
