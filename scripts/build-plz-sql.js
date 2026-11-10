// Turns the GeoNames postcode dump for Germany into SQL for the `plz` table (roadmap #7).
// Only needed to refresh the data; the result is part of migration 0007.
//
//   curl -O https://download.geonames.org/export/zip/DE.zip && unzip DE.zip DE.txt
//   node scripts/build-plz-sql.js DE.txt > plz.sql
//
// Data: GeoNames (https://www.geonames.org), CC BY 4.0.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
	console.error('Usage: node scripts/build-plz-sql.js <path to DE.txt>');
	process.exit(1);
}

// Columns: country, postcode, place, state, …, latitude (9), longitude (10), accuracy (11).
const rows = readFileSync(file, 'utf8')
	.split('\n')
	.filter(Boolean)
	.map((line) => line.split('\t'))
	.filter((c) => /^\d{5}$/.test(c[1]))
	.map((c) => ({
		plz: c[1],
		place: c[2],
		lat: Number(c[9]),
		lng: Number(c[10]),
		accuracy: Number(c[11] || 0)
	}));

const byPlz = new Map();
for (const r of rows) {
	const list = byPlz.get(r.plz) ?? [];
	list.push(r);
	byPlz.set(r.plz, list);
}

const quote = (s) => `'${s.replaceAll("'", "''")}'`;
const values = [...byPlz.entries()]
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([plz, list]) => {
		// The default "Ort": GeoNames marks the main place with a higher accuracy, and city districts
		// are longer ("Dresden Friedrichstadt"), so 20095 → "Hamburg", 01067 → "Dresden".
		const ranked = [...list].sort(
			(a, b) =>
				b.accuracy - a.accuracy ||
				a.place.length - b.place.length ||
				a.place.localeCompare(b.place, 'de')
		);
		const places = [...new Set(ranked.map((r) => r.place))];
		// Centre of the area: average of all its places.
		const lat = list.reduce((sum, r) => sum + r.lat, 0) / list.length;
		const lng = list.reduce((sum, r) => sum + r.lng, 0) / list.length;
		const point = `ST_SetSRID(ST_MakePoint(${lng.toFixed(4)}, ${lat.toFixed(4)}), 4326)::geography`;
		return `\t(${quote(plz)}, ${quote(places[0])}, ARRAY[${places.map(quote).join(', ')}], ${point})`;
	});

console.log(`-- ${values.length} postcodes from GeoNames (https://www.geonames.org), CC BY 4.0.`);
console.log('INSERT INTO "plz" ("plz", "city", "places", "location") VALUES');
console.log(values.join(',\n') + ';');
