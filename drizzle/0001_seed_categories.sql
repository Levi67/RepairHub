-- Fixed category tree (see Technical.md 3.2). Top-level first, then children by parent slug.
INSERT INTO "category" ("slug", "name", "sort_order") VALUES
	('elektronik', 'Elektronik', 10),
	('haushaltsgeraete', 'Haushaltsgeräte', 20),
	('fahrzeuge', 'Fahrzeuge', 30),
	('kleidung-textil', 'Kleidung & Textil', 40),
	('moebel-holz', 'Möbel & Holz', 50),
	('schmuck-uhren', 'Schmuck & Uhren', 60),
	('spielzeug', 'Spielzeug', 70),
	('musikinstrumente', 'Musikinstrumente', 80),
	('sonstiges', 'Sonstiges', 90);
--> statement-breakpoint
INSERT INTO "category" ("slug", "name", "sort_order", "parent_id")
SELECT c.slug, c.name, c.sort_order, p.id
FROM (VALUES
	('smartphone', 'Smartphone', 10, 'elektronik'),
	('tablet', 'Tablet', 20, 'elektronik'),
	('laptop-pc', 'Laptop/PC', 30, 'elektronik'),
	('konsole', 'Konsole', 40, 'elektronik'),
	('audio-hifi', 'Audio/HiFi', 50, 'elektronik'),
	('kamera', 'Kamera', 60, 'elektronik'),
	('sonstige-elektronik', 'Sonstige Elektronik', 70, 'elektronik'),
	('kuechengeraete', 'Küchengeräte', 10, 'haushaltsgeraete'),
	('waschmaschine-trockner', 'Waschmaschine/Trockner', 20, 'haushaltsgeraete'),
	('staubsauger', 'Staubsauger', 30, 'haushaltsgeraete'),
	('kaffeemaschine', 'Kaffeemaschine', 40, 'haushaltsgeraete'),
	('fahrrad', 'Fahrrad', 10, 'fahrzeuge'),
	('e-bike-e-scooter', 'E-Bike/E-Scooter', 20, 'fahrzeuge'),
	('kleidung', 'Kleidung', 10, 'kleidung-textil'),
	('schuhe', 'Schuhe', 20, 'kleidung-textil'),
	('taschen', 'Taschen', 30, 'kleidung-textil')
) AS c(slug, name, sort_order, parent_slug)
JOIN "category" p ON p.slug = c.parent_slug;
