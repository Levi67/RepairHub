// Pool for the admin test data generator (#64). Entries are keyed by category slug; the generator
// only uses slugs that exist, so renamed categories just get fewer test requests.

type Item = { title: string; description: string; brand?: string; model?: string };

export const REQUEST_POOL: Record<string, Item[]> = {
	smartphone: [
		{
			title: 'Display gesprungen',
			description:
				'Das Handy ist runtergefallen, oben links ist das Glas gesplittert. Touch geht noch, aber Splitter lösen sich.',
			brand: 'Apple',
			model: 'iPhone 13'
		},
		{
			title: 'Akku hält keinen halben Tag mehr',
			description:
				'Nach etwa 4 Stunden ist der Akku leer, auch wenn ich kaum etwas mache. Akkuzustand laut Einstellungen 71 %.',
			brand: 'Samsung',
			model: 'Galaxy S21'
		},
		{
			title: 'Ladebuchse wackelt',
			description:
				'Das Kabel muss ich in einem bestimmten Winkel halten, damit es lädt. Mit anderen Kabeln das gleiche Problem.',
			brand: 'Google',
			model: 'Pixel 7'
		}
	],
	tablet: [
		{
			title: 'Tablet startet nicht mehr',
			description:
				'Nach einem Update bleibt es beim Logo hängen. Neustart und Wiederherstellungsmodus habe ich schon probiert.',
			brand: 'Apple',
			model: 'iPad Air 4'
		},
		{
			title: 'Ladeanschluss defekt',
			description:
				'Lädt nur noch, wenn ich das Kabel festhalte. Im Anschluss ist kein Dreck zu sehen.',
			brand: 'Lenovo',
			model: 'Tab P11'
		}
	],
	'laptop-pc': [
		{
			title: 'Laptop wird extrem heiß und laut',
			description:
				'Der Lüfter läuft ständig auf voller Stufe, nach 20 Minuten schaltet sich das Gerät ab. Vermutlich müsste er mal gereinigt werden.',
			brand: 'Lenovo',
			model: 'ThinkPad T480'
		},
		{
			title: 'Tastatur: mehrere Tasten ohne Funktion',
			description:
				'E, R und die Leertaste reagieren nur noch bei festem Drücken. Ist mir Kaffee drübergelaufen, vor zwei Wochen.',
			brand: 'HP',
			model: 'EliteBook 840'
		},
		{
			title: 'Scharnier gebrochen',
			description:
				'Das linke Scharnier ist ausgerissen, der Bildschirm lässt sich kaum noch schließen.',
			brand: 'Acer',
			model: 'Swift 3'
		}
	],
	konsole: [
		{
			title: 'Controller driftet nach links',
			description:
				'Der linke Stick bewegt die Figur von allein nach links. Kalibrieren hat nicht geholfen.',
			brand: 'Nintendo',
			model: 'Switch Joy-Con'
		},
		{
			title: 'Konsole liest keine Discs mehr',
			description:
				'Das Laufwerk dreht kurz an und gibt die Disc dann wieder aus. Digitale Spiele laufen normal.',
			brand: 'Sony',
			model: 'PlayStation 5'
		}
	],
	'audio-hifi': [
		{
			title: 'Verstärker brummt auf einem Kanal',
			description:
				'Alter Vollverstärker, auf dem rechten Kanal ist ein deutliches Brummen zu hören, auch ohne Quelle.',
			brand: 'Marantz',
			model: 'PM6006'
		},
		{
			title: 'Kopfhörer: rechte Seite tot',
			description: 'Bluetooth-Kopfhörer, rechts kommt kein Ton mehr. Mit Kabel das gleiche.',
			brand: 'Sony',
			model: 'WH-1000XM3'
		}
	],
	kamera: [
		{
			title: 'Objektiv fährt nicht mehr aus',
			description:
				'Kompaktkamera zeigt beim Einschalten „Objektivfehler“. Sie ist mir am Strand runtergefallen, eventuell Sand drin.',
			brand: 'Canon',
			model: 'PowerShot G7 X'
		}
	],
	'sonstige-elektronik': [
		{
			title: 'Lampe flackert',
			description:
				'Die Stehlampe flackert seit ein paar Tagen, mit neuen Leuchtmitteln auch. Wahrscheinlich ein Wackelkontakt im Schalter.'
		},
		{
			title: 'E-Reader Bildschirm hat Streifen',
			description: 'Über die halbe Seite ziehen sich graue Streifen, die nicht mehr weggehen.',
			brand: 'Kobo',
			model: 'Clara HD'
		}
	],
	fahrrad: [
		{
			title: 'Schaltung springt',
			description:
				'Die Kette springt bei den kleinen Ritzeln immer wieder. Schaltzug ist schon ein paar Jahre alt.',
			brand: 'Shimano',
			model: 'Deore'
		},
		{
			title: 'Hinterrad hat eine Acht',
			description:
				'Das Rad schleift bei jeder Umdrehung an der Bremse. Ein paar Speichen sind locker.'
		},
		{
			title: 'Scheibenbremse quietscht stark',
			description:
				'Vorderbremse quietscht laut und bremst schlechter als früher. Beläge vermutlich runter.'
		}
	],
	'e-bike-e-scooter': [
		{
			title: 'E-Scooter geht während der Fahrt aus',
			description:
				'Bei Unebenheiten schaltet sich der Scooter ab, danach lässt er sich wieder starten. Akku ist voll.',
			brand: 'Xiaomi',
			model: 'Pro 2'
		},
		{
			title: 'E-Bike Display zeigt Fehler 503',
			description:
				'Motor unterstützt nicht mehr, Display zeigt Fehler 503. Licht und Display funktionieren.',
			brand: 'Bosch',
			model: 'Performance Line'
		}
	],
	kuechengeraete: [
		{
			title: 'Mixer läuft, Messer dreht nicht',
			description: 'Motor brummt, aber das Messer bleibt stehen. Vermutlich die Kupplung.',
			brand: 'Bosch',
			model: 'MMB6141'
		},
		{
			title: 'Toaster heizt nicht mehr',
			description: 'Der Hebel rastet ein, aber die Heizdrähte werden nicht warm.'
		}
	],
	'waschmaschine-trockner': [
		{
			title: 'Waschmaschine pumpt nicht ab',
			description:
				'Am Ende des Programms steht Wasser in der Trommel. Flusensieb habe ich gereinigt.',
			brand: 'Bosch',
			model: 'Serie 6'
		},
		{
			title: 'Trockner wird nicht warm',
			description: 'Die Trommel dreht sich, aber die Wäsche bleibt nass und kalt.',
			brand: 'Siemens',
			model: 'iQ500'
		}
	],
	staubsauger: [
		{
			title: 'Akkusauger saugt kaum noch',
			description:
				'Die Saugleistung ist stark gesunken, Filter sind sauber. Zwischendurch geht er kurz aus.',
			brand: 'Dyson',
			model: 'V10'
		}
	],
	kaffeemaschine: [
		{
			title: 'Kaffeevollautomat zeigt „Brühgruppe blockiert“',
			description:
				'Nach dem Entkalken kommt diese Meldung, die Brühgruppe lässt sich nicht herausnehmen.',
			brand: 'De’Longhi',
			model: 'Magnifica S'
		},
		{
			title: 'Siebträger tropft am Rand',
			description:
				'Beim Bezug läuft Wasser seitlich am Siebträger vorbei. Dichtung ist wohl hart geworden.',
			brand: 'Gaggia',
			model: 'Classic'
		}
	],
	kleidung: [
		{
			title: 'Reißverschluss an der Winterjacke kaputt',
			description:
				'Der Schieber hat sich gelöst, die Zähne sind noch in Ordnung. Jacke ist sonst wie neu.'
		},
		{
			title: 'Jeans am Knie gerissen',
			description: 'Lieblingsjeans, Riss am linken Knie, ca. 6 cm. Gern unauffällig flicken.'
		}
	],
	schuhe: [
		{
			title: 'Sohle löst sich vorne',
			description: 'Bei beiden Wanderschuhen löst sich die Sohle an der Spitze.',
			brand: 'Meindl'
		},
		{
			title: 'Absatz abgebrochen',
			description: 'Ein Absatz ist auf Kopfsteinpflaster abgebrochen, ich habe ihn noch.'
		}
	],
	taschen: [
		{
			title: 'Henkel der Ledertasche ausgerissen',
			description: 'Ein Henkel ist an der Naht ausgerissen. Das Leder selbst ist noch gut.'
		}
	],
	'moebel-holz': [
		{
			title: 'Stuhlbein wackelt',
			description: 'Alter Holzstuhl, ein Bein ist locker und die Verleimung hat sich gelöst.'
		},
		{
			title: 'Kommode: Schublade klemmt',
			description:
				'Die unterste Schublade lässt sich nur mit Gewalt öffnen, die Führung ist ausgeleiert.'
		}
	],
	'schmuck-uhren': [
		{
			title: 'Armbanduhr bleibt stehen',
			description: 'Automatikuhr bleibt nach ein paar Stunden stehen, auch wenn ich sie trage.',
			brand: 'Seiko',
			model: 'SNK809'
		},
		{ title: 'Kette gerissen', description: 'Feine Silberkette ist am Verschluss gerissen.' }
	],
	spielzeug: [
		{
			title: 'Ferngesteuertes Auto fährt nicht mehr',
			description: 'Lenkung geht, aber der Antrieb reagiert nicht. Akku ist geladen.'
		}
	],
	musikinstrumente: [
		{
			title: 'Gitarre schnarrt im 5. Bund',
			description:
				'Akustikgitarre, Saiten schnarren ab dem 5. Bund. Halskrümmung vermutlich falsch.',
			brand: 'Yamaha',
			model: 'FG830'
		},
		{
			title: 'Keyboard: mehrere Tasten stumm',
			description: 'Drei Tasten in der Mitte geben keinen Ton mehr von sich.',
			brand: 'Casio'
		}
	],
	sonstiges: [
		{
			title: 'Regenschirm Mechanik kaputt',
			description: 'Automatikschirm öffnet nicht mehr, eine Strebe ist verbogen.'
		}
	]
};

export const QUOTE_MESSAGES = [
	'Das kann ich übernehmen. Ich habe das schon oft repariert und habe die Teile meistens da.',
	'Klingt nach einem typischen Fehler. Ich schaue es mir an und sage dir vorher Bescheid, falls es teurer wird.',
	'Kein Problem, das bekomme ich hin. Ersatzteil bestelle ich vorher, dauert ein paar Tage.',
	'Gern. Ich mache das nebenberuflich in meiner Werkstatt, gute Bewertungen findest du auf meinem Profil.'
];

// Large German cities, so test requests spread over the map.
export const TEST_PLZ = [
	'10115',
	'20095',
	'80331',
	'50667',
	'60311',
	'70173',
	'04109',
	'01067',
	'90402',
	'28195',
	'30159',
	'44135',
	'45127',
	'40210',
	'93047',
	'86150',
	'79098',
	'24103',
	'18055',
	'99084'
];

export const TEST_CUSTOMERS = [
	'Anna Bergmann',
	'Jonas Albrecht',
	'Mia Schulte',
	'Lukas Hartmann',
	'Lea Vogt',
	'Felix Brandt'
];
export const TEST_REPAIRERS = [
	'Werkstatt Krüger',
	'Tobias Neumann',
	'Repair-Café Sommer',
	'Elif Yıldız'
];
