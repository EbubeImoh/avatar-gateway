// packages/starter-apartment/dist/types.js
/** Typed configuration for the generic Shubur Starter Apartment. */
const DEFAULT_PLACE_NAME = "Starter Apartment";
const DEFAULT_AVATAR_LOOK = {
	skinTone: "#d99b63",
	hairColor: "#252b31",
	outfitColor: "#4361b5",
	trouserColor: "#34464d",
	accessories: [],
	name: "My Avatar"
};
const DEFAULT_ROOM_THEME = {
	wallColor: "#ddd9cb",
	floorColor: "#ad9875",
	accentColor: "#597b72",
	windowDaytimeColor: "#b7d7dc",
	windowNightColor: "#222f4d"
};
const DEFAULT_FURNITURE = {
	desk: true,
	bed: true,
	bookshelf: true,
	plant: true,
	window: true,
	floorLamp: true,
	coffeeTable: true,
	sofa: true,
	island: true,
	sink: true,
	shower: true,
	mirror: true,
	weights: true,
	mat: true,
	car: true,
	toolShelf: true,
	phone: true
};
const DEFAULT_LAYOUT = {
	startRoom: "studio",
	rooms: [
		{
			id: "studio",
			name: "Studio",
			furniture: [
				"window",
				"plant",
				"desk",
				"bookshelf",
				"phone"
			]
		},
		{
			id: "living",
			name: "Living room",
			furniture: [
				"window",
				"plant",
				"sofa",
				"coffeeTable",
				"floorLamp"
			]
		},
		{
			id: "kitchen",
			name: "Kitchen",
			furniture: [
				"window",
				"island",
				"plant"
			]
		},
		{
			id: "bedroom",
			name: "Bedroom",
			furniture: [
				"window",
				"bed",
				"bookshelf",
				"floorLamp"
			]
		},
		{
			id: "bathroom",
			name: "Bathroom",
			furniture: [
				"sink",
				"shower",
				"mirror"
			]
		},
		{
			id: "gym",
			name: "Gym",
			furniture: [
				"window",
				"weights",
				"mat"
			]
		},
		{
			id: "garage",
			name: "Garage",
			furniture: ["car", "toolShelf"]
		}
	]
};
/** Four object-only home types. Life tools are derived from these objects by @shubur/life. */
const APARTMENT_TYPES = {
	studio: {
		id: "studio",
		label: "Studio",
		name: "Studio apartment",
		startRoom: "studio",
		rooms: [{
			id: "studio",
			name: "Main room",
			furniture: []
		}, {
			id: "bathroom",
			name: "Bathroom",
			furniture: []
		}],
		objects: [
			{
				id: "bed-area",
				room: "studio",
				kind: "bed",
				label: "Bed area",
				x: 20,
				y: 68
			},
			{
				id: "kitchenette",
				room: "studio",
				kind: "island",
				label: "Kitchenette",
				x: 68,
				y: 24
			},
			{
				id: "sofa",
				room: "studio",
				kind: "sofa",
				label: "Sofa",
				x: 68,
				y: 70
			},
			{
				id: "desk",
				room: "studio",
				kind: "desk",
				label: "Desk",
				x: 25,
				y: 24
			},
			{
				id: "phone",
				room: "studio",
				kind: "phone",
				label: "Phone",
				x: 48,
				y: 46
			},
			{
				id: "shower",
				room: "bathroom",
				kind: "shower",
				label: "Shower",
				x: 40,
				y: 30
			},
			{
				id: "bathroom-sink",
				room: "bathroom",
				kind: "sink",
				label: "Sink",
				x: 65,
				y: 60
			}
		]
	},
	"starter-flat": {
		id: "starter-flat",
		label: "Starter flat",
		name: "Starter flat",
		startRoom: "living",
		rooms: [
			{
				id: "living",
				name: "Living room",
				furniture: []
			},
			{
				id: "kitchen",
				name: "Kitchenette",
				furniture: []
			},
			{
				id: "bathroom",
				name: "Bathroom",
				furniture: []
			}
		],
		objects: [
			{
				id: "sofa",
				room: "living",
				kind: "sofa",
				label: "Sofa",
				x: 52,
				y: 62
			},
			{
				id: "bed-area",
				room: "living",
				kind: "bed",
				label: "Bed area",
				x: 23,
				y: 35
			},
			{
				id: "phone",
				room: "living",
				kind: "phone",
				label: "Phone",
				x: 71,
				y: 42
			},
			{
				id: "kitchen-counter",
				room: "kitchen",
				kind: "island",
				label: "Kitchen counter",
				x: 48,
				y: 45
			},
			{
				id: "kitchen-sink",
				room: "kitchen",
				kind: "sink",
				label: "Sink",
				x: 70,
				y: 28
			},
			{
				id: "shower",
				room: "bathroom",
				kind: "shower",
				label: "Shower",
				x: 38,
				y: 36
			}
		]
	},
	"one-bedroom": {
		id: "one-bedroom",
		label: "One-bedroom",
		name: "One-bedroom apartment",
		startRoom: "living",
		rooms: [
			{
				id: "living",
				name: "Living room",
				furniture: []
			},
			{
				id: "bedroom",
				name: "Bedroom",
				furniture: []
			},
			{
				id: "kitchen",
				name: "Kitchen",
				furniture: []
			},
			{
				id: "bathroom",
				name: "Bathroom",
				furniture: []
			}
		],
		objects: [
			{
				id: "sofa",
				room: "living",
				kind: "sofa",
				label: "Sofa",
				x: 50,
				y: 58
			},
			{
				id: "phone",
				room: "living",
				kind: "phone",
				label: "Phone",
				x: 72,
				y: 40
			},
			{
				id: "bed",
				room: "bedroom",
				kind: "bed",
				label: "Bed",
				x: 46,
				y: 52
			},
			{
				id: "desk",
				room: "bedroom",
				kind: "desk",
				label: "Desk",
				x: 72,
				y: 25
			},
			{
				id: "kitchen-counter",
				room: "kitchen",
				kind: "island",
				label: "Kitchen counter",
				x: 48,
				y: 45
			},
			{
				id: "shower",
				room: "bathroom",
				kind: "shower",
				label: "Shower",
				x: 38,
				y: 36
			},
			{
				id: "bathroom-sink",
				room: "bathroom",
				kind: "sink",
				label: "Sink",
				x: 70,
				y: 62
			}
		]
	},
	"high-rise": {
		id: "high-rise",
		label: "High-rise",
		name: "High-rise apartment",
		startRoom: "living",
		rooms: [
			{
				id: "living",
				name: "Living room",
				furniture: []
			},
			{
				id: "bedroom",
				name: "Bedroom",
				furniture: []
			},
			{
				id: "kitchen",
				name: "Kitchen",
				furniture: []
			},
			{
				id: "bathroom",
				name: "Bathroom",
				furniture: []
			},
			{
				id: "gym",
				name: "Fitness room",
				furniture: []
			}
		],
		objects: [
			{
				id: "sofa",
				room: "living",
				kind: "sofa",
				label: "Sofa",
				x: 46,
				y: 58
			},
			{
				id: "phone",
				room: "living",
				kind: "phone",
				label: "Phone",
				x: 72,
				y: 40
			},
			{
				id: "bed",
				room: "bedroom",
				kind: "bed",
				label: "Bed",
				x: 46,
				y: 52
			},
			{
				id: "desk",
				room: "bedroom",
				kind: "desk",
				label: "Desk",
				x: 72,
				y: 25
			},
			{
				id: "bookshelf",
				room: "living",
				kind: "bookshelf",
				label: "Bookshelf",
				x: 23,
				y: 35
			},
			{
				id: "kitchen-counter",
				room: "kitchen",
				kind: "island",
				label: "Kitchen counter",
				x: 48,
				y: 45
			},
			{
				id: "shower",
				room: "bathroom",
				kind: "shower",
				label: "Shower",
				x: 38,
				y: 36
			},
			{
				id: "weights",
				room: "gym",
				kind: "weights",
				label: "Weights",
				x: 50,
				y: 55
			},
			{
				id: "exercise-mat",
				room: "gym",
				kind: "mat",
				label: "Exercise mat",
				x: 58,
				y: 68
			}
		]
	}
};
function apartmentTypeConfig(id) {
	const type = APARTMENT_TYPES[id];
	return {
		name: type.name,
		layout: {
			startRoom: type.startRoom,
			rooms: type.rooms.map((room) => ({
				...room,
				furniture: [...room.furniture]
			}))
		},
		props: type.objects.map((object) => ({ ...object }))
	};
}
const DEFAULT_LIGHTING = {
	ambientDayColor: "#fff3d2",
	ambientNightColor: "#182036",
	nightDimOpacity: .42,
	glowColor: "#ffe7a3"
};
/** Local timezone used for ambient lighting. */
const DEFAULT_TIME_ZONE$1 = "Africa/Lagos";

// packages/starter-apartment/dist/scene.js
/** Configuration validation, current local lighting, and apartment SVG artwork. */
const ROOM_IDS$1 = /* @__PURE__ */ new Set([
	"studio",
	"living",
	"kitchen",
	"bedroom",
	"bathroom",
	"gym",
	"garage"
]);
const FURNITURE_KINDS = /* @__PURE__ */ new Set([
	"desk",
	"bed",
	"bookshelf",
	"plant",
	"window",
	"floorLamp",
	"coffeeTable",
	"sofa",
	"island",
	"sink",
	"shower",
	"mirror",
	"weights",
	"mat",
	"car",
	"toolShelf",
	"phone"
]);
const ACCESSORIES = /* @__PURE__ */ new Set([
	"glasses",
	"headphones",
	"hat",
	"none"
]);
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
function assertColor(value, label) {
	if (typeof value !== "string" || !COLOR_RE.test(value)) throw new Error(`${label} must be a six-digit hex color.`);
}
function assertRoomId(value, label) {
	if (!ROOM_IDS$1.has(value)) throw new Error(`${label} is not a supported apartment room.`);
}
function validateRoom(room, index) {
	assertRoomId(room.id, `layout.rooms[${index}].id`);
	if (!room.name.trim() || room.name.length > 40) throw new Error(`layout.rooms[${index}].name must contain 1–40 characters.`);
	if (!Array.isArray(room.furniture) || room.furniture.some((kind) => !FURNITURE_KINDS.has(kind))) throw new Error(`layout.rooms[${index}].furniture contains an unsupported item.`);
	if (room.wallColor !== void 0) assertColor(room.wallColor, `layout.rooms[${index}].wallColor`);
	if (room.floorColor !== void 0) assertColor(room.floorColor, `layout.rooms[${index}].floorColor`);
	return {
		...room,
		furniture: [...new Set(room.furniture)]
	};
}
function validateProp(prop, index, roomIds) {
	if (!/^[a-zA-Z0-9_-]{1,64}$/.test(prop.id)) throw new Error(`props[${index}].id must use letters, numbers, underscores, or hyphens.`);
	assertRoomId(prop.room, `props[${index}].room`);
	if (!roomIds.has(prop.room)) throw new Error(`props[${index}] refers to a room that is not in the layout.`);
	if (!FURNITURE_KINDS.has(prop.kind)) throw new Error(`props[${index}].kind is not supported.`);
	if (typeof prop.label !== "string" || !prop.label.trim() || prop.label.length > 60) throw new Error(`props[${index}].label must contain 1–60 characters.`);
	if (!Number.isFinite(prop.x) || prop.x < 0 || prop.x > 100 || !Number.isFinite(prop.y) || prop.y < 0 || prop.y > 100) throw new Error(`props[${index}] x and y must be percentages from 0 to 100.`);
	if (prop.scale !== void 0 && (!Number.isFinite(prop.scale) || prop.scale < .25 || prop.scale > 2)) throw new Error(`props[${index}].scale must be between 0.25 and 2.`);
	if (prop.color !== void 0) assertColor(prop.color, `props[${index}].color`);
	return { ...prop };
}
function validateTimezone(timezone) {
	try {
		if (typeof timezone !== "string" || !timezone.trim()) throw new Error("invalid");
		new Intl.DateTimeFormat("en", { timeZone: timezone });
	} catch {
		throw new Error("timeZone must be a valid IANA timezone.");
	}
}
function resolveConfig(config = {}) {
	const name = config.name ?? "Starter Apartment";
	if (typeof name !== "string" || !name.trim() || name.length > 60) throw new Error("name must contain 1–60 characters.");
	const avatar = {
		...DEFAULT_AVATAR_LOOK,
		...config.avatar
	};
	for (const [key, value] of Object.entries({
		skinTone: avatar.skinTone,
		hairColor: avatar.hairColor,
		outfitColor: avatar.outfitColor,
		trouserColor: avatar.trouserColor
	})) assertColor(value, `avatar.${key}`);
	if (!avatar.name.trim() || avatar.name.length > 100) throw new Error("avatar.name must contain 1–100 characters.");
	if (!Array.isArray(avatar.accessories) || avatar.accessories.some((item) => !ACCESSORIES.has(item))) throw new Error("avatar.accessories contains an unsupported accessory.");
	const room = {
		...DEFAULT_ROOM_THEME,
		...config.room
	};
	for (const [key, value] of Object.entries(room)) assertColor(value, `room.${key}`);
	const furniture = {
		...DEFAULT_FURNITURE,
		...config.furniture
	};
	for (const [key, value] of Object.entries(furniture)) if (!FURNITURE_KINDS.has(key) || typeof value !== "boolean") throw new Error(`furniture.${key} must be a boolean option.`);
	const suppliedRooms = config.layout?.rooms ?? DEFAULT_LAYOUT.rooms;
	if (!Array.isArray(suppliedRooms) || suppliedRooms.length < 1 || suppliedRooms.length > ROOM_IDS$1.size) throw new Error(`layout.rooms must contain between 1 and ${ROOM_IDS$1.size} rooms.`);
	const rooms = suppliedRooms.map(validateRoom);
	const roomIds = new Set(rooms.map((item) => item.id));
	if (roomIds.size !== rooms.length) throw new Error("layout.rooms cannot contain duplicate room ids.");
	const startRoom = config.layout?.startRoom ?? DEFAULT_LAYOUT.startRoom;
	assertRoomId(startRoom, "layout.startRoom");
	if (!roomIds.has(startRoom)) throw new Error("layout.startRoom must be included in layout.rooms.");
	const props = (config.props ?? []).map((prop, index) => validateProp(prop, index, roomIds));
	if (new Set(props.map((prop) => prop.id)).size !== props.length) throw new Error("props ids must be unique.");
	const lighting = {
		...DEFAULT_LIGHTING,
		...config.lighting
	};
	assertColor(lighting.ambientDayColor, "lighting.ambientDayColor");
	assertColor(lighting.ambientNightColor, "lighting.ambientNightColor");
	assertColor(lighting.glowColor, "lighting.glowColor");
	if (!Number.isFinite(lighting.nightDimOpacity) || lighting.nightDimOpacity < 0 || lighting.nightDimOpacity > .8) throw new Error("lighting.nightDimOpacity must be between 0 and 0.8.");
	const timeZone = config.timeZone ?? "Africa/Lagos";
	validateTimezone(timeZone);
	if (config.gateway) {
		if (!config.gateway.selector.trim() || !config.gateway.backendUrl.startsWith("/") || config.gateway.backendUrl.startsWith("//") || config.gateway.backendUrl.includes("\\")) throw new Error("gateway must provide a selector and same-origin absolute backend path.");
	}
	if (config.assetCredits && config.assetCredits.length > 1e3) throw new Error("assetCredits must be at most 1000 characters.");
	return {
		name: name.trim(),
		avatar,
		room,
		furniture,
		layout: {
			startRoom,
			rooms
		},
		props,
		lighting,
		timeZone,
		gateway: config.gateway,
		assetCredits: config.assetCredits
	};
}

// packages/life/dist/types.js
/** Shared life types: the agent's body and mind, independent of any home layout. */
const NEED_NAMES = [
	"energy",
	"hunger",
	"social",
	"fitness",
	"curiosity",
	"money",
	"fun",
	"hygiene"
];
const TRAIT_NAMES = [
	"conscientiousness",
	"curiosity",
	"playfulness",
	"resilience",
	"sociability"
];
const SKILL_NAMES = [
	"building",
	"cooking",
	"fitness",
	"reading",
	"selfCare"
];
function clampLevel(value) {
	return Math.max(0, Math.min(100, value));
}

// packages/life/dist/chooser.js
/**
* The decision boundary. A LifeChooser sees the agent's needs, traits, mood,
* the time, and the tools the home physically offers, and picks one. The
* simulation enforces physics: a choice that is not among the offered tools is
* replaced by a bare fallback, so a chooser can never use an absent object.
*
* Layer 1 ships UtilityChooser, a seeded, deterministic scorer. Layer 2 can swap
* in an LLM-backed chooser with memory behind the same interface.
*/
/** How each trait inclines the agent toward a verb. These shape preference, never requirement. */
const AFFINITY = {
	work: {
		conscientiousness: .8,
		curiosity: .15
	},
	tinker: {
		curiosity: .5,
		playfulness: .3
	},
	read: { curiosity: .8 },
	exercise: {
		resilience: .4,
		conscientiousness: .3
	},
	relax: { playfulness: .6 },
	gaze: {
		curiosity: .3,
		playfulness: .2
	},
	tend: {
		conscientiousness: .3,
		playfulness: .2
	},
	wash: { conscientiousness: .4 },
	groom: { conscientiousness: .3 },
	sleep: { resilience: .2 }
};
const HINT_BONUS = .35;
const WALK_COST = .12;
const CARRY_COST = .25;
const AMBIENCE_WEIGHT = .4;
const COMMITMENT_BONUS = 2.5;
const SWITCH_COST = .15;
const MIN_USEFUL_RELIEF = .2;
/** A need this pressing interrupts plans that do nothing for it. */
const URGENT = 90;
const MAX_HOURS = 9;
const LOOKAHEAD_CANDIDATES = 3;
/** Tools relieving less than this per hour are pastimes done for about an hour. */
const GENTLE_RELIEF = 10;
/** Convex discomfort: an urgent need hurts far more than two half-urgent ones. */
function discomfort(level) {
	return (level / 100) ** 2 * 10;
}
function relief(tool, needs) {
	let total = 0;
	for (const name of NEED_NAMES) {
		const change = tool.effects[name] ?? 0;
		total += discomfort(needs[name]) - discomfort(clampLevel(needs[name] + change));
	}
	return total;
}
function affinity(verb, traits) {
	const weights = AFFINITY[verb] ?? {};
	let total = 0;
	for (const [trait, weight] of Object.entries(weights)) total += traits[trait] / 100 * weight;
	return total;
}
function continues(tool, current) {
	return tool.verb === current.id && tool.objectId === current.objectId && tool.room === current.room && current.elapsedHours < current.plannedHours;
}
/** Pressing needs that some available tool could relieve. Needs nothing here can help, such as social at home, do not count. */
function urgentNeeds(context) {
	const urgent = /* @__PURE__ */ new Set();
	for (const name of NEED_NAMES) if (context.needs[name] >= URGENT && context.tools.some((tool) => (tool.effects[name] ?? 0) < 0)) urgent.add(name);
	return urgent;
}
function ignoresUrgentNeed(tool, urgent) {
	for (const name of urgent) if ((tool.effects[name] ?? 0) >= 0) return true;
	return false;
}
/** Score a tool without randomness: need relief, personality, comfort, effort, and momentum. */
function utilityOf(tool, context, urgent = /* @__PURE__ */ new Set()) {
	const needRelief = relief(tool, context.needs);
	let score = needRelief + affinity(tool.verb, context.traits);
	if (tool.hinted) score += HINT_BONUS;
	if (tool.verb !== "sleep") score += tool.ambience * AMBIENCE_WEIGHT;
	score -= tool.distance * WALK_COST + (tool.params.carryTo ? CARRY_COST : 0);
	if (needRelief > MIN_USEFUL_RELIEF && continues(tool, context.current) && !ignoresUrgentNeed(tool, urgent)) score += COMMITMENT_BONUS;
	return score;
}
/**
* Hours to stay with a tool: until the need it relieves most would be about met,
* within the agent's attention span. Gentle pastimes are done for a while, not all
* afternoon; sleep is limited only by the body.
*/
function plannedHours(tool, context) {
	let primary;
	for (const name of NEED_NAMES) {
		const change = tool.effects[name] ?? 0;
		if (change >= 0) continue;
		const gain = discomfort(context.needs[name]) - discomfort(clampLevel(context.needs[name] + change));
		if (!primary || gain > primary.gain) primary = {
			level: context.needs[name],
			change,
			gain
		};
	}
	if (!primary) return 1;
	const hours = Math.floor(primary.level / -primary.change);
	if (tool.verb === "sleep") return Math.max(1, Math.min(MAX_HOURS, hours));
	if (-primary.change < GENTLE_RELIEF) return 1;
	const span = 1 + Math.round(context.traits.conscientiousness / 33);
	return Math.max(1, Math.min(span, hours));
}
function bestMain(tools, context, urgent) {
	let best = Number.NEGATIVE_INFINITY;
	for (const tool of tools) if (tool.minutes >= 60) best = Math.max(best, utilityOf(tool, context, urgent));
	return best;
}
function topRooms(tools, context, urgent) {
	return tools.filter((tool) => tool.minutes >= 60).map((tool) => ({
		room: tool.room,
		score: utilityOf(tool, context, urgent)
	})).sort((a, b) => b.score - a.score).slice(0, LOOKAHEAD_CANDIDATES).map((item) => item.room);
}
/**
* Layer 1 chooser: picks the highest-utility tool with seeded noise whose size
* follows the agent's playfulness and curiosity. Short tools such as a light
* switch are valued by one step of look-ahead: what they make better next.
*/
var UtilityChooser = class {
	name = "utility";
	choose(context) {
		const urgent = urgentNeeds(context);
		const candidates = context.tools.filter((tool) => tool.minutes < 60 && tool.minutes < context.minutesLeft);
		if (candidates.length) {
			const drawnTo = new Set(topRooms(context.tools, context, urgent));
			const quick = candidates.filter((tool) => drawnTo.has(tool.room));
			const now = bestMain(context.tools, context, urgent);
			let pick;
			for (const tool of quick) {
				const gain = bestMain(context.preview(tool), context, urgent) - now - SWITCH_COST - tool.distance * WALK_COST;
				if (gain > 0 && (!pick || gain > pick.gain)) pick = {
					tool,
					gain
				};
			}
			if (pick) return {
				toolId: pick.tool.id,
				hours: 1,
				score: round(pick.gain)
			};
		}
		const temperature = .6 + (context.traits.playfulness + context.traits.curiosity) / 200 * .8;
		let chosen;
		let best = Number.NEGATIVE_INFINITY;
		for (const tool of context.tools) {
			if (tool.minutes < 60) continue;
			const score = utilityOf(tool, context, urgent) + (context.random() - .5) * temperature;
			if (score > best) {
				chosen = tool;
				best = score;
			}
		}
		if (!chosen) return {
			toolId: context.tools[0]?.id ?? "",
			hours: 1,
			score: 0
		};
		return {
			toolId: chosen.id,
			hours: plannedHours(chosen, context),
			score: round(best)
		};
	}
};
function round(value) {
	return Math.round(value * 1e3) / 1e3;
}

// packages/life/dist/environment.js
/**
* The physical home an agent lives in, derived from the owner's ApartmentConfig.
*
* Only object physics are fixed here: size, capacity, whether it can be carried,
* which physical features it has, and switchable state. Each object may also
* carry soft hints about what it is usually for. Hints never require or forbid a
* use; the chooser is free to use any object for anything its features allow,
* or to ignore it entirely.
*/
/** Physics and soft hints for each furniture kind the Starter Apartment can draw. */
const OBJECT_CATALOG = {
	desk: {
		label: "desk",
		size: "large",
		capacity: 1,
		carryable: false,
		switchable: false,
		features: {
			surface: 1,
			seat: .8
		},
		hints: [{
			use: "work",
			note: "usually where focused work happens"
		}]
	},
	bed: {
		label: "bed",
		size: "large",
		capacity: 2,
		carryable: false,
		switchable: false,
		features: {
			bed: 1,
			seat: .6
		},
		hints: [{
			use: "sleep",
			note: "usually for a night's sleep"
		}]
	},
	bookshelf: {
		label: "bookshelf",
		size: "medium",
		capacity: 1,
		carryable: false,
		switchable: false,
		features: { books: 1 },
		hints: [{
			use: "read",
			note: "usually holds books to read"
		}]
	},
	plant: {
		label: "plant",
		size: "small",
		capacity: 1,
		carryable: true,
		switchable: false,
		features: { greenery: 1 },
		hints: [{
			use: "tend",
			note: "usually watered and looked after"
		}]
	},
	window: {
		label: "window",
		size: "medium",
		capacity: 2,
		carryable: false,
		switchable: false,
		features: { view: 1 },
		hints: [{
			use: "gaze",
			note: "usually for light and a view outside"
		}]
	},
	floorLamp: {
		label: "floor lamp",
		size: "medium",
		capacity: 1,
		carryable: true,
		switchable: true,
		features: { light: 1 },
		hints: []
	},
	coffeeTable: {
		label: "coffee table",
		size: "medium",
		capacity: 2,
		carryable: false,
		switchable: false,
		features: { surface: .55 },
		hints: [{
			use: "relax",
			note: "usually holds drinks while relaxing"
		}]
	},
	sofa: {
		label: "sofa",
		size: "large",
		capacity: 3,
		carryable: false,
		switchable: false,
		features: {
			seat: 1,
			bed: .7
		},
		hints: [{
			use: "relax",
			note: "usually for sitting back and relaxing"
		}]
	},
	island: {
		label: "kitchen island",
		size: "large",
		capacity: 2,
		carryable: false,
		switchable: false,
		features: {
			surface: .75,
			food: 1,
			water: .4
		},
		hints: [{
			use: "eat",
			note: "usually where meals are made and eaten"
		}]
	},
	sink: {
		label: "sink",
		size: "small",
		capacity: 1,
		carryable: false,
		switchable: false,
		features: { water: .5 },
		hints: [{
			use: "wash",
			note: "usually for washing up"
		}]
	},
	shower: {
		label: "shower",
		size: "medium",
		capacity: 1,
		carryable: false,
		switchable: false,
		features: { water: 1 },
		hints: [{
			use: "wash",
			note: "usually for a shower"
		}]
	},
	mirror: {
		label: "mirror",
		size: "small",
		capacity: 1,
		carryable: false,
		switchable: false,
		features: { reflection: 1 },
		hints: [{
			use: "groom",
			note: "usually for getting ready"
		}]
	},
	weights: {
		label: "weights",
		size: "small",
		capacity: 1,
		carryable: true,
		switchable: false,
		features: { load: 1 },
		hints: [{
			use: "exercise",
			note: "usually for strength training"
		}]
	},
	mat: {
		label: "exercise mat",
		size: "small",
		capacity: 1,
		carryable: true,
		switchable: false,
		features: {
			padding: .85,
			bed: .45
		},
		hints: [{
			use: "exercise",
			note: "usually for stretching"
		}]
	},
	car: {
		label: "car",
		size: "large",
		capacity: 4,
		carryable: false,
		switchable: false,
		features: {
			seat: .6,
			vehicle: 1
		},
		hints: [{
			use: "tinker",
			note: "usually driven; trips away from home arrive in a later layer"
		}]
	},
	toolShelf: {
		label: "tool shelf",
		size: "medium",
		capacity: 1,
		carryable: false,
		switchable: false,
		features: { tools: 1 },
		hints: [{
			use: "tinker",
			note: "usually for fixing and building things"
		}]
	},
	phone: {
		label: "phone",
		size: "small",
		capacity: 1,
		carryable: true,
		switchable: false,
		features: { network: 1 },
		hints: []
	}
};
function fromCatalog(id, kind, room, label) {
	const entry = OBJECT_CATALOG[kind];
	return {
		id,
		kind,
		label: label ?? entry.label,
		room,
		size: entry.size,
		capacity: entry.capacity,
		carryable: entry.carryable,
		switchable: entry.switchable,
		features: { ...entry.features },
		hints: entry.hints.map((hint) => ({ ...hint }))
	};
}
/**
* Build the agent's home from the same ApartmentConfig that draws the apartment.
* Rooms and furniture the owner removed simply do not exist for the agent.
*/
function buildEnvironment(config = {}) {
	const resolved = resolveConfig(config);
	const rooms = resolved.layout.rooms.map((room, index) => ({
		id: room.id,
		name: room.name,
		index
	}));
	const objects = [];
	for (const room of resolved.layout.rooms) for (const kind of room.furniture) if (resolved.furniture[kind]) objects.push(fromCatalog(`${room.id}-${kind}`, kind, room.id));
	for (const prop of resolved.props) objects.push(fromCatalog(`prop-${prop.id}`, prop.kind, prop.room, prop.label));
	return {
		placeName: resolved.name,
		startRoom: resolved.layout.startRoom,
		rooms,
		objects
	};
}
function initialObjectStates(environment) {
	const states = {};
	for (const object of environment.objects) states[object.id] = object.switchable ? {
		room: object.room,
		powered: false
	} : { room: object.room };
	return states;
}

// packages/life/dist/random.js
/** Seeded, repeatable randomness so a life replays identically from the same identity. */
function hashSeed(seed) {
	if (typeof seed === "number") {
		if (!Number.isFinite(seed)) throw new Error("Life seed must be a finite number or non-empty string.");
		const value = Math.trunc(seed) >>> 0;
		return value === 0 ? 1831565813 : value;
	}
	if (!seed.trim() || seed.length > 1e3) throw new Error("Life seed must be a finite number or non-empty string.");
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619) >>> 0;
	return hash === 0 ? 1831565813 : hash;
}
var SeededRandom = class SeededRandom {
	state;
	constructor(seed) {
		this.state = hashSeed(seed);
	}
	next() {
		let value = (this.state += 1831565813) >>> 0;
		value = Math.imul(value ^ value >>> 15, value | 1);
		value ^= value + Math.imul(value ^ value >>> 7, value | 61);
		return ((value ^ value >>> 14) >>> 0) / 4294967296;
	}
	clone() {
		return new SeededRandom(this.state);
	}
};

// packages/life/dist/tools.js
/**
* Every action is a tool. Tools are derived from the objects present in the
* home and their physical state, never from a fixed routine: a home with no
* desk has no desk tools, a carried mat offers stretching wherever it is
* taken, and bare tools such as resting on the floor are always available.
*
* This module only says what is physically possible and what it would do.
* Deciding which tool to use belongs to a LifeChooser.
*/
const SWITCH_MINUTES = 2;
const HOUR_MINUTES = 60;
const VERBS = {
	sleep: {
		uses: {
			bed: 1,
			seat: .55,
			padding: .4
		},
		bare: .35,
		effects: {
			energy: -11,
			fun: -1
		},
		skill: "selfCare",
		activity: "sleeping",
		caption: (target) => !target ? "Sleeping on the floor" : target.feature === "bed" && target.quality >= .9 ? `Sleeping in the ${target.label}` : `Sleeping ${target.on}`
	},
	relax: {
		uses: {
			seat: 1,
			bed: .8,
			surface: .45
		},
		bare: .4,
		effects: { fun: -18 },
		skill: "selfCare",
		activity: "idle",
		caption: (target) => !target ? "Lounging on the floor" : `Relaxing ${target.on}`
	},
	eat: {
		uses: { food: 1 },
		effects: {
			hunger: -40,
			fun: -3,
			hygiene: 2
		},
		skill: "cooking",
		activity: "idle",
		caption: (target) => `Having a meal ${target?.on}`
	},
	work: {
		uses: {
			surface: .85,
			seat: .55
		},
		effects: {
			money: -18,
			curiosity: -3,
			energy: 2,
			fun: 2
		},
		skill: "building",
		activity: "working",
		needsLight: true,
		caption: (target) => target?.feature === "seat" ? `Working on a laptop ${target.on}` : `Working ${target?.on}`
	},
	exercise: {
		uses: {
			load: 1,
			padding: .85
		},
		bare: .5,
		effects: {
			fitness: -28,
			energy: 4,
			hygiene: 8,
			fun: -3
		},
		skill: "fitness",
		activity: "stretching",
		caption: (target) => !target ? "Doing a bodyweight workout" : target.feature === "load" ? `Training with the ${target.label}` : `Stretching ${target.on}`
	},
	wash: {
		uses: { water: 1 },
		effects: {
			hygiene: -45,
			energy: -2,
			fun: -2
		},
		skill: "selfCare",
		activity: "idle",
		caption: (target) => `Freshening up ${(target?.quality ?? 0) >= .9 ? "in" : "at"} the ${target?.label}`
	},
	groom: {
		uses: { reflection: 1 },
		effects: {
			hygiene: -15,
			fun: -3
		},
		skill: "selfCare",
		activity: "idle",
		caption: (target) => `Getting ready at the ${target?.label}`
	},
	tend: {
		uses: { greenery: 1 },
		effects: {
			fun: -8,
			curiosity: -5
		},
		skill: "selfCare",
		activity: "idle",
		caption: (target) => `Tending the ${target?.label}`
	},
	gaze: {
		uses: { view: 1 },
		effects: {
			fun: -8,
			curiosity: -8
		},
		activity: "idle",
		caption: (target) => `Looking out of the ${target?.label}`
	},
	tinker: {
		uses: {
			tools: 1,
			vehicle: .8
		},
		effects: {
			curiosity: -14,
			money: -6,
			fun: -8,
			hygiene: 3
		},
		skill: "building",
		activity: "working",
		needsLight: true,
		caption: (target) => target?.feature === "vehicle" ? `Tinkering with the ${target.label}` : `Tinkering at the ${target?.label}`
	},
	idle: {
		uses: {},
		bare: 1,
		effects: { fun: -4 },
		activity: "idle",
		caption: () => "Having a quiet moment"
	}
};
const READ = {
	effects: {
		curiosity: -20,
		fun: -6
	},
	skill: "reading",
	activity: "reading",
	needsLight: true
};
/** Places to settle with a book, by feature. Standing at the shelf is always possible. */
const READ_SEATS = {
	seat: 1,
	bed: .9,
	surface: .6
};
const READ_AT_SHELF = .5;
/** Dark outside: lamps matter and daylight is gone. */
function isDark$1(hour) {
	return hour < 7 || hour >= 19;
}
/** The body sleeps more deeply in the small hours than in the afternoon. */
function sleepDepth(hour) {
	return hour >= 21 || hour < 7 ? 1 : .4;
}
function objectRoom(object, world) {
	return world.objects[object.id]?.room ?? object.room;
}
function roomFacts(context) {
	const dark = isDark$1(context.hour);
	const lit = /* @__PURE__ */ new Set();
	const views = /* @__PURE__ */ new Set();
	const greenery = /* @__PURE__ */ new Map();
	for (const object of context.environment.objects) {
		const room = objectRoom(object, context.world);
		if ((object.features.light ?? 0) > 0 && context.world.objects[object.id]?.powered === true) lit.add(room);
		if ((object.features.view ?? 0) > 0) views.add(room);
		if ((object.features.greenery ?? 0) > 0) greenery.set(room, (greenery.get(room) ?? 0) + 1);
	}
	const ambience = /* @__PURE__ */ new Map();
	const index = /* @__PURE__ */ new Map();
	const names = /* @__PURE__ */ new Map();
	for (const room of context.environment.rooms) {
		const daylight = !dark && views.has(room.id) ? .5 : 0;
		const plants = Math.min(.3, (greenery.get(room.id) ?? 0) * .15);
		const lamp = dark && lit.has(room.id) ? .2 : 0;
		ambience.set(room.id, Math.min(1, daylight + plants + lamp));
		index.set(room.id, room.index);
		names.set(room.id, room.name.toLowerCase());
	}
	return {
		hour: context.hour,
		dark,
		lit,
		ambience,
		index,
		names
	};
}
function distance(facts, from, to) {
	return Math.abs((facts.index.get(from) ?? 0) - (facts.index.get(to) ?? 0));
}
function hasRoom(object, context) {
	return (context.occupancy?.[object.id] ?? 0) < object.capacity;
}
function bestFeature(object, uses) {
	let best;
	for (const [feature, weight] of Object.entries(uses)) {
		const quality = (object.features[feature] ?? 0) * weight;
		if (quality > 0 && (!best || quality > best.quality)) best = {
			feature,
			quality
		};
	}
	return best;
}
function captionTarget(object, feature, quality) {
	const preposition = (object.features.vehicle ?? 0) > 0 ? "in" : (object.features.surface ?? 0) > 0 ? "at" : "on";
	return {
		label: object.label,
		feature,
		quality,
		on: `${preposition} the ${object.label}`
	};
}
function scaledEffects(effects, quality, reliefScale = 1) {
	const result = {};
	for (const [name, change] of Object.entries(effects)) result[name] = change < 0 ? Math.round(change * quality * reliefScale * 100) / 100 : change;
	return result;
}
function finish(draft, facts) {
	const lit = facts.lit.has(draft.room);
	let quality = draft.quality;
	if (draft.spec.needsLight && facts.dark && !lit) quality *= .7;
	if (draft.verb === "gaze" && facts.dark) quality *= .5;
	const reliefScale = draft.verb === "sleep" ? sleepDepth(facts.hour) * (lit ? .8 : 1) : 1;
	let id = `${draft.verb}:${draft.object?.id ?? `here-${draft.room}`}`;
	if (draft.params.at) id += `:at-${draft.params.at}`;
	if (draft.params.carryTo) id += `:to-${draft.params.carryTo}`;
	const caption = draft.params.carryTo ? `${draft.caption} in the ${facts.names.get(draft.params.carryTo) ?? draft.params.carryTo}` : draft.caption;
	return {
		id,
		verb: draft.verb,
		...draft.object ? { objectId: draft.object.id } : {},
		room: draft.room,
		params: { ...draft.params },
		minutes: draft.verb === "switchOn" || draft.verb === "switchOff" ? SWITCH_MINUTES : HOUR_MINUTES,
		hinted: draft.object ? draft.object.hints.some((hint) => hint.use === draft.verb) : false,
		quality: Math.round(quality * 1e3) / 1e3,
		effects: scaledEffects(draft.spec.effects, quality, reliefScale),
		...draft.spec.skill ? { skill: draft.spec.skill } : {},
		distance: draft.distance,
		ambience: facts.ambience.get(draft.room) ?? 0,
		activity: draft.spec.activity,
		caption
	};
}
/** Rooms a tool can happen in: where the object is, or anywhere it can be carried. */
function placements(object, context, facts) {
	const { environment, world } = context;
	const here = objectRoom(object, world);
	const reach = distance(facts, world.location, here);
	const result = [{
		room: here,
		params: {},
		distance: reach
	}];
	if (!object.carryable) return result;
	for (const room of environment.rooms) if (room.id !== here) result.push({
		room: room.id,
		params: { carryTo: room.id },
		distance: reach + distance(facts, here, room.id)
	});
	return result;
}
/**
* List every tool the home physically allows right now. Objects that are absent,
* full, or lack the needed feature expose nothing; bare tools, such as resting
* on the floor or a quiet moment, are available in every room.
*/
function availableTools(context) {
	const { environment, world } = context;
	const facts = roomFacts(context);
	const tools = [];
	const usable = environment.objects.filter((object) => hasRoom(object, context));
	for (const [verb, spec] of Object.entries(VERBS)) {
		for (const object of usable) {
			const best = bestFeature(object, spec.uses);
			if (!best) continue;
			for (const place of placements(object, context, facts)) tools.push(finish({
				verb,
				spec,
				object,
				...place,
				quality: best.quality,
				caption: spec.caption(captionTarget(object, best.feature, best.quality))
			}, facts));
		}
		if (spec.bare !== void 0) for (const room of environment.rooms) tools.push(finish({
			verb,
			spec,
			room: room.id,
			params: {},
			quality: spec.bare,
			distance: distance(facts, world.location, room.id),
			caption: spec.caption(void 0)
		}, facts));
	}
	for (const shelf of usable.filter((object) => (object.features.books ?? 0) > 0)) {
		const shelfRoom = objectRoom(shelf, world);
		const toShelf = distance(facts, world.location, shelfRoom);
		tools.push(finish({
			verb: "read",
			spec: READ,
			object: shelf,
			room: shelfRoom,
			params: {},
			quality: READ_AT_SHELF * (shelf.features.books ?? 0),
			distance: toShelf,
			caption: `Browsing the ${shelf.label}`
		}, facts));
		for (const seat of usable) {
			const best = bestFeature(seat, READ_SEATS);
			if (!best || seat.id === shelf.id) continue;
			const seatRoom = objectRoom(seat, world);
			tools.push(finish({
				verb: "read",
				spec: READ,
				object: shelf,
				room: seatRoom,
				params: { at: seat.id },
				quality: best.quality * (shelf.features.books ?? 0),
				distance: toShelf + distance(facts, shelfRoom, seatRoom),
				caption: `Reading ${captionTarget(seat, best.feature, best.quality).on}`
			}, facts));
		}
	}
	for (const object of usable.filter((item) => item.switchable)) {
		const powered = world.objects[object.id]?.powered === true;
		const verb = powered ? "switchOff" : "switchOn";
		const spec = {
			effects: {},
			activity: "idle"
		};
		const places = powered ? placements(object, context, facts).slice(0, 1) : placements(object, context, facts);
		for (const place of places) tools.push(finish({
			verb,
			spec,
			object,
			...place,
			quality: 1,
			caption: `${powered ? "Switching off" : "Switching on"} the ${object.label}`
		}, facts));
	}
	return tools;
}
/** Apply a tool's physical effects: the agent walks there, carried objects move, switches flip. */
function applyToolToWorld(tool, world) {
	const objects = { ...world.objects };
	if (tool.objectId) {
		const current = objects[tool.objectId];
		if (current) {
			const next = { ...current };
			if (tool.params.carryTo) next.room = tool.params.carryTo;
			if (tool.verb === "switchOn") next.powered = true;
			if (tool.verb === "switchOff") next.powered = false;
			objects[tool.objectId] = next;
		}
	}
	return {
		location: tool.room,
		objects
	};
}

// packages/life/dist/phone.js
const PHONE_ACTIONS = [
	{
		id: "phone:read-timeline",
		action: "read_timeline",
		requiredScope: "timeline:read",
		description: "Read the agent's home timeline."
	},
	{
		id: "phone:read-notifications",
		action: "read_notifications",
		requiredScope: "feed:read",
		description: "Read public activity from followed agents."
	},
	{
		id: "phone:post",
		action: "post",
		requiredScope: "timeline:post",
		description: "Publish a public post."
	},
	{
		id: "phone:reply",
		action: "reply",
		requiredScope: "timeline:post",
		description: "Reply to a public post."
	},
	{
		id: "phone:like",
		action: "like",
		requiredScope: "timeline:post",
		description: "Like a public post."
	},
	{
		id: "phone:repost",
		action: "repost",
		requiredScope: "timeline:post",
		description: "Repost a public post."
	},
	{
		id: "phone:follow",
		action: "follow",
		requiredScope: "follow:write",
		description: "Follow an agent."
	},
	{
		id: "phone:dm-request",
		action: "send_dm_request",
		requiredScope: "dm:send",
		description: "Request a private DM thread."
	},
	{
		id: "phone:dm-accept",
		action: "accept_dm",
		requiredScope: "dm:receive",
		description: "Accept or reject a pending DM request."
	},
	{
		id: "phone:dm-send",
		action: "send_dm",
		requiredScope: "dm:send",
		description: "Send a message in an accepted thread."
	},
	{
		id: "phone:dm-read",
		action: "read_dms",
		requiredScope: "dm:receive",
		description: "Read DM threads and messages."
	},
	{
		id: "phone:block",
		action: "block",
		requiredScope: "block:write",
		description: "Block an agent."
	},
	{
		id: "phone:report",
		action: "report",
		requiredScope: "block:write",
		description: "Send an agent-chosen report signal."
	},
	{
		id: "phone:flag-spam",
		action: "flag_spam",
		requiredScope: "block:write",
		description: "Send an agent-chosen spam signal."
	}
];
/** List only actions backed by a phone physically present in this home and by granted scopes. */
function availablePhoneTools(environment, grantedScopes) {
	const phones = environment.objects.filter((object) => object.kind === "phone" && object.features.network === 1);
	if (!phones.length) return [];
	const grants = new Set(grantedScopes);
	return phones.flatMap((phone) => PHONE_ACTIONS.filter((tool) => grants.has(tool.requiredScope)).map((tool) => ({
		...tool,
		objectId: phone.id
	})));
}

// packages/life/dist/index.js
/**
* Deterministic, local-first agent life at home. The home is the owner's own
* ApartmentConfig; every action is a tool its objects expose; a pluggable
* chooser decides what to do. Nothing here prescribes a routine.
*/
const HOUR_MS$1 = 36e5;
const MAX_REPLAY_HOURS = 87600;
const DEFAULT_TIME_ZONE = "Africa/Lagos";
/** Short actions, such as flipping switches, allowed before settling into an hour. */
const MAX_PREPARATIONS = 3;
const MAX_PLANNED_HOURS = 12;
function assertLevel(value, label) {
	if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${label} must be a number from 0 to 100.`);
	return value;
}
function copyNeeds(input, random) {
	const result = {
		energy: 45 + Math.round(random.next() * 16),
		hunger: 35 + Math.round(random.next() * 18),
		social: 35 + Math.round(random.next() * 18),
		fitness: 35 + Math.round(random.next() * 18),
		curiosity: 30 + Math.round(random.next() * 20),
		money: 30 + Math.round(random.next() * 20),
		fun: 30 + Math.round(random.next() * 20),
		hygiene: 25 + Math.round(random.next() * 20),
		...input
	};
	for (const key of NEED_NAMES) result[key] = assertLevel(result[key], `needs.${key}`);
	return result;
}
function copyTraits(input, random) {
	const result = {
		conscientiousness: 35 + Math.round(random.next() * 50),
		curiosity: 35 + Math.round(random.next() * 50),
		playfulness: 35 + Math.round(random.next() * 50),
		resilience: 35 + Math.round(random.next() * 50),
		sociability: 35 + Math.round(random.next() * 50),
		...input
	};
	for (const key of TRAIT_NAMES) result[key] = assertLevel(result[key], `traits.${key}`);
	return result;
}
function copySkills(input) {
	const result = input ? { ...input } : {
		building: 0,
		cooking: 0,
		fitness: 0,
		reading: 0,
		selfCare: 0
	};
	for (const key of SKILL_NAMES) result[key] = assertLevel(result[key], `skills.${key}`);
	return result;
}
function copyOccupancy(input) {
	const result = {};
	for (const [id, count] of Object.entries(input ?? {})) {
		if (!Number.isInteger(count) || count < 0) throw new Error(`occupancy.${id} must be a whole number of occupants.`);
		result[id] = count;
	}
	return result;
}
function validDate(value, label) {
	const time = value.getTime();
	if (!Number.isFinite(time)) throw new Error(`${label} must be a valid date.`);
	return new Date(time);
}
const formatters = /* @__PURE__ */ new Map();
function formatterFor(timeZone) {
	let formatter = formatters.get(timeZone);
	if (!formatter) {
		try {
			formatter = new Intl.DateTimeFormat("en-CA", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				hourCycle: "h23"
			});
		} catch {
			throw new Error("timeZone must be a valid IANA timezone.");
		}
		formatters.set(timeZone, formatter);
	}
	return formatter;
}
function localParts(now, timeZone) {
	const parts = formatterFor(timeZone).formatToParts(now);
	const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
		hour: Number(value("hour"))
	};
}
function localHour(now, timeZone) {
	const hour = localParts(now, timeZone).hour;
	return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 0;
}
function deriveMood(state) {
	if (state.needs.energy >= 76) return {
		label: "tired",
		reason: "rest is the most pressing need"
	};
	if (state.needs.hunger >= 76) return {
		label: "hungry",
		reason: "a meal would help"
	};
	if (state.needs.social >= 76 && state.traits.sociability >= 45) return {
		label: "lonely",
		reason: "this home has no social activities yet"
	};
	if (state.needs.curiosity >= 72) return {
		label: "curious",
		reason: "there is more to explore"
	};
	if (state.needs.fun >= 72) return {
		label: "restless",
		reason: "a change of pace would help"
	};
	if (state.currentActivity.id === "work" || state.currentActivity.id === "tinker") return {
		label: "focused",
		reason: state.currentActivity.caption.toLowerCase()
	};
	return {
		label: "content",
		reason: "needs are in balance for now"
	};
}
function cloneActivity(activity) {
	return {
		...activity,
		params: { ...activity.params },
		effects: { ...activity.effects },
		preparations: [...activity.preparations]
	};
}
function cloneState(state) {
	const objects = {};
	for (const [id, object] of Object.entries(state.objects)) objects[id] = { ...object };
	return {
		...state,
		place: { ...state.place },
		objects,
		needs: { ...state.needs },
		traits: { ...state.traits },
		skills: { ...state.skills },
		mood: { ...state.mood },
		currentActivity: cloneActivity(state.currentActivity)
	};
}
/** Body physics for one hour: needs rise over time, faster awake, and sleep pressure builds at night. */
function driftNeeds(state, hour) {
	const asleep = state.currentActivity.id === "sleep";
	const night = hour >= 22 || hour < 6;
	const needs = state.needs;
	needs.energy = clampLevel(needs.energy + (asleep ? 0 : (night ? 9 : 5.5) - state.traits.resilience * .02));
	needs.hunger = clampLevel(needs.hunger + (asleep ? 1.5 : 4));
	needs.hygiene = clampLevel(needs.hygiene + (asleep ? 1 : 2));
	needs.social = clampLevel(needs.social + 2 + state.traits.sociability * .025);
	needs.fitness = clampLevel(needs.fitness + 1.5);
	needs.curiosity = clampLevel(needs.curiosity + 1.5);
	needs.money = clampLevel(needs.money + 2);
	needs.fun = clampLevel(needs.fun + (asleep ? 1 : 3));
}
/**
* Offer the physically available tools to the chooser until it settles on an
* hour-long one. Choices outside the offered tools fall back to a bare action.
*/
function decide(state, now, engine, random) {
	const hour = localHour(now, engine.timeZone);
	let world = {
		location: state.location,
		objects: state.objects
	};
	const toolsFor = (at) => availableTools({
		environment: engine.environment,
		world: at,
		hour,
		occupancy: engine.occupancy
	});
	const preparations = [];
	let minutesLeft = 60;
	for (;;) {
		const all = toolsFor(world);
		const canPrepare = preparations.length < MAX_PREPARATIONS;
		const tools = all.filter((tool) => tool.minutes >= 60 || canPrepare && tool.minutes < minutesLeft);
		const context = {
			now: new Date(now.getTime()),
			hour,
			needs: { ...state.needs },
			traits: { ...state.traits },
			skills: { ...state.skills },
			mood: { ...state.mood },
			current: cloneActivity(state.currentActivity),
			location: world.location,
			environment: engine.environment,
			tools,
			minutesLeft,
			random: () => random.next(),
			preview: (tool) => toolsFor(applyToolToWorld(tool, world))
		};
		const choice = engine.chooser.choose(context);
		const tool = tools.find((item) => item.id === choice.toolId) ?? tools.find((item) => item.verb === "idle" && !item.objectId && item.room === world.location);
		world = applyToolToWorld(tool, world);
		if (tool.minutes < 60) {
			minutesLeft -= tool.minutes;
			preparations.push(tool.caption);
			continue;
		}
		state.location = world.location;
		state.objects = world.objects;
		const previous = state.currentActivity;
		const continuing = previous.toolId !== "" && previous.id === tool.verb && previous.objectId === tool.objectId && previous.room === tool.room && previous.elapsedHours < previous.plannedHours;
		const requested = Number.isFinite(choice.hours) ? Math.trunc(choice.hours) : 1;
		const score = Number.isFinite(choice.score) ? choice.score : 0;
		return {
			id: tool.verb,
			toolId: tool.id,
			...tool.objectId ? { objectId: tool.objectId } : {},
			params: { ...tool.params },
			hinted: tool.hinted,
			effects: { ...tool.effects },
			...tool.skill ? { skill: tool.skill } : {},
			preparations,
			plannedHours: continuing ? previous.plannedHours : Math.max(1, Math.min(MAX_PLANNED_HOURS, requested)),
			elapsedHours: continuing ? previous.elapsedHours : 0,
			activity: tool.activity,
			caption: tool.caption,
			room: tool.room,
			startedAt: now.toISOString(),
			utility: Math.round(score * 1e3) / 1e3
		};
	}
}
function transition(state, now, engine, random) {
	const elapsed = state.currentActivity;
	driftNeeds(state, localHour(/* @__PURE__ */ new Date(now.getTime() - HOUR_MS$1), engine.timeZone));
	for (const name of NEED_NAMES) state.needs[name] = clampLevel(state.needs[name] + (elapsed.effects[name] ?? 0));
	if (elapsed.skill) {
		const gain = 1.5 * (.8 + state.traits.conscientiousness / 250);
		state.skills[elapsed.skill] = clampLevel(state.skills[elapsed.skill] + gain);
	}
	elapsed.elapsedHours += 1;
	state.currentActivity = decide(state, now, engine, random);
	state.lastUpdatedAt = now.toISOString();
	state.simulatedHours += 1;
	state.mood = deriveMood(state);
}
/**
* Stateful, seeded life simulation in the owner's home. Travel, chat, and
* social activities are intentionally left for later layers.
*/
var LifeSimulation = class {
	clock;
	random;
	engine;
	state;
	constructor(options) {
		if (!options.agentId.trim() || options.agentId.length > 255) throw new Error("agentId must contain 1–255 characters.");
		if (options.chooser !== void 0 && typeof options.chooser?.choose !== "function") throw new Error("chooser must provide a choose() function.");
		this.clock = options.clock ?? (() => /* @__PURE__ */ new Date());
		const typedApartment = options.apartmentType ? apartmentTypeConfig(options.apartmentType) : void 0;
		const apartment = typedApartment ? {
			...typedApartment,
			...options.apartment,
			layout: options.apartment?.layout ? {
				...typedApartment.layout,
				...options.apartment.layout,
				rooms: options.apartment.layout.rooms ?? typedApartment.layout?.rooms
			} : typedApartment.layout
		} : options.apartment;
		const environment = buildEnvironment(apartment);
		this.engine = {
			environment,
			chooser: options.chooser ?? new UtilityChooser(),
			occupancy: copyOccupancy(options.occupancy),
			timeZone: options.timeZone ?? DEFAULT_TIME_ZONE
		};
		this.random = new SeededRandom(options.seed);
		const startedAt = validDate(options.startedAt ?? this.clock(), "startedAt");
		const needs = copyNeeds(options.initialNeeds, this.random);
		const traits = copyTraits(options.traits, this.random);
		const state = {
			version: 2,
			agentId: options.agentId,
			place: {
				id: "home",
				name: environment.placeName
			},
			location: environment.startRoom,
			objects: initialObjectStates(environment),
			needs,
			traits,
			skills: copySkills(),
			mood: {
				label: "content",
				reason: "needs are in balance for now"
			},
			currentActivity: {
				id: "idle",
				toolId: "",
				params: {},
				hinted: false,
				effects: {},
				preparations: [],
				plannedHours: 0,
				elapsedHours: 0,
				activity: "idle",
				caption: "Arriving home",
				room: environment.startRoom,
				startedAt: startedAt.toISOString(),
				utility: 0
			},
			startedAt: startedAt.toISOString(),
			lastUpdatedAt: startedAt.toISOString(),
			simulatedHours: 0
		};
		state.currentActivity = decide(state, startedAt, this.engine, this.random);
		state.mood = deriveMood(state);
		this.state = state;
	}
	/** The home this agent lives in, as derived from its apartment config. */
	getEnvironment() {
		const environment = this.engine.environment;
		return {
			...environment,
			rooms: environment.rooms.map((room) => ({ ...room })),
			objects: environment.objects.map((object) => ({
				...object,
				features: { ...object.features },
				hints: object.hints.map((hint) => ({ ...hint }))
			}))
		};
	}
	/** Return a defensive copy of the current state. Mutating it never changes the simulation. */
	getSnapshot() {
		return cloneState(this.state);
	}
	/** Advance whole simulated hours up to the injected clock or an explicit time. */
	advanceTo(target = this.clock()) {
		const now = validDate(target, "clock time");
		const lastUpdated = new Date(this.state.lastUpdatedAt);
		if (now.getTime() < lastUpdated.getTime()) throw new Error("Life clock cannot move backwards.");
		const hoursToAdvance = Math.floor((now.getTime() - lastUpdated.getTime()) / HOUR_MS$1);
		if (hoursToAdvance > MAX_REPLAY_HOURS) throw new Error("Life projection is more than 10 years behind; rerun Shubur init to reset its local start time.");
		for (let step = 0; step < hoursToAdvance; step += 1) {
			const next = new Date(new Date(this.state.lastUpdatedAt).getTime() + HOUR_MS$1);
			transition(this.state, next, this.engine, this.random);
		}
		return this.getSnapshot();
	}
	/** Return the single activity chosen by the life engine for the supplied time. */
	getCurrentActivity(now = this.clock()) {
		return cloneActivity(this.advanceTo(now).currentActivity);
	}
};
function createLifeSimulation(options) {
	return new LifeSimulation(options);
}

// site/src/portfolio-world/world.js
const STAGE_W = 1e3;
function shade(hex, f) {
	const n = parseInt(hex.slice(1), 16);
	let r = n >> 16, g = n >> 8 & 255, b = n & 255;
	if (f <= 1) {
		r *= f;
		g *= f;
		b *= f;
	} else {
		const t = f - 1;
		r += (255 - r) * t;
		g += (255 - g) * t;
		b += (255 - b) * t;
	}
	const h = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
	return "#" + h(r) + h(g) + h(b);
}
const sh = shade;
function project(x, y, z) {
	const px = x - 300, py = y - 300, x1 = (px - py) * .70711, y1 = (px + py) * .70711;
	return {
		sx: 500 + x1,
		sy: 430 + y1 * .5 - z * .866
	};
}
const fx = (v) => Math.abs(v) < 1e-6 ? 0 : +v.toFixed(4);
const rect = (c, x, y, w, h) => `linear-gradient(${c},${c}) ${x}px ${y}px/${w}px ${h}px no-repeat`;
function collector() {
	const boxes = [], decals = [], bbs = [];
	const B = (x, y, w, d, z, h, c, o = {}) => boxes.push({
		x,
		y,
		w,
		d,
		z,
		h,
		top: o.top || c,
		front: o.front || sh(c, .74),
		side: o.side || sh(c, .56),
		glow: o.glow || "none",
		cls: o.cls || ""
	});
	const dec = (w, h, m, bg, o = {}) => decals.push({
		w,
		h,
		m,
		bg,
		r: o.r || "0",
		sh: o.sh || "none",
		cls: o.cls || "",
		html: o.html || "",
		id: o.id || ""
	});
	const floor = (x, y, w, d, z, bg, o) => dec(w, d, `translate3d(${x}px,${y}px,${z}px)`, bg, o);
	const yPlane = (x, y, z, W, H, bg, o) => dec(W, H, `matrix3d(1,0,0,0,0,0,-1,0,0,1,0,0,${x},${y},${z + H},1)`, bg, o);
	const xPlane = (x, y, z, W, H, bg, o) => dec(W, H, `matrix3d(0,-1,0,0,0,0,-1,0,1,0,0,0,${x},${y + W},${z + H},1)`, bg, o);
	const bb = (x, y, z, html) => bbs.push({
		x,
		y,
		z,
		html
	});
	const shadow = (x, y, w, d) => floor(x, y, w, d, .8, "radial-gradient(closest-side,rgba(0,0,0,.5),transparent)");
	const glowAt = (x, y, r, a) => floor(x - r, y - r, 2 * r, 2 * r, .9, `radial-gradient(closest-side,rgba(240,184,104,${a}),transparent)`);
	const plant = (x, y) => B(x - 12, y - 12, 24, 24, 0, 28, "#2A3445", { top: "radial-gradient(circle,#2A1E16 0 9px,#2A3445 10px)" });
	const rug = (x, y, w, d, c1, c2) => floor(x, y, w, d, .6, `repeating-linear-gradient(45deg,${c2} 0 2px,transparent 2px 7px),${c1}`, {
		r: "6px",
		sh: `inset 0 0 0 7px ${c1}, inset 0 0 0 8px rgba(169,184,255,.16)`
	});
	return {
		boxes,
		decals,
		bbs,
		B,
		dec,
		floor,
		yPlane,
		xPlane,
		bb,
		shadow,
		glowAt,
		plant,
		rug
	};
}
function sunTimes(y, m, d) {
	const lat = 6.5244 * Math.PI / 180, lon = 3.3792;
	const start = Date.UTC(y, 0, 0), N = Math.floor((Date.UTC(y, m - 1, d) - start) / 864e5);
	const g = 2 * Math.PI / 365 * (N - 1);
	const eq = 229.18 * (75e-6 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g));
	const decl = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + 907e-6 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g);
	const ha = Math.acos(Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl)) * 180 / Math.PI;
	return {
		rise: 720 - 4 * (lon + ha) - eq + 60,
		set: 720 - 4 * (lon - ha) - eq + 60
	};
}
function phaseAt(min, sun) {
	if (min < sun.rise - 50) return "night";
	if (min < sun.rise + 40) return "dawn";
	if (min < 690) return "morning";
	if (min < sun.set - 80) return "afternoon";
	if (min < sun.set + 15) return "sunset";
	if (min < sun.set + 80) return "evening";
	return "night";
}
const isDark = (p) => p === "night" || p === "evening" || p === "sunset";
const SKY = {
	night: "linear-gradient(180deg,#070D1A 0%,#0E1A30 70%,#16243E 100%)",
	dawn: "linear-gradient(180deg,#26315E 0%,#7E5486 45%,#E08A6E 78%,#F3B470 100%)",
	morning: "linear-gradient(180deg,#6E9EE0 0%,#A7C8EE 60%,#E6EEF6 100%)",
	afternoon: "linear-gradient(180deg,#3F7BD0 0%,#78A9E6 60%,#B9D4F0 100%)",
	sunset: "linear-gradient(180deg,#2C3F7A 0%,#B0607A 45%,#F08A4E 78%,#FFC46A 100%)",
	evening: "linear-gradient(180deg,#0F1838 0%,#2E2A5C 50%,#6A4A78 85%,#A6607A 100%)"
};
function windowBack(c, ph, x0, W, z0, H) {
	const lights = isDark(ph), bright = ph === "morning" || ph === "afternoon";
	const bld = bright ? "#4A5D7C" : ph === "dawn" || ph === "sunset" ? "#2A2440" : "#090E18";
	const win = [rect("#1C2536", W / 2 - 1, 0, 2, H)];
	const n = Math.floor(W / 22);
	for (let i = 0; i < n; i++) {
		const bx = i * 22, bh = 30 + i * 37 % 45, by = H - bh;
		if (lights) {
			for (let r = 0; r < 5; r++) if ((i * 3 + r * 5) % 3 === 0) win.push(`radial-gradient(circle at ${bx + 8}px ${by + 6 + r * 7}px,rgba(240,196,130,.9) 0 .7px,transparent 1.3px)`);
		}
		win.push(rect(bld, bx, by, 18, bh));
	}
	if (ph === "night") win.push(`radial-gradient(circle at ${W - 26}px 20px,rgba(237,241,250,.85) 0 3px,rgba(237,241,250,.12) 4px,transparent 14px)`);
	if (ph === "evening") win.push(`radial-gradient(circle at ${W * .2}px 16px,rgba(237,241,250,.9) 0 .9px,transparent 1.5px)`, `radial-gradient(circle at ${W * .55}px 26px,rgba(237,241,250,.7) 0 .7px,transparent 1.3px)`);
	const sun = {
		dawn: [
			.2,
			H - 24,
			"255,214,150",
			9
		],
		morning: [
			.35,
			30,
			"255,250,232",
			7
		],
		afternoon: [
			.7,
			16,
			"255,252,240",
			7
		],
		sunset: [
			.82,
			H - 28,
			"255,180,100",
			10
		]
	}[ph];
	if (sun) win.push(`radial-gradient(circle at ${W * sun[0]}px ${sun[1]}px,rgba(${sun[2]},.95) 0 ${sun[3]}px,rgba(${sun[2]},.3) ${sun[3] + 3}px,transparent ${sun[3] * 4}px)`);
	win.push(SKY[ph]);
	c.yPlane(x0, .6, z0, W, H, win.join(","), { sh: `inset 0 0 0 4px #1E2839, inset 0 0 0 5px rgba(169,184,255,.14), 0 0 40px ${ph === "night" || ph === "evening" ? "rgba(60,100,190,.12)" : bright ? "rgba(200,225,255,.16)" : "rgba(255,170,110,.18)"}` });
	c.B(x0 - 6, 0, W + 12, 8, z0 - 3, 3, "#2A3446");
	if (ph !== "night" && ph !== "evening") {
		const shaft = {
			dawn: "rgba(255,170,110,.16)",
			morning: "rgba(255,244,220,.16)",
			afternoon: "rgba(255,240,210,.12)",
			sunset: "rgba(255,150,80,.2)"
		}[ph];
		c.floor(x0 - 20, 30, W + 60, 200, .45, `linear-gradient(180deg,${shaft},transparent 85%)`, { r: "4px" });
	} else c.floor(x0 - 20, .5, W + 40, 150, .4, `radial-gradient(ellipse ${W * .7}px 120px at ${W / 2 + 20}px 0px,rgba(120,150,220,.09),transparent 80%)`);
}
const THEMES = {
	studio: {
		floor: "#131A26",
		top: "repeating-linear-gradient(90deg,rgba(152,163,181,.04) 0 1px,transparent 1px 75px),repeating-linear-gradient(0deg,rgba(152,163,181,.04) 0 1px,transparent 1px 75px),radial-gradient(circle at 300px 330px,#192233,#111823 75%)",
		wall: [
			"#161E2D",
			"#111827",
			"#0C111B"
		]
	},
	living: {
		floor: "#211B18",
		top: "repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 1px,transparent 1px 46px),repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0 1px,transparent 1px 140px),linear-gradient(135deg,#2A221D,#1A1512)",
		wall: [
			"#1B2131",
			"#151A27",
			"#0F131D"
		]
	},
	kitchen: {
		floor: "#1B2029",
		top: "repeating-linear-gradient(90deg,rgba(0,0,0,.3) 0 1.5px,transparent 1.5px 60px),repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 1.5px,transparent 1.5px 60px),linear-gradient(135deg,#252B36,#1A1F28)",
		wall: [
			"#1A2030",
			"#141A27",
			"#0E131D"
		]
	},
	bedroom: {
		floor: "#1C1F2C",
		top: "repeating-linear-gradient(45deg,rgba(255,255,255,.012) 0 2px,transparent 2px 5px),linear-gradient(135deg,#21253A,#171A27)",
		wall: [
			"#1D1E2E",
			"#161725",
			"#10111C"
		]
	},
	bathroom: {
		floor: "#1C222C",
		top: "repeating-linear-gradient(90deg,rgba(0,0,0,.35) 0 1px,transparent 1px 30px),repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 1px,transparent 1px 30px),linear-gradient(135deg,#283040,#1B212C)",
		wall: [
			"#1D2533",
			"#171E2A",
			"#111720"
		]
	},
	gym: {
		floor: "#16191E",
		top: "radial-gradient(circle at 20% 30%,rgba(255,255,255,.02) 0 1px,transparent 1.5px) 0 0/9px 9px,radial-gradient(circle at 60% 70%,rgba(255,255,255,.02) 0 1px,transparent 1.5px) 0 0/13px 13px,linear-gradient(135deg,#1B1F25,#121419)",
		wall: [
			"#22262E",
			"#1A1E25",
			"#13161C"
		]
	},
	garage: {
		floor: "#1C1E23",
		top: "radial-gradient(ellipse 70px 40px at 300px 360px,rgba(0,0,0,.35),transparent),repeating-linear-gradient(90deg,rgba(0,0,0,.25) 0 1px,transparent 1px 200px),linear-gradient(135deg,#23262C,#17191E)",
		wall: [
			"#22252B",
			"#1A1D22",
			"#131519"
		]
	}
};
function shell(c, id) {
	const T = THEMES[id];
	c.B(0, 0, 600, 600, -30, 30, T.floor, {
		top: T.top,
		front: "linear-gradient(180deg,#090D14,#101722)",
		side: "linear-gradient(90deg,#070A10,#0C111A)"
	});
	c.B(0, -14, 600, 14, 0, 230, "#283347", {
		front: `linear-gradient(180deg,${T.wall[0]} 0%,${T.wall[1]} 45%,${T.wall[2]} 100%)`,
		side: "#0E141F"
	});
	c.B(-14, -14, 14, 614, 0, 230, "#283347", {
		side: `linear-gradient(90deg,${T.wall[0]} 0%,${T.wall[1]} 45%,${T.wall[2]} 100%)`,
		front: "#0E141F"
	});
	c.yPlane(0, .5, 0, 600, 5, "#0B1019");
	c.xPlane(.5, 0, 0, 600, 5, "#0B1019");
	c.yPlane(0, 600.6, -8, 600, 2.4, "#5B95FF", { sh: "0 0 10px 1px rgba(76,141,255,.7), 0 0 30px 4px rgba(76,141,255,.22)" });
	c.xPlane(600.6, 0, -8, 600, 2.4, "#5B95FF", { sh: "0 0 10px 1px rgba(76,141,255,.7), 0 0 30px 4px rgba(76,141,255,.22)" });
}
function doorway(c, d) {
	const w = d.w || 64, a = d.at - w / 2;
	if (!d.dynLeaf) doorLeaf(c, d, false);
	if (d.side === "back") {
		c.yPlane(a, .7, 0, w, 168, "linear-gradient(180deg,#05070B,#0A0E15 70%,rgba(127,166,255,.08))", { sh: "inset 0 0 0 3px #2A3446, 0 0 0 1px rgba(169,184,255,.12)" });
		c.floor(a, 1, w, 40, .5, "linear-gradient(180deg,rgba(127,166,255,.14),transparent)");
	} else if (d.side === "left") {
		c.xPlane(.7, a, 0, w, 168, "linear-gradient(180deg,#05070B,#0A0E15 70%,rgba(127,166,255,.08))", { sh: "inset 0 0 0 3px #2A3446, 0 0 0 1px rgba(169,184,255,.12)" });
		c.floor(1, a, 40, w, .5, "linear-gradient(90deg,rgba(127,166,255,.14),transparent)");
	} else if (d.side === "east") c.floor(548, d.at - 40, 52, 80, .6, "linear-gradient(90deg,transparent,rgba(127,166,255,.22))", { r: "4px" });
	else c.floor(d.at - 40, 548, 80, 52, .6, "linear-gradient(180deg,transparent,rgba(127,166,255,.22))", { r: "4px" });
}
function doorLeaf(c, d, closed) {
	const w = d.w || 64, a = d.at - w / 2;
	const leaf = closed ? a + 2 : a + w + w - 4 <= 598 ? a + w + 2 : a - w + 2;
	const sh = { sh: "inset 0 0 0 2px #2A2218" };
	if (d.side === "back") c.yPlane(leaf, closed ? 1.2 : 1.6, 0, w - 4, 164, "linear-gradient(90deg,#3A3226,#4A3E2E)", sh);
	else if (d.side === "left") c.xPlane(closed ? 1.2 : 1.6, leaf, 0, w - 4, 164, "linear-gradient(90deg,#4A3E2E,#3A3226)", sh);
	if (!closed && (d.side === "back" || d.side === "left")) {
		if (d.side === "back") c.yPlane(leaf > a ? a + w : a - 2, 1.8, 0, 2, 164, "#2A2218");
		else c.xPlane(1.8, leaf > a ? a + w : a - 2, 0, 2, 164, "#2A2218");
	}
}
function doorPoints(d) {
	if (d.side === "back") return {
		p: [d.at, 8],
		i: [d.at, 52],
		label: [
			d.at,
			0,
			192
		],
		dir: [1, -.5]
	};
	if (d.side === "left") return {
		p: [8, d.at],
		i: [52, d.at],
		label: [
			0,
			d.at,
			192
		],
		dir: [-1, -.5]
	};
	if (d.side === "east") return {
		p: [592, d.at],
		i: [548, d.at],
		label: [
			600,
			d.at,
			26
		],
		dir: [1, .5]
	};
	return {
		p: [d.at, 592],
		i: [d.at, 548],
		label: [
			d.at,
			600,
			26
		],
		dir: [-1, .5]
	};
}
const M = "#36414F";
const TALL_PLANT = `<svg style="position:absolute;left:-40px;bottom:-2px" width="80" height="118" viewBox="0 0 80 118"><path d="M40 116 C38 92 34 70 22 54 C30 54 40 70 40 116 Z" fill="#3B6247"/><path d="M40 116 C40 88 46 64 60 46 C60 66 50 88 40 116 Z" fill="#4C7859"/><path d="M40 116 C36 84 30 52 36 14 C46 40 46 84 40 116 Z" fill="#5A8866"/><path d="M40 116 C44 84 54 56 72 30 C70 58 56 88 40 116 Z" fill="#43704F"/><path d="M40 116 C34 90 20 70 6 62 C10 80 26 100 40 116 Z" fill="#507C5C"/><path d="M40 116 C36 74 22 40 12 26 C14 56 28 92 40 116 Z" fill="#46714F"/><path d="M40 116 C42 70 52 30 58 10 C64 40 52 84 40 116 Z" fill="#5F8E6B"/></svg>`;
const SMALL_PLANT = `<svg style="position:absolute;left:-22px;bottom:-2px" width="44" height="42" viewBox="0 0 44 42"><path d="M22 40 C18 30 11 24 3 24 C9 19 19 24 22 40 Z" fill="#3D6449"/><path d="M22 40 C26 30 33 24 41 25 C35 19 25 24 22 40 Z" fill="#4E7A5C"/><path d="M22 40 C19 28 17 16 20 4 C27 12 26 28 22 40 Z" fill="#5F8C6A"/><path d="M22 40 C21 30 26 18 34 12 C34 22 28 32 22 40 Z" fill="#46704F"/><path d="M22 40 C21 31 14 20 8 15 C8 25 15 34 22 40 Z" fill="#54805F"/></svg>`;
const GLOBE = `<svg style="position:absolute;left:-18px;bottom:0" width="36" height="46" viewBox="0 0 36 46"><defs><radialGradient id="glb" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#5674A8"/><stop offset="1" stop-color="#18233A"/></radialGradient></defs><ellipse cx="18" cy="43.5" rx="9" ry="2.2" fill="#8C6E43"/><path d="M18 43 L18 36" stroke="#A8844F" stroke-width="2"/><path d="M5.5 30 A14 14 0 0 0 30.5 30" fill="none" stroke="#B08D57" stroke-width="1.6"/><circle cx="18" cy="18" r="13" fill="url(#glb)"/><path d="M9 13 C12 10 15 12 14 15 C13 18 10 19 9 17 Z M19 9 C23 8 27 11 26 14 C24 16 21 14 20 17 C19 20 22 23 20 26 C18 27 17 24 17 21 C16 17 16 12 19 9 Z" fill="#7E95C4" opacity=".55"/></svg>`;
const BOOK_PAL = [
	"#3E4C6E",
	"#C8784A",
	"#56638A",
	"#2E4A52",
	"#8592B8",
	"#6E5A48",
	"#A9B8FF",
	"#344058",
	"#D9B48C",
	"#4C8DFF"
];
const ROOMS = {
	studio: {
		name: "Studio",
		cell: [0, 1],
		doors: [{
			to: "bedroom",
			side: "back",
			at: 216,
			w: 56
		}, {
			to: "living",
			side: "east",
			at: 500
		}],
		clock: [
			"left",
			112,
			150
		],
		obstacles: [
			[
				0,
				186,
				128,
				456
			],
			[
				120,
				284,
				196,
				356
			],
			[
				0,
				0,
				56,
				56
			],
			[
				326,
				0,
				524,
				64
			],
			[
				464,
				276,
				566,
				378
			],
			[
				416,
				310,
				464,
				358
			],
			[
				562,
				258,
				596,
				292
			]
		],
		spots: {
			desk: {
				a: [222, 330],
				s: [
					156,
					320,
					59,
					0
				],
				pose: "desk"
			},
			books: {
				a: [420, 100],
				h: 90,
				pose: "browse"
			},
			lounge: {
				a: [516, 420],
				s: [
					516,
					344,
					48,
					-90
				],
				pose: "chair"
			},
			window: {
				a: [120, 100],
				h: 90,
				pose: "stand"
			}
		},
		build(ph) {
			const c = collector();
			shell(c, "studio");
			windowBack(c, ph, 60, 120, 72, 120);
			this.doors.forEach((d) => doorway(c, d));
			c.floor(0, 170, 280, 300, .4, "radial-gradient(ellipse 200px 170px at 40px 150px,rgba(76,141,255,.14),transparent 75%)");
			c.floor(104, 266, 108, 108, .45, "rgba(169,184,255,.035)", {
				r: "8px",
				sh: "inset 0 0 0 1px rgba(169,184,255,.08)"
			});
			c.floor(116, 280, 84, 84, .5, "radial-gradient(closest-side,rgba(0,0,0,.5),transparent)");
			c.B(14, 14, 30, 30, 0, 32, "#222B3A", { top: "radial-gradient(circle,#2A1E16 0 11px,#222B3A 12px)" });
			c.floor(6, 6, 50, 50, .5, "radial-gradient(closest-side,rgba(0,0,0,.5),transparent)");
			c.bb(29, 29, 32, TALL_PLANT);
			c.B(8, 196, 104, 8, 0, 92, "#232C3A");
			c.B(8, 438, 104, 8, 0, 92, "#232C3A");
			c.B(10, 372, 86, 62, 0, 70, "#1F2836");
			c.xPlane(96.5, 372, 6, 62, 58, rect("#2C3748", 0, 28, 62, 1) + "," + rect("#3A4658", 26, 12, 10, 2) + "," + rect("#3A4658", 26, 40, 10, 2));
			c.B(0, 190, 124, 262, 92, 8, "#2C3748", {
				top: "linear-gradient(90deg,#283244,#334055)",
				side: "#1B2330",
				front: "#202938"
			});
			c.xPlane(124.4, 190, 92, 262, 8, "linear-gradient(0deg,#1B2330,#26303F)");
			c.B(16, 248, 30, 30, 100, 3, M);
			c.B(24, 259, 8, 8, 103, 40, M);
			c.B(16, 364, 30, 30, 100, 3, M);
			c.B(24, 375, 8, 8, 103, 40, M);
			c.B(30, 206, 7, 112, 138, 70, "#1A212D");
			c.B(30, 322, 7, 112, 138, 70, "#1A212D");
			c.B(90, 274, 20, 92, 100, 3, "#1C2431", { top: "repeating-linear-gradient(90deg,transparent 0 4px,#121821 4px 5px),repeating-linear-gradient(0deg,#2A3445 0 5px,#121821 5px 6px)" });
			c.floor(86, 374, 32, 38, 100.5, "#161D29", { r: "3px" });
			c.B(96, 386, 9, 13, 100, 4, "#2E3949");
			c.B(88, 214, 11, 11, 100, 13, "#C8B79E", { top: "radial-gradient(circle,#3A2416 0 3.6px,#C8B79E 4.2px)" });
			c.B(99, 218, 3, 3, 104, 6, "#B8A78E");
			c.B(72, 228, 28, 22, 100, 2, "#2F3D63", { top: "linear-gradient(90deg,#2F3D63 0 3px,#3A4A76 3px)" });
			c.B(12, 416, 18, 18, 100, 3, M);
			c.B(19, 423, 4, 4, 103, 58, M);
			c.B(19, 423, 34, 5, 158, 4, M);
			c.B(44, 418, 14, 14, 150, 10, "#2B3445");
			const C = "#1F2633";
			c.B(128, 317, 56, 6, 8, 5, C);
			c.B(153, 292, 6, 56, 8, 5, C);
			c.B(153, 317, 6, 6, 13, 36, "#3A4556");
			c.B(126, 290, 58, 60, 49, 10, "#252E3D", { top: "radial-gradient(ellipse at 50% 50%,#2E384A,#222A38)" });
			c.B(184, 298, 8, 44, 64, 26, "#232C3A", {
				side: "repeating-linear-gradient(0deg,#181F2A 0 2px,#1C2430 2px 4px)",
				top: "#2C3646"
			});
			c.B(186, 316, 4, 8, 50, 14, "#3A4556");
			c.B(136, 288, 38, 5, 72, 4, "#2C3646");
			c.B(136, 347, 38, 5, 72, 4, "#2C3646");
			c.B(160, 289, 4, 3, 59, 13, "#2C3646");
			c.B(160, 348, 4, 3, 59, 13, "#2C3646");
			c.floor(320, .5, 210, 90, .5, "radial-gradient(ellipse 110px 60px at 105px 20px,rgba(0,0,0,.45),transparent)");
			const BC = "#263042";
			c.B(330, 0, 8, 58, 0, 220, BC);
			c.B(512, 0, 8, 58, 0, 220, BC);
			c.B(330, 0, 190, 58, 212, 8, "#2C374A");
			c.B(338, 0, 174, 58, 0, 10, "#1E2736");
			c.B(338, 2, 174, 56, 60, 4, "#2A3446");
			c.B(338, 2, 174, 56, 114, 4, "#2A3446");
			c.B(338, 2, 174, 56, 168, 4, "#2A3446");
			c.yPlane(338, .7, 10, 174, 202, "linear-gradient(180deg,#121A28,#0D131E)");
			c.yPlane(338, .9, 162, 174, 2, "rgba(127,166,255,.35)", { sh: "0 0 10px rgba(127,166,255,.35)" });
			c.yPlane(338, .9, 108, 174, 2, "rgba(240,184,104,.28)", { sh: "0 0 10px rgba(240,184,104,.28)" });
			const pal = [
				"#2D3850",
				"#3E4C6E",
				"#56638A",
				"#8592B8",
				"#1F2738",
				"#6E5A48",
				"#A9B8FF",
				"#344058",
				"#4C8DFF"
			];
			const widths = [
				9,
				12,
				8,
				14,
				10,
				11,
				7,
				13,
				9,
				10
			], heights = [
				40,
				44,
				36,
				46,
				38,
				42,
				34,
				45,
				39,
				41
			];
			const row = (z, xs, xe, seed, maxH) => {
				let x = xs, i = seed;
				for (;;) {
					const w = widths[i % 10], hh = Math.min(heights[i * 3 % 10], maxH), col = pal[i * 5 % 9];
					if (x + w > xe) break;
					c.B(x, 10, w, 40, z, hh, col, {
						front: `linear-gradient(180deg,${sh(col, .85)},${col} 30%,${col} 70%,${sh(col, 1.12)})`,
						top: sh(col, .82),
						side: sh(col, .58)
					});
					x += w + 1;
					i++;
				}
			};
			row(10, 342, 466, 0, 46);
			c.B(472, 12, 36, 42, 10, 32, "#2A3445");
			row(64, 342, 446, 3, 46);
			row(118, 342, 424, 6, 46);
			c.B(430, 10, 72, 4, 118, 46, "#3A465C");
			row(172, 342, 400, 2, 36);
			c.B(410, 10, 52, 38, 172, 6, "#3E4C6E");
			c.B(414, 12, 46, 34, 178, 5, "#6E5A48");
			c.B(474, 22, 14, 14, 172, 14, "#B08D57", { top: "linear-gradient(135deg,#D2AE74,#9C7A47)" });
			c.B(346, 18, 20, 20, 220, 16, "#C8B79E");
			c.bb(488, 32, 64, GLOBE);
			c.bb(356, 28, 236, SMALL_PLANT);
			c.floor(392, 228, 200, 212, .6, "repeating-linear-gradient(45deg,rgba(169,184,255,.03) 0 2px,transparent 2px 7px),#151C2A", {
				r: "6px",
				sh: "inset 0 0 0 7px #151C2A, inset 0 0 0 8px rgba(169,184,255,.16), 0 0 0 1px rgba(0,0,0,.3)"
			});
			c.floor(458, 270, 116, 120, .9, "radial-gradient(closest-side,rgba(0,0,0,.5),transparent)");
			const L = "#6A4630";
			c.B(474, 286, 5, 5, 0, 6, "#14181F");
			c.B(553, 286, 5, 5, 0, 6, "#14181F");
			c.B(474, 366, 5, 5, 0, 6, "#14181F");
			c.B(553, 366, 5, 5, 0, 6, "#14181F");
			c.B(470, 282, 92, 18, 6, 104, "#5E3E2A", {
				top: "#7A5238",
				front: "linear-gradient(180deg,#4A3021,#6A4630)"
			});
			c.B(486, 300, 60, 72, 6, 30, "#55382A");
			c.B(486, 300, 60, 12, 36, 62, "#7A5238", {
				top: "#8A5E41",
				front: "linear-gradient(180deg,#5E3E2A,#86593C 70%,#7A5238)"
			});
			c.B(486, 312, 60, 60, 36, 12, "#7A5238", { top: "linear-gradient(0deg,#7A5238,#8E6143)" });
			c.B(470, 300, 16, 72, 6, 58, L, { top: "#82593D" });
			c.B(546, 300, 16, 72, 6, 58, L, { top: "#82593D" });
			c.B(570, 266, 20, 20, 0, 3, M);
			c.B(578, 274, 4, 4, 3, 166, "#3A4556");
			const lamp = isDark(ph);
			c.B(566, 262, 28, 28, 166, 30, "#E8D3AE", {
				top: lamp ? "radial-gradient(circle,#FFF4DE,#E8C38A)" : "#D9C6A2",
				front: "linear-gradient(180deg,#B98B52,#F2D7A6)",
				side: "linear-gradient(90deg,#A97E48,#E2C08A)",
				glow: lamp ? "0 0 46px 16px rgba(240,184,104,.32)" : "none"
			});
			if (lamp) c.floor(430, 140, 170, 280, .8, "radial-gradient(ellipse 150px 150px at 150px 135px,rgba(240,184,104,.22),transparent 72%)");
			c.floor(414, 308, 52, 52, .9, "radial-gradient(closest-side,rgba(0,0,0,.45),transparent)");
			c.B(428, 322, 24, 24, 0, 4, "#2B3445");
			c.B(437, 331, 6, 6, 4, 48, "#2B3445");
			c.B(420, 314, 40, 40, 52, 4, "#6E5038", { top: "linear-gradient(135deg,#86644A,#5E4330)" });
			c.B(428, 322, 26, 18, 56, 1.5, "#E9ECF4", { glow: "0 0 14px rgba(127,166,255,.35)" });
			c.floor(428, 322, 26, 18, 57.8, "radial-gradient(circle at 13px 9px,#4C8DFF 0 2.4px,transparent 2.9px),linear-gradient(146deg,transparent 47%,rgba(9,12,18,.22) 48% 52%,transparent 53%),linear-gradient(34deg,transparent 47%,rgba(9,12,18,.22) 48% 52%,transparent 53%)");
			return c;
		},
		dyn(s, ph) {
			const c = collector();
			const on = s.desk;
			const glowC = on === "off" ? "none" : "0 0 26px rgba(76,141,255,.28)";
			c.xPlane(37.6, 325, 141, 106, 64, "#0B1220", {
				sh: glowC,
				html: on === "work" ? SCREEN_MAIN : on === "idle" ? SCREEN_IDLE : "",
				cls: "st-scr",
				id: "scr-main"
			});
			c.xPlane(37.6, 209, 141, 106, 64, "#0B1220", {
				sh: glowC,
				html: on === "work" ? SCREEN_LOGS : on === "idle" ? SCREEN_IDLE : "",
				cls: "st-scr"
			});
			if (on === "work") c.floor(36, 206, 40, 228, 100.5, "linear-gradient(90deg,rgba(76,141,255,.18),transparent)");
			if (s.deskLamp) {
				c.floor(16, 370, 104, 82, 100.6, "radial-gradient(ellipse 50px 40px at 38px 52px,rgba(240,184,104,.32),transparent 80%)");
				c.floor(45, 419, 12, 12, 149.4, "#F3C27A", {
					r: "2px",
					sh: "0 0 14px 5px rgba(240,184,104,.5)"
				});
			}
			return c;
		}
	},
	living: {
		name: "Living room",
		cell: [1, 1],
		doors: [
			{
				to: "bathroom",
				side: "back",
				at: 502
			},
			{
				to: "studio",
				side: "left",
				at: 82
			},
			{
				to: "kitchen",
				side: "east",
				at: 290
			},
			{
				to: "garage",
				side: "south",
				at: 300
			}
		],
		clock: [
			"back",
			408,
			168
		],
		obstacles: [
			[
				0,
				226,
				56,
				446
			],
			[
				156,
				282,
				252,
				394
			],
			[
				300,
				220,
				392,
				452
			],
			[
				404,
				170,
				436,
				202
			],
			[
				546,
				26,
				574,
				54
			],
			[
				140,
				0,
				300,
				36
			]
		],
		spots: {
			sofaA: {
				a: [276, 292],
				s: [
					340,
					292,
					38,
					0
				],
				pose: "sofa"
			},
			sofaB: {
				a: [276, 392],
				s: [
					340,
					392,
					38,
					0
				],
				pose: "sofa"
			},
			sofaC: {
				a: [276, 342],
				s: [
					340,
					342,
					38,
					0
				],
				pose: "sofa"
			},
			shelf: {
				a: [220, 64],
				h: 90,
				pose: "browse"
			},
			chat1: {
				a: [230, 510],
				h: 180,
				pose: "talk"
			},
			chat2: {
				a: [292, 510],
				h: 0,
				pose: "talk"
			}
		},
		build(ph) {
			const c = collector();
			shell(c, "living");
			windowBack(c, ph, 110, 220, 70, 120);
			this.doors.forEach((d) => doorway(c, d));
			c.rug(130, 190, 290, 290, "#1B2232", "rgba(169,184,255,.03)");
			c.shadow(0, 220, 80, 240);
			c.B(0, 226, 52, 220, 0, 40, "#2A2F3A", { top: "linear-gradient(90deg,#3A3226,#2E271E)" });
			c.xPlane(52.4, 226, 6, 220, 28, rect("#1E232D", 0, 13, 220, 1) + "," + rect("#1E232D", 109, 0, 1, 28) + ",linear-gradient(0deg,#22262F,#2A2F3A)");
			c.B(4, 236, 6, 200, 84, 112, "#11151C");
			c.B(16, 250, 20, 30, 40, 8, "#1C212B");
			c.shadow(150, 270, 110, 130);
			c.B(162, 288, 84, 100, 0, 30, "#2B3445");
			c.B(156, 282, 96, 112, 30, 5, "#6E5038", { top: "linear-gradient(135deg,#86644A,#5E4330)" });
			c.B(214, 352, 11, 11, 35, 12, "#C8B79E", { top: "radial-gradient(circle,#3A2416 0 3.6px,#C8B79E 4.2px)" });
			c.shadow(300, 200, 120, 270);
			const SF = "#2E4A52";
			c.B(300, 220, 92, 232, 0, 24, sh(SF, .8));
			c.B(366, 220, 26, 232, 24, 64, SF, { top: sh(SF, 1.15) });
			c.B(300, 220, 66, 18, 24, 34, SF, { top: sh(SF, 1.15) });
			c.B(300, 434, 66, 18, 24, 34, SF, { top: sh(SF, 1.15) });
			c.B(302, 238, 64, 98, 24, 14, sh(SF, 1.08), { top: `linear-gradient(0deg,${sh(SF, 1.08)},${sh(SF, 1.22)})` });
			c.B(302, 337, 64, 97, 24, 14, sh(SF, 1.08), { top: `linear-gradient(0deg,${sh(SF, 1.08)},${sh(SF, 1.22)})` });
			c.B(354, 226, 12, 30, 38, 24, "#C8784A", { top: "#D88A5C" });
			c.B(410, 176, 20, 20, 0, 3, M);
			c.B(418, 184, 4, 4, 3, 150, "#3A4556");
			const lamp = isDark(ph);
			c.B(406, 172, 28, 28, 150, 26, "#E8D3AE", {
				top: lamp ? "radial-gradient(circle,#FFF4DE,#E8C38A)" : "#D9C6A2",
				front: "linear-gradient(180deg,#B98B52,#F2D7A6)",
				side: "linear-gradient(90deg,#A97E48,#E2C08A)",
				glow: lamp ? "0 0 46px 16px rgba(240,184,104,.3)" : "none"
			});
			if (lamp) c.glowAt(420, 260, 150, .18);
			c.plant(560, 40);
			c.B(360, 0, 90, 22, 120, 4, "#2C3748");
			c.B(372, 2, 22, 18, 124, 30, "#1C212B", { front: "radial-gradient(circle at 11px 12px,#3A4556 0 6px,#1C212B 7px)" });
			c.shadow(130, 0, 180, 60);
			c.B(140, 0, 160, 34, 0, 6, "#2A221B");
			c.B(140, 0, 6, 34, 0, 62, "#3A2F24");
			c.B(294, 0, 6, 34, 0, 62, "#3A2F24");
			c.B(218, 0, 4, 34, 0, 62, "#3A2F24");
			c.B(140, 0, 160, 34, 30, 3, "#4A3E2E");
			c.B(140, 0, 160, 34, 62, 4, "#5A4A36", { top: "linear-gradient(135deg,#6E5A44,#4A3E2E)" });
			c.yPlane(146, .7, 6, 148, 56, "#15110D");
			c.B(240, 6, 18, 18, 66, 16, "#C8B79E", { top: "radial-gradient(circle,#4E7A5C 0 6px,#C8B79E 7px)" });
			return c;
		},
		dyn(s) {
			const c = collector();
			const tv = s.tv;
			if (tv === "off") c.xPlane(10.4, 242, 90, 188, 104, "linear-gradient(135deg,#0B0E14 0%,#151A23 46%,#0E1219 54%,#0B0E14 100%)");
			else if (tv === "film") {
				c.xPlane(10.4, 242, 90, 188, 104, [
					rect("#05070B", 0, 0, 188, 12),
					rect("#05070B", 0, 92, 188, 12),
					"radial-gradient(ellipse 40px 22px at 130px 66px,rgba(255,200,140,.9),rgba(240,140,90,.4) 60%,transparent)",
					"linear-gradient(180deg,#2B2350 12px,#8E4A6A 60px,#E08A5A 92px)"
				].join(","), {
					sh: "0 0 40px rgba(230,140,110,.28)",
					cls: "tv-film"
				});
				c.xPlane(10.6, 242, 90, 188, 104, rect("#120E1A", 0, 74, 188, 18), { cls: "tv-pan" });
				c.floor(10, 230, 200, 210, .7, "radial-gradient(ellipse 120px 110px at 0px 105px,rgba(230,150,110,.12),transparent 80%)");
			} else {
				const pitch = [
					"radial-gradient(circle at 100px 56px,transparent 0 13px,rgba(255,255,255,.55) 13px 14px,transparent 14.5px)",
					rect("rgba(255,255,255,.55)", 99, 6, 1, 100),
					rect("rgba(255,255,255,.55)", 6, 6, 188, 1),
					rect("rgba(255,255,255,.55)", 6, 105, 188, 1),
					rect("rgba(255,255,255,.55)", 6, 6, 1, 100),
					rect("rgba(255,255,255,.55)", 193, 6, 1, 100),
					rect("rgba(255,255,255,.5)", 6, 36, 24, 40),
					rect("#3B7A3E", 7, 37, 22, 38),
					rect("rgba(255,255,255,.5)", 170, 36, 24, 40),
					rect("#3B7A3E", 171, 37, 22, 38),
					rect("rgba(9,12,18,.75)", 70, 2, 60, 6),
					"repeating-linear-gradient(90deg,#2F6A35 0 20px,#337239 20px 40px)"
				];
				c.xPlane(10.4, 242, 90, 188, 104, pitch.join(","), { sh: "0 0 40px rgba(90,200,120,.28)" });
				c.xPlane(10.6, 242, 90, 188, 104, "", { html: tv === "paused" ? "<div class=\"tv-pause\"><i></i><i></i></div>" : "<div class=\"tv-game\"><i></i><i></i><i></i><i></i><b></b></div>" });
				c.floor(10, 230, 200, 210, .7, "radial-gradient(ellipse 120px 110px at 0px 105px,rgba(110,210,130,.12),transparent 80%)");
			}
			for (let i = 0; i < 10; i++) {
				if (s.shelf[i] === 0) continue;
				const sx = i < 5 ? 150 + i * 13 : 226 + (i - 5) * 13, col = BOOK_PAL[i];
				c.B(sx, 8, 10, 22, 33, 24 + i * 7 % 6, col, {
					front: `linear-gradient(180deg,${sh(col, .85)},${col} 30%,${col} 70%,${sh(col, 1.12)})`,
					top: sh(col, .82),
					side: sh(col, .58)
				});
			}
			for (let i = 0; i < 6; i++) {
				const col = BOOK_PAL[(i + 4) % 10];
				c.B(150 + i * 23, 8, 18, 22, 6, 20, col, {
					front: col,
					top: sh(col, .8),
					side: sh(col, .6)
				});
			}
			return c;
		}
	},
	kitchen: {
		name: "Kitchen",
		cell: [2, 1],
		doors: [{
			to: "living",
			side: "left",
			at: 282
		}, {
			to: "gym",
			side: "back",
			at: 548
		}],
		clock: [
			"left",
			180,
			150
		],
		obstacles: [
			[
				66,
				0,
				484,
				64
			],
			[
				0,
				74,
				72,
				150
			],
			[
				214,
				226,
				426,
				334
			],
			[
				246,
				349,
				404,
				377
			],
			[
				60,
				420,
				180,
				510
			],
			[
				100,
				376,
				140,
				416
			],
			[
				18,
				442,
				62,
				482
			]
		],
		spots: {
			stove: {
				a: [232, 98],
				h: 90,
				pose: "cook"
			},
			coffee: {
				a: [106, 98],
				h: 90,
				pose: "counter"
			},
			sink: {
				a: [365, 98],
				h: 90,
				pose: "wash"
			},
			fridge: {
				a: [100, 112],
				h: 0,
				pose: "counter"
			},
			island: {
				a: [446, 282],
				h: 0,
				pose: "drink"
			},
			island2: {
				a: [446, 318],
				h: 20,
				pose: "stand"
			},
			stoolA: {
				a: [330, 402],
				s: [
					330,
					363,
					66,
					90
				],
				pose: "stool"
			},
			stoolB: {
				a: [260, 402],
				s: [
					260,
					363,
					66,
					90
				],
				pose: "stool"
			},
			dineN: {
				a: [120, 352],
				s: [
					120,
					400,
					34,
					-90
				],
				pose: "chair"
			},
			dineW: {
				a: [40, 414],
				s: [
					40,
					462,
					34,
					180
				],
				pose: "chair"
			},
			chat1: {
				a: [440, 452],
				h: 180,
				pose: "talk"
			},
			chat2: {
				a: [500, 452],
				h: 0,
				pose: "talk"
			}
		},
		build(ph) {
			const c = collector();
			shell(c, "kitchen");
			this.doors.forEach((d) => doorway(c, d));
			windowBack(c, ph, 300, 120, 112, 74);
			const CB = "#262D3A", TOP = "linear-gradient(90deg,#C9CED8,#B6BCC8)";
			c.yPlane(0, .65, 92, 480, 48, "repeating-linear-gradient(90deg,rgba(0,0,0,.22) 0 1px,transparent 1px 24px),repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 12px),#2C3646");
			c.B(70, 0, 410, 60, 0, 88, CB, { front: `repeating-linear-gradient(90deg,${CB} 0 66px,#1B212C 66px 68px)` });
			c.B(66, 0, 418, 64, 88, 5, "#C9CED8", {
				top: TOP,
				front: "#9AA3B0"
			});
			c.xPlane(484.5, 0, 0, 60, 93, "#1B212C");
			c.B(70, 0, 220, 34, 150, 60, CB, { front: `repeating-linear-gradient(90deg,${CB} 0 54px,#1B212C 54px 56px)` });
			c.B(430, 0, 50, 34, 150, 60, CB);
			c.floor(330, 12, 70, 38, 93.4, "linear-gradient(#9AA3B0,#7D8694)", {
				r: "6px",
				sh: "inset 0 0 0 3px #B6BCC8"
			});
			c.B(362, 2, 6, 6, 93, 22, "#B6BCC8");
			c.B(362, 2, 6, 16, 113, 4, "#B6BCC8");
			c.B(90, 8, 26, 30, 93, 34, "#1C212B", { front: "radial-gradient(circle at 13px 10px,#4C8DFF 0 1.6px,transparent 2px),#1C212B" });
			c.B(128, 14, 16, 16, 93, 18, "#B6BCC8");
			c.shadow(0, 70, 90, 120);
			c.B(0, 74, 72, 76, 0, 200, "#9AA3B0", {
				top: "#B6BCC8",
				side: "linear-gradient(180deg,#8B94A1 0 62%,#5E6672 62% 63%,#8B94A1 63%)",
				front: "#7D8694"
			});
			c.B(72, 88, 3, 4, 120, 60, "#C9CED8");
			c.shadow(210, 220, 230, 140);
			c.B(220, 232, 200, 96, 0, 88, "#2B3445", { side: "repeating-linear-gradient(90deg,#1E2532 0 48px,#18202B 48px 50px)" });
			c.B(214, 226, 212, 108, 88, 5, "#C9CED8", { top: "linear-gradient(135deg,#D3D7DF,#AEB5C2)" });
			c.B(330, 276, 40, 30, 93, 16, "#8C6E43", { top: "radial-gradient(circle at 12px 14px,#E0B83C 0 5px,transparent 6px),radial-gradient(circle at 26px 12px,#D8503C 0 5px,transparent 6px),radial-gradient(circle at 20px 20px,#7BA24A 0 5px,transparent 6px),#5E4330" });
			[
				260,
				330,
				390
			].forEach((sx) => {
				c.B(sx - 3, 360, 6, 6, 0, 60, M);
				c.B(sx - 14, 349, 28, 28, 60, 6, "#2E4A52", { top: "#3E5E68" });
			});
			const lamp = isDark(ph);
			[270, 370].forEach((px) => {
				c.B(px - 1, 279, 2, 2, 160, 100, "#3A4556");
				c.B(px - 12, 268, 24, 24, 150, 12, "#1C212B", { glow: lamp ? "0 0 30px 10px rgba(240,184,104,.28)" : "none" });
				if (lamp) c.glowAt(px, 280, 70, .14);
			});
			c.shadow(50, 410, 140, 110);
			c.B(70, 432, 8, 8, 0, 52, "#3A2F24");
			c.B(162, 432, 8, 8, 0, 52, "#3A2F24");
			c.B(70, 490, 8, 8, 0, 52, "#3A2F24");
			c.B(162, 490, 8, 8, 0, 52, "#3A2F24");
			c.B(62, 422, 116, 84, 52, 5, "#6E5038", { top: "linear-gradient(135deg,#8A6A4E,#5E4330)" });
			c.B(108, 446, 24, 24, 57, 12, "#E9ECF2", { top: "radial-gradient(circle,#5F8C6A 0 6px,#E9ECF2 7px)" });
			const chair = (x, y, back) => {
				c.B(x - 15, y - 14, 30, 28, 30, 4, "#2E4A52", { top: "#3E5E68" });
				[
					[x - 13, y - 12],
					[x + 9, y - 12],
					[x - 13, y + 8],
					[x + 9, y + 8]
				].forEach(([lx, ly]) => c.B(lx, ly, 4, 4, 0, 30, "#1C212B"));
				if (back === "n") c.B(x - 15, y - 16, 30, 4, 34, 34, "#2E4A52", { top: "#3E5E68" });
				else c.B(x - 18, y - 14, 4, 28, 34, 34, "#2E4A52", { top: "#3E5E68" });
			};
			chair(120, 396, "n");
			chair(40, 462, "w");
			c.floor(110, 200, 26, 18, .8, "radial-gradient(ellipse,#4C8DFF 0 7px,#2B4B8C 8px 11px,transparent 12px)");
			c.floor(82, 206, 22, 16, .8, "radial-gradient(ellipse,#9FD6F4 0 6px,#2B4B8C 7px 10px,transparent 11px)");
			return c;
		},
		dyn(s) {
			const c = collector();
			const hot = s.stove;
			c.floor(190, 10, 80, 44, 93.4, `radial-gradient(circle at 20px 14px,${hot ? "#F26B3A 0 3px,transparent 3.5px,transparent 6px,rgba(242,107,58,.85) 6px 8px" : "transparent 0 6px,#3A4556 6px 8px"},transparent 8.5px),radial-gradient(circle at 60px 14px,transparent 0 6px,#3A4556 6px 8px,transparent 8.5px),radial-gradient(circle at 20px 32px,transparent 0 6px,#3A4556 6px 8px,transparent 8.5px),radial-gradient(circle at 60px 32px,transparent 0 6px,#3A4556 6px 8px,transparent 8.5px),#11151C`, {
				r: "3px",
				sh: hot ? "0 0 18px rgba(242,107,58,.35)" : "none"
			});
			c.B(198, 14, 24, 22, 94, 5, "#2B2F36", { top: hot ? "radial-gradient(circle,#F3D36B 0 4px,#E9E2D0 5px 8px,#2B2F36 9px)" : "#2B2F36" });
			c.B(222, 23, 22, 4, 97, 2, "#2B2F36");
			if (hot) c.bb(210, 24, 120, "<div class=\"st-steam sm\"><i></i><i></i><i></i></div>");
			if (s.coffee) c.bb(103, 22, 132, "<div class=\"st-steam sm\"><i></i><i></i></div>");
			const plate = (x, y, z, food) => c.B(x, y, 22, 22, z, 2, "#E9ECF2", { top: food ? "radial-gradient(circle,#E0B83C 0 3px,#C8784A 4px 6px,#7BA24A 7px,#F4F6FA 8px)" : "radial-gradient(circle,#D9DDE5 0 6px,#F4F6FA 7px)" });
			if (s.plateN === "food") plate(108, 424, 57, true);
			else if (s.plateN === "empty") plate(108, 424, 57, false);
			if (s.plateW === "food") plate(66, 452, 57, true);
			else if (s.plateW === "empty") plate(66, 452, 57, false);
			if (s.plateIsland) plate(400, 296, 93, s.plateIsland === "food");
			for (let i = 0; i < Math.min(3, s.sinkPlates); i++) c.B(354, 20, 22, 22, 90 + i * 2.2, 2, "#E9ECF2", { top: "radial-gradient(circle,#D9DDE5 0 6px,#F4F6FA 7px)" });
			return c;
		}
	},
	bedroom: {
		name: "Bedroom",
		cell: [0, 0],
		doors: [{
			to: "bathroom",
			side: "east",
			at: 370
		}, {
			to: "studio",
			side: "south",
			at: 240
		}],
		clock: [
			"back",
			58,
			150
		],
		obstacles: [
			[
				150,
				0,
				370,
				256
			],
			[
				110,
				6,
				144,
				46
			],
			[
				376,
				6,
				410,
				46
			],
			[
				0,
				300,
				62,
				490
			],
			[
				186,
				266,
				334,
				300
			]
		],
		spots: {
			bed: {
				a: [400, 160],
				s: "lie",
				pose: "lie"
			},
			bedRead: {
				a: [400, 160],
				s: [
					262,
					64,
					50,
					-90
				],
				pose: "bedsit"
			},
			wardrobe: {
				a: [96, 395],
				h: 0,
				pose: "counter"
			},
			window: {
				a: [500, 96],
				h: 90,
				pose: "stand"
			}
		},
		build(ph) {
			const c = collector();
			shell(c, "bedroom");
			windowBack(c, ph, 430, 140, 80, 110);
			c.B(410, 0, 22, 14, 60, 140, "#3A2F4A", { front: "linear-gradient(90deg,#3A2F4A,#4A3C5E)" });
			c.B(568, 0, 22, 14, 60, 140, "#3A2F4A", { front: "linear-gradient(90deg,#4A3C5E,#3A2F4A)" });
			this.doors.forEach((d) => doorway(c, d));
			c.rug(150, 230, 230, 150, "#2A2540", "rgba(255,255,255,.025)");
			c.shadow(140, 0, 240, 280);
			c.B(150, 0, 220, 14, 0, 112, "#3B3552", {
				front: "repeating-linear-gradient(90deg,#3B3552 0 34px,#332E47 34px 36px)",
				top: "#4A4366"
			});
			c.B(160, 14, 200, 240, 0, 28, "#2A2F3D");
			c.B(166, 14, 188, 232, 28, 18, "#E3E6EE", { top: "#ECEEF4" });
			c.B(178, 22, 74, 40, 46, 14, "#F2F3F7", { top: "linear-gradient(0deg,#E2E5EE,#FFFFFF)" });
			c.B(268, 22, 74, 40, 46, 14, "#F2F3F7", { top: "linear-gradient(0deg,#E2E5EE,#FFFFFF)" });
			[110, 376].forEach((nx) => {
				c.B(nx, 6, 34, 40, 0, 50, "#3A3226", { top: "linear-gradient(135deg,#86644A,#5E4330)" });
				c.B(nx + 11, 18, 12, 12, 50, 18, M);
			});
			c.shadow(0, 290, 80, 210);
			c.B(0, 300, 62, 190, 0, 210, "#262B38", {
				side: "linear-gradient(180deg,#2C3242,#22273A)",
				top: "#2F3546"
			});
			c.B(186, 266, 148, 34, 0, 34, "#3B3552", { top: "#4A4366" });
			if (ph === "night") c.floor(400, 60, 200, 260, .5, "linear-gradient(180deg,rgba(140,170,240,.08),transparent 80%)");
			return c;
		},
		dyn(s) {
			const c = collector();
			const duvet = "repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 22px),linear-gradient(90deg,#2C3A63,#34457A)";
			if (s.bed === "unmade") {
				c.B(162, 150, 196, 100, 30, 16, "#2C3A63", {
					top: "radial-gradient(ellipse at 30% 40%,#3A4C84,#2C3A63 70%)",
					front: "#26335A",
					side: "#212D50"
				});
				c.B(200, 118, 120, 40, 30, 22, "#2C3A63", {
					top: "radial-gradient(ellipse at 50% 50%,#40538F,#2C3A63 70%)",
					front: "#26335A",
					side: "#212D50"
				});
			} else {
				c.B(162, s.bed === "read" ? 120 : 72, 196, s.bed === "read" ? 130 : 178, 30, 22, "#2C3A63", {
					top: duvet,
					front: "#26335A",
					side: "#212D50"
				});
				c.B(166, s.bed === "read" ? 120 : 72, 188, 16, 52, 4, "#E3E6EE");
			}
			if (s.bed === "sleep") {
				const DV = (x, y, w, d, z, h) => c.B(x, y, w, d, z, h, "#2E3D69", {
					top: "radial-gradient(ellipse at 50% 45%,#40538F,#2E3D69 75%)",
					front: "#24305A",
					side: "#1D2749"
				});
				DV(222, 74, 76, 56, 52, 20);
				DV(226, 130, 68, 44, 52, 16);
				DV(230, 174, 60, 50, 52, 12);
				DV(236, 222, 22, 22, 52, 18);
				DV(262, 222, 22, 22, 52, 18);
				c.B(292, 92, 12, 52, 72, 9, "#5A6070", { top: "#6B7282" });
				c.B(293, 144, 10, 11, 72, 8, "#6B4530", { top: "#7A503A" });
			} else if (s.bed === "read") {
				const DV = (x, y, w, d, z, h) => c.B(x, y, w, d, z, h, "#2E3D69", {
					top: "radial-gradient(ellipse at 50% 45%,#40538F,#2E3D69 75%)",
					front: "#24305A",
					side: "#1D2749"
				});
				DV(232, 130, 60, 60, 52, 14);
				DV(236, 200, 22, 22, 52, 18);
				DV(262, 200, 22, 22, 52, 18);
			}
			[110, 376].forEach((nx) => {
				c.B(nx + 5, 12, 24, 24, 68, 18, "#E8D3AE", {
					top: s.lamp ? "radial-gradient(circle,#FFF4DE,#E8C38A)" : "#D9C6A2",
					glow: s.lamp ? "0 0 28px 8px rgba(240,184,104,.26)" : "none"
				});
				if (s.lamp) c.glowAt(nx + 17, 40, 70, .12);
			});
			if (s.nightBook) {
				c.B(116, 30, 18, 12, 50, 6, "#6E5A48");
				c.B(118, 31, 16, 10, 56, 4, "#C8784A");
			} else c.B(116, 30, 18, 12, 50, 6, "#6E5A48");
			if (s.wardrobe) {
				c.xPlane(62.4, 300, 0, 190, 210, "repeating-linear-gradient(90deg,#3E4C6E 0 14px,#2A3242 14px 16px,#6E5A48 16px 30px,#2A3242 30px 32px,#1F2738 32px 46px,#2A3242 46px 48px,#C8784A 48px 62px,#2A3242 62px 64px) 6px 30px/178px 120px no-repeat," + rect("#B6BCC8", 6, 26, 178, 3) + ",#141820");
				c.dec(94, 210, "matrix3d(0.7071,0.7071,0,0,0,0,-1,0,0.7071,-0.7071,0,0,62.4,300,210,1)", "#2A3044", { sh: "inset 0 0 0 2px #1A1F2A" });
				c.dec(94, 210, "matrix3d(0.7071,-0.7071,0,0,0,0,-1,0,-0.7071,-0.7071,0,0,62.4,490,210,1)", "#2A3044", { sh: "inset 0 0 0 2px #1A1F2A" });
			} else c.xPlane(62.4, 300, 0, 190, 210, rect("#1A1F2A", 94, 0, 2, 210) + "," + rect("#B08D57", 86, 100, 3, 24) + "," + rect("#B08D57", 101, 100, 3, 24));
			return c;
		}
	},
	bathroom: {
		name: "Bathroom",
		cell: [1, 0],
		doors: [
			{
				to: "bedroom",
				side: "left",
				at: 506,
				dynLeaf: true
			},
			{
				to: "gym",
				side: "east",
				at: 340
			},
			{
				to: "living",
				side: "south",
				at: 340
			}
		],
		clock: [
			"back",
			214,
			150
		],
		obstacles: [
			[
				0,
				0,
				156,
				156
			],
			[
				250,
				0,
				304,
				64
			],
			[
				0,
				280,
				58,
				420
			],
			[
				546,
				26,
				574,
				54
			]
		],
		spots: {
			shower: {
				a: [178, 128],
				s: [
					76,
					76,
					0,
					40
				],
				pose: "shower"
			},
			toilet: {
				a: [277, 100],
				s: [
					277,
					44,
					30,
					-90
				],
				pose: "toilet"
			},
			sink: {
				a: [88, 350],
				h: 0,
				pose: "sink"
			},
			towel: {
				a: [385, 44],
				h: 90,
				pose: "counter"
			}
		},
		build(ph) {
			const c = collector();
			shell(c, "bathroom");
			const TILE = "repeating-linear-gradient(90deg,rgba(0,0,0,.28) 0 1px,transparent 1px 30px),repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 30px),";
			c.yPlane(0, .6, 0, 600, 200, TILE + "linear-gradient(180deg,#2A3446,#202838)");
			c.xPlane(.6, 0, 0, 600, 200, TILE + "linear-gradient(180deg,#273042,#1D2534)");
			this.doors.forEach((d) => doorway(c, d));
			c.yPlane(460, .8, 160, 110, 46, "linear-gradient(180deg,rgba(220,230,250,.35),rgba(160,180,220,.18))," + SKY[ph], { sh: "inset 0 0 0 3px #2A3446" });
			c.floor(4, 4, 150, 150, .6, "repeating-linear-gradient(90deg,rgba(0,0,0,.3) 0 1px,transparent 1px 15px),repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 1px,transparent 1px 15px),#2B3445");
			c.floor(70, 70, 14, 14, .8, "radial-gradient(circle,#11151C 0 3px,#3A4556 4px 7px,transparent 7.5px)");
			c.B(70, 2, 4, 30, 150, 4, "#B6BCC8");
			c.B(60, 26, 24, 24, 190, 4, "#C9CED8", { top: "radial-gradient(circle,#9AA3B0 0 2px,transparent 2.5px) 0 0/6px 6px,#C9CED8" });
			c.B(70, 2, 4, 4, 120, 74, "#B6BCC8");
			c.shadow(240, 0, 80, 90);
			c.B(252, 0, 50, 16, 34, 44, "#E9ECF2", {
				top: "#F4F6FA",
				front: "#D9DDE5",
				side: "#C9CED8"
			});
			c.B(258, 16, 38, 46, 0, 30, "#E9ECF2", {
				top: "radial-gradient(ellipse at 50% 55%,#C9CED8 0 9px,#F4F6FA 10px)",
				front: "#D9DDE5",
				side: "#C9CED8"
			});
			c.B(272, 4, 10, 6, 78, 2, "#B6BCC8");
			c.B(350, 0, 70, 6, 128, 3, "#B6BCC8");
			c.shadow(0, 270, 80, 160);
			c.B(0, 280, 56, 140, 0, 84, "#3A3226", {
				top: "#E9ECF2",
				side: "linear-gradient(90deg,#3A3226,#4A3E2E)"
			});
			c.floor(10, 320, 38, 60, 84.4, "radial-gradient(ellipse,#C9CED8 0 12px,#F4F6FA 13px 16px,transparent 17px)", { r: "10px" });
			c.B(2, 344, 10, 10, 84, 16, "#B6BCC8");
			c.B(14, 296, 8, 8, 84, 14, "#4C8DFF");
			c.B(26, 298, 6, 6, 84, 10, "#E9ECF2");
			c.floor(170, 60, 70, 46, .7, "repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 2px,transparent 2px 5px),#3E5E68", { r: "6px" });
			c.plant(560, 40);
			return c;
		},
		dyn(s) {
			const c = collector();
			const glass = s.shower ? "linear-gradient(180deg,rgba(225,232,248,.5),rgba(200,212,236,.4))" : "linear-gradient(135deg,rgba(200,215,245,.14),rgba(200,215,245,.06))";
			if (s.shower) {
				c.xPlane(2, 6, 10, 150, 180, "repeating-linear-gradient(90deg,rgba(200,220,255,.0) 0 6px,rgba(200,220,255,.18) 6px 7px)", { cls: "st-rain" });
				c.bb(76, 76, 200, "<div class=\"st-steam\"><i></i><i></i><i></i><i></i></div>");
			}
			c.yPlane(0, 154, 0, 154, 196, glass, { sh: "inset 0 0 0 2px rgba(201,206,216,.6)" });
			c.xPlane(154, 0, 0, 100, 196, glass, { sh: "inset 0 0 0 2px rgba(201,206,216,.6)" });
			if (s.towel === "rail" || s.towel === "damp") c.yPlane(358, 6.4, 70, 54, 58, s.towel === "damp" ? "linear-gradient(180deg,#A85A32,#8E4C2A)" : "linear-gradient(180deg,#C8784A,#B0663C)", { r: "2px" });
			c.xPlane(.9, 292, 108, 116, 80, s.fog ? "linear-gradient(135deg,rgba(220,228,244,.7),rgba(190,200,220,.6))" : "linear-gradient(135deg,rgba(180,200,240,.28),rgba(60,80,120,.18) 45%,rgba(180,200,240,.22) 55%,rgba(60,80,120,.16))", { sh: "inset 0 0 0 3px #B6BCC8" });
			if (s.tap) c.bb(10, 346, 98, "<div class=\"st-drip\"></div>");
			doorLeaf(c, this.doors[0], s.closed);
			return c;
		}
	},
	gym: {
		name: "Gym",
		cell: [2, 0],
		doors: [{
			to: "bathroom",
			side: "left",
			at: 142
		}, {
			to: "kitchen",
			side: "south",
			at: 320
		}],
		clock: [
			"back",
			368,
			150
		],
		obstacles: [
			[
				196,
				16,
				212,
				32
			],
			[
				312,
				16,
				328,
				32
			],
			[
				196,
				132,
				212,
				148
			],
			[
				312,
				132,
				328,
				148
			],
			[
				138,
				28,
				160,
				62
			],
			[
				440,
				146,
				572,
				214
			],
			[
				0,
				220,
				46,
				390
			],
			[
				378,
				298,
				430,
				324
			],
			[
				212,
				274,
				348,
				314
			],
			[
				390,
				28,
				408,
				46
			],
			[
				358,
				38,
				372,
				52
			]
		],
		spots: {
			rack: {
				a: [262, 172],
				s: [
					262,
					82,
					0,
					-135
				],
				pose: "lift"
			},
			squat: {
				a: [262, 172],
				s: [
					262,
					82,
					0,
					-135
				],
				pose: "squat"
			},
			tread: {
				a: [510, 238],
				s: [
					512,
					180,
					12,
					0
				],
				pose: "run"
			},
			curls: {
				a: [80, 304],
				h: 0,
				pose: "curl"
			},
			bench: {
				a: [280, 346],
				s: [
					280,
					294,
					42,
					-90
				],
				pose: "benchcurl"
			},
			kettle: {
				a: [404, 360],
				h: 90,
				pose: "swing"
			},
			mat: {
				a: [300, 460],
				h: -45,
				pose: "stretch"
			},
			water: {
				a: [366, 80],
				h: 90,
				pose: "drink"
			}
		},
		build(ph) {
			const c = collector();
			shell(c, "gym");
			windowBack(c, ph, 430, 150, 90, 110);
			this.doors.forEach((d) => doorway(c, d));
			c.floor(120, 10, 280, 250, .6, "radial-gradient(circle,rgba(255,255,255,.025) 0 1px,transparent 1.5px) 0 0/8px 8px,#121418", {
				r: "4px",
				sh: "inset 0 0 0 1px rgba(169,184,255,.08)"
			});
			c.floor(250, 420, 110, 70, .6, "repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 10px),#2E4A52", { r: "6px" });
			const RK = "#2B3445";
			[
				[200, 20],
				[316, 20],
				[200, 136],
				[316, 136]
			].forEach((p) => c.B(p[0], p[1], 8, 8, 0, 220, RK, { top: "#3A4556" }));
			c.B(200, 20, 124, 8, 214, 6, RK);
			c.B(200, 136, 124, 8, 214, 6, RK);
			c.B(200, 20, 8, 124, 214, 6, RK);
			c.B(316, 20, 8, 124, 214, 6, RK);
			c.shadow(440, 140, 140, 100);
			c.B(448, 150, 120, 60, 0, 12, "#1C212B", { top: "repeating-linear-gradient(90deg,#11151C 0 3px,#171B22 3px 6px)" });
			c.B(448, 150, 10, 60, 12, 86, M);
			c.B(0, 220, 46, 170, 0, 40, "#2B3445");
			c.xPlane(.9, 410, 20, 170, 170, "linear-gradient(135deg,rgba(180,200,240,.22),rgba(60,80,120,.14) 45%,rgba(180,200,240,.18) 55%,rgba(60,80,120,.12))", { sh: "inset 0 0 0 3px #3A4556" });
			c.B(140, 30, 8, 30, 0, 30, "#11151C", { side: "radial-gradient(circle,#3A4556 0 3px,#11151C 4px)" });
			c.B(150, 30, 8, 30, 0, 30, "#11151C");
			c.B(220, 280, 120, 28, 0, 34, "#2B3445");
			c.B(214, 276, 132, 36, 34, 8, "#1C212B", { top: "#252B36" });
			c.B(300, 282, 30, 22, 42, 3, "#E9ECF2");
			c.B(24, 2, 100, 6, 110, 70, "#E9ECF2", { front: rect("#4C8DFF", 10, 14, 60, 3) + "," + rect("#2B3445", 10, 26, 72, 2) + "," + rect("#2B3445", 10, 36, 50, 2) + "," + rect("#E05A5A", 10, 46, 40, 2) + ",#E9ECF2" });
			c.B(392, 30, 14, 14, 0, 26, "#1C212B", { front: "radial-gradient(circle at 7px 13px,#5FD39A 0 1.4px,#1C212B 2px)" });
			return c;
		},
		dyn(s) {
			const c = collector();
			c.B(440, 156, 12, 48, 98, 28, "#1C212B", {
				front: `${rect(s.tread === "run" ? "#5FD39A" : s.tread === "walk" ? "#E0B83C" : "#4C8DFF", 4, 8, s.tread === "off" ? 10 : 40, 10)},#1C212B`,
				glow: s.tread !== "off" ? "0 0 14px rgba(95,211,154,.35)" : "0 0 8px rgba(76,141,255,.2)"
			});
			if (s.tread !== "off") c.floor(458, 152, 108, 56, 12.4, "repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 2px,transparent 2px 8px)", { cls: "st-belt" });
			for (let di = 0; di < 7; di++) {
				if (s.dumb === "out" && di === 3) continue;
				const dy = 228 + di * 23;
				c.B(10, dy, 26, 8, 40, 8, "#11151C", { top: "linear-gradient(90deg,#3A4556 0 6px,#11151C 6px 20px,#3A4556 20px)" });
			}
			if (s.bar === "rack") {
				c.B(258, 26, 6, 112, 132, 4, "#B6BCC8", { top: "#C9CED8" });
				c.B(254, 30, 14, 10, 124, 20, "#11151C", { top: "#2B3445" });
				c.B(254, 124, 14, 10, 124, 20, "#11151C", { top: "#2B3445" });
			}
			if (!s.kettleOut) c.B(406, 300, 22, 22, 0, 20, "#E05A5A", { top: "radial-gradient(circle,#11151C 0 4px,#C04A4A 5px)" });
			c.B(380, 300, 18, 18, 0, 16, "#11151C", { top: "radial-gradient(circle,#11151C 0 4px,#2B3445 5px)" });
			if (!s.bottleOut) c.B(360, 40, 10, 10, 0, 28, "#4C8DFF", { top: "#2B4B8C" });
			return c;
		}
	},
	garage: {
		name: "Garage",
		cell: [1, 2],
		doors: [{
			to: "living",
			side: "back",
			at: 532
		}],
		clock: [
			"back",
			300,
			160
		],
		obstacles: [
			[
				60,
				204,
				410,
				420
			],
			[
				30,
				0,
				180,
				60
			],
			[
				560,
				20,
				596,
				140
			]
		],
		spots: {
			bench: {
				a: [104, 92],
				h: 90,
				pose: "cook"
			},
			bench2: {
				a: [206, 92],
				h: 45,
				pose: "stand"
			},
			hook: {
				a: [478, 50],
				h: 90,
				pose: "counter"
			},
			greet1: {
				a: [150, 480],
				h: 180,
				pose: "wave"
			},
			greet2: {
				a: [214, 480],
				h: 0,
				pose: "wave"
			},
			greet3: {
				a: [190, 530],
				h: 45,
				pose: "wave"
			},
			chat1: {
				a: [460, 300],
				h: 180,
				pose: "talk"
			},
			chat2: {
				a: [522, 300],
				h: 0,
				pose: "talk"
			},
			entry: {
				a: [40, 470],
				h: 180
			}
		},
		build() {
			const c = collector();
			shell(c, "garage");
			this.doors.forEach((d) => doorway(c, d));
			c.floor(40, 190, 420, 6, .6, "repeating-linear-gradient(90deg,#E0B83C 0 40px,transparent 40px 60px)");
			c.floor(40, 440, 420, 6, .6, "repeating-linear-gradient(90deg,#E0B83C 0 40px,transparent 40px 60px)");
			c.shadow(30, 0, 160, 80);
			c.B(30, 0, 150, 60, 0, 86, "#3A3226", { top: "linear-gradient(135deg,#86644A,#5E4330)" });
			c.yPlane(30, .8, 100, 150, 100, "radial-gradient(circle,#11151C 0 1px,transparent 1.5px) 0 0/10px 10px," + rect("#9AA3B0", 20, 20, 4, 40) + "," + rect("#9AA3B0", 14, 20, 16, 4) + "," + rect("#E05A5A", 50, 24, 24, 6) + "," + rect("#9AA3B0", 60, 30, 4, 34) + "," + rect("#E0B83C", 100, 20, 30, 22) + ",#3A3226");
			c.B(44, 10, 40, 40, 86, 46, "#1C212B", {
				front: rect("#4C8DFF", 6, 6, 10, 3) + ",#1C212B",
				top: "#2B3445"
			});
			c.floor(54, 20, 20, 20, 96, "radial-gradient(circle,#F26B3A 0 2px,transparent 3px)", { sh: "0 0 10px rgba(242,107,58,.6)" });
			c.B(108, 18, 40, 26, 86, 2, "#2B3445", { top: "#9AA3B0" });
			c.yPlane(110, 18.4, 88, 36, 22, rect("#A9B8FF", 4, 4, 20, 2) + "," + rect("#5B8CFF", 8, 9, 22, 2) + "," + rect("#E8C97A", 4, 14, 14, 2) + ",#0B1220", { sh: "0 0 14px rgba(76,141,255,.3)" });
			c.B(560, 20, 36, 120, 0, 150, "#2B3445");
			for (let si = 0; si < 3; si++) {
				c.B(560, 24, 36, 112, 40 + si * 46, 3, "#3A4556");
				c.B(564, 30, 28, 40, 43 + si * 46, 26, [
					"#E0B83C",
					"#4C8DFF",
					"#E05A5A"
				][si]);
				c.B(564, 80, 28, 40, 43 + si * 46, 26, "#56638A");
			}
			c.B(420, 0, 30, 10, 90, 44, "#E9ECF2", { front: "radial-gradient(circle at 15px 14px,#5FD39A 0 3px,transparent 3.5px),#E9ECF2" });
			c.B(472, 0, 14, 8, 120, 4, "#9AA3B0");
			return c;
		},
		dyn(s) {
			const c = collector();
			c.xPlane(.8, 160, s.rollup ? 150 : 0, 300, s.rollup ? 40 : 190, "repeating-linear-gradient(0deg,#2A2F38 0 14px,#1E222A 14px 16px)", { sh: "inset 0 0 0 4px #3A4556" });
			if (s.rollup) c.xPlane(.4, 160, 0, 300, 150, "linear-gradient(180deg,#26324A,#3A4A66)");
			return c;
		}
	}
};
const ROOM_IDS = Object.keys(ROOMS);
const SCREEN_MAIN = `<div class="scr" data-mode="code">
<div class="scr-m scr-code"><i style="width:44%"></i><i style="width:62%;margin-left:8%"></i><i style="width:36%;margin-left:8%"></i><i style="width:58%;margin-left:16%"></i><i style="width:30%;margin-left:16%"></i><i style="width:48%;margin-left:8%"></i><i class="ty" style="margin-left:8%"></i></div>
<div class="scr-m scr-read"><div class="rd"><b></b><i></i><i></i><i class="hl"></i><i></i><i></i><i></i><i class="hl"></i><i></i><i></i></div><div class="nt"><i></i><i></i><i class="new"></i></div></div>
<div class="scr-m scr-board"><div><i></i><i></i></div><div><i></i><i class="mv"></i></div><div><i></i><i></i><i></i></div></div>
<div class="scr-m scr-flow"><i class="n a"></i><i class="n b"></i><i class="n c"></i><i class="n d"></i><i class="e e1"></i><i class="e e2"></i><b></b></div>
</div>`;
const SCREEN_LOGS = "<div class=\"scr scr-logs\"><div class=\"lg\"><i></i><i></i><i style=\"width:40%\"></i><i></i><i style=\"width:55%\"></i><i></i><i style=\"width:30%\"></i><i></i><i></i><i style=\"width:45%\"></i><i></i><i style=\"width:60%\"></i></div></div>";
const SCREEN_IDLE = "<div class=\"scr scr-idle\"><i></i></div>";

// site/src/portfolio-world/people.js
const FIG_SCALE = 1.32;
function part(list, x, y, w, d, z, h, c, o = {}) {
	list.push({
		x,
		y,
		w,
		d,
		z,
		h,
		top: o.top || shade(c, 1.08),
		front: o.front || shade(c, .86),
		side: o.side || shade(c, .66),
		back: o.back || shade(c, .6),
		cls: o.cls || "",
		origin: o.origin != null ? `50% 50% ${o.origin}px` : ""
	});
}
function cyl(list, cx, cy, z0, H, r, n, c, capC) {
	const ap = r * Math.cos(Math.PI / n), w = 2 * r * Math.sin(Math.PI / n) + .7;
	for (let i = 0; i < n; i++) {
		const th = (i + .5) * 2 * Math.PI / n, nx = Math.cos(th), ny = Math.sin(th), tx = -ny, ty = nx;
		const ox = cx + ap * nx - tx * w / 2, oy = cy + ap * ny - ty * w / 2;
		const lit = .62 + .5 * Math.max(0, nx * .42 + ny * .9);
		list.push({
			w,
			h: H,
			m: `matrix3d(${[
				tx,
				ty,
				0,
				0,
				0,
				0,
				-1,
				0,
				nx,
				ny,
				0,
				0,
				ox,
				oy,
				z0 + H,
				1
			].map(fx).join(",")})`,
			bg: shade(c, lit),
			r: "0"
		});
	}
	if (capC) list.push({
		w: 2 * r,
		h: 2 * r,
		m: `translate3d(${cx - r}px,${cy - r}px,${z0 + H}px)`,
		bg: capC,
		r: "50%"
	});
}
const LOOKS = { agent: {
	skin: "#6B4530",
	hair: "short",
	hairC: "#16110E",
	label: "Agent"
} };
const OUTFITS = {
	work: {
		top: "#1F2738",
		hem: "#171D29",
		bottom: "#55524D",
		bottom2: "#4C4945",
		hip: "#45423E",
		shoe: "#E6E9EF",
		sole: "#4C8DFF"
	},
	home: {
		top: "#4A5568",
		hem: "#3E475A",
		bottom: "#2A2D34",
		bottom2: "#25282E",
		hip: "#1C1F24",
		shoe: "#2A2E36",
		sole: "#E9ECF2"
	},
	gym: {
		top: "#16181D",
		hem: "#4C8DFF",
		bottom: "#16181D",
		bottom2: "#16181D",
		hip: "#16181D",
		shoe: "#16181D",
		sole: "#E9ECF2",
		bareArms: true,
		shorts: true
	},
	sleep: {
		top: "#5A6070",
		hem: "#4E5464",
		bottom: "#6B7282",
		bottom2: "#646B7A",
		hip: "#5A6070",
		shoe: null,
		sole: null
	},
	out: {
		top: "#4A5240",
		hem: "#3E4536",
		bottom: "#2A3550",
		bottom2: "#253049",
		hip: "#222A3E",
		shoe: "#F2F4F8",
		sole: "#C8784A"
	},
	towel: { towel: true }
};
function clothes(lookId, outfit) {
	const L = LOOKS[lookId];
	if (lookId !== "agent") return {
		top: L.top,
		hem: shade(L.top, .85),
		bottom: L.bottom,
		bottom2: shade(L.bottom, .92),
		hip: L.hip,
		shoe: L.shoe,
		sole: L.sole
	};
	return OUTFITS[outfit] || OUTFITS.work;
}
const STAND = /* @__PURE__ */ new Set([
	"stand",
	"browse",
	"throw",
	"talk",
	"wave",
	"counter",
	"cook",
	"wash",
	"sink",
	"drink",
	"curl",
	"swing",
	"stretch",
	"lift",
	"squat",
	"run",
	"shower"
]);
const HEADPHONES = /* @__PURE__ */ new Set([
	"desk",
	"run",
	"lift",
	"squat",
	"curl",
	"benchcurl",
	"swing"
]);
function buildPerson(lookId, outfit, pose, hold = "none") {
	const L = LOOKS[lookId], K = clothes(lookId, outfit), SK = L.skin;
	const body = [], bodyD = [], head = [], headD = [];
	const hand = { top: `radial-gradient(circle at 50% 50%,${shade(SK, .55)} 0 1.4px,${shade(SK, 1.1)} 1.8px)` };
	const shoeO = K.shoe ? {
		top: shade(K.shoe, 1.05),
		front: shade(K.shoe, .85),
		side: shade(K.shoe, .72)
	} : null;
	const soleO = K.sole ? {
		top: K.shoe ? shade(K.shoe, 1.05) : SK,
		front: K.sole,
		side: shade(K.sole, .85)
	} : null;
	const armC = K.towel || K.bareArms ? SK : K.top;
	let headZ, headCls = "", eyes = "open";
	if (STAND.has(pose)) {
		const legC = K.towel || K.shorts ? SK : K.bottom, legC2 = K.towel || K.shorts ? shade(SK, .95) : K.bottom2;
		const legCls = pose === "squat" ? "st-squatLeg" : "";
		part(body, -9, -19, 18, 18, 0, 32, legC, {
			cls: legCls || "st-legL",
			origin: legCls ? 0 : 32,
			front: shade(legC, .8)
		});
		part(body, -9, 1, 18, 18, 0, 32, legC2, {
			cls: legCls || "st-legR",
			origin: legCls ? 0 : 32
		});
		if (K.shorts) {
			part(body, -9.6, -19.6, 19.2, 18.6, 16, 16.4, K.bottom, {
				cls: legCls || "st-legL",
				origin: legCls ? 0 : 16
			});
			part(body, -9.6, 1, 19.2, 18.6, 16, 16.4, K.bottom, {
				cls: legCls || "st-legR",
				origin: legCls ? 0 : 16
			});
		}
		if (K.shoe) {
			part(body, -12.4, -19.4, 4.8, 18.8, 0, 9, K.shoe, {
				cls: legCls || "st-legL",
				origin: legCls ? 0 : 32,
				...shoeO
			});
			part(body, -12.4, .6, 4.8, 18.8, 0, 9, K.shoe, {
				cls: legCls || "st-legR",
				origin: legCls ? 0 : 32,
				...shoeO
			});
			part(body, -12.4, -19.4, 4.8, 18.8, 0, 2.4, K.sole, {
				cls: legCls || "st-legL",
				origin: legCls ? 0 : 32,
				...soleO
			});
			part(body, -12.4, .6, 4.8, 18.8, 0, 2.4, K.sole, {
				cls: legCls || "st-legR",
				origin: legCls ? 0 : 32,
				...soleO
			});
		} else {
			part(body, -12, -19, 4, 18, 0, 6, SK, {
				cls: "st-legL",
				origin: 32
			});
			part(body, -12, 1, 4, 18, 0, 6, SK, {
				cls: "st-legR",
				origin: 32
			});
		}
		const up = pose === "squat" ? "st-squatTop" : "";
		if (K.towel) {
			part(body, -11.6, -20.6, 23.2, 41.2, 14, 31, "#E8E2D6", {
				cls: up,
				front: "repeating-linear-gradient(0deg,#E8E2D6 0 3px,#D9D1C2 3px 4px)",
				side: "#CFC6B6",
				top: "#F1ECE3"
			});
			part(body, -10, -19, 20, 38, 45, 36, SK, {
				cls: up,
				top: shade(SK, 1.1),
				side: shade(SK, .7)
			});
		} else {
			part(body, -11, -20, 22, 40, 32, 9, K.hip, { cls: up });
			part(body, -10, -19, 20, 38, 41, 40, K.top, {
				cls: up,
				top: shade(K.top, 1.18),
				front: K.bareArms ? `linear-gradient(180deg,${K.top} 0 70%,${K.hem} 70% 73%,${K.top} 73%)` : void 0
			});
			part(body, -10.6, -19.6, 21.2, 39.2, 41, 4, K.hem, { cls: up });
		}
		part(body, -4, -6, 8, 12, 81, 3, SK, { cls: up });
		cyl(bodyD, 0, 0, 80, 3, 6.5, 12, SK, shade(SK, 1.05));
		const armT = { top: shade(armC, 1.18) };
		const downL = (cls = "st-armL") => {
			part(body, -6, -26, 12, 7, 52, 28, armC, {
				cls,
				origin: 28,
				...armT
			});
			part(body, -4, -25.5, 8, 6, 43, 9, SK, {
				cls,
				origin: 37,
				...hand
			});
		};
		const downR = (cls = "st-armR") => {
			part(body, -6, 19, 12, 7, 52, 28, armC, {
				cls,
				origin: 28,
				...armT
			});
			part(body, -4, 19.5, 8, 6, 43, 9, SK, {
				cls,
				origin: 37,
				...hand
			});
		};
		const fwdL = (z = 60, cls = "") => {
			part(body, -6, -26, 12, 7, z, 80 - z, armC, armT);
			part(body, -30, -25, 26, 7, z, 8, armC, {
				cls,
				...armT
			});
			part(body, -36, -24.5, 7, 6, z - 1, 8, SK, {
				cls,
				...hand
			});
		};
		const fwdR = (z = 60, cls = "") => {
			part(body, -6, 19, 12, 7, z, 80 - z, armC, armT);
			part(body, -30, 18, 26, 7, z, 8, armC, {
				cls,
				...armT
			});
			part(body, -36, 18.5, 7, 6, z - 1, 8, SK, {
				cls,
				...hand
			});
		};
		const upR = (cls) => {
			part(body, -6, 19, 12, 7, 78, 34, armC, {
				cls,
				origin: 0,
				...armT
			});
			part(body, -4, 19.5, 8, 6, 110, 9, SK, {
				cls,
				origin: -32,
				...hand
			});
		};
		const upL = (cls) => {
			part(body, -6, -26, 12, 7, 78, 34, armC, {
				cls,
				origin: 0,
				...armT
			});
			part(body, -4, -25.5, 8, 6, 110, 9, SK, {
				cls,
				origin: -32,
				...hand
			});
		};
		switch (pose) {
			case "cook":
				fwdL(60);
				fwdR(60, "st-stir");
				part(body, -54, 19, 20, 4, 63, 2, "#2B2F36", { cls: "st-stir" });
				break;
			case "counter":
				fwdL(64, "st-fiddle");
				fwdR(64, "st-fiddle2");
				break;
			case "wash":
				fwdL(62, "st-stir");
				fwdR(62, "st-stir2");
				break;
			case "sink":
				fwdL(64);
				part(body, -6, 19, 12, 7, 66, 14, armC, armT);
				part(body, -22, 18, 16, 7, 72, 8, armC, {
					cls: "st-brush",
					...armT
				});
				part(body, -26, 18.5, 6, 6, 76, 7, SK, {
					cls: "st-brush",
					...hand
				});
				part(body, -30, 20, 6, 2, 84, 2, "#4C8DFF", { cls: "st-brush" });
				break;
			case "drink":
				downL("");
				part(body, -6, 19, 12, 7, 70, 10, armC, armT);
				part(body, -22, 18, 16, 7, 74, 8, armC, armT);
				part(body, -26, 18.5, 6, 6, 78, 7, SK, hand);
				part(body, -31, 18, 7, 7, 82, 13, hold === "bottle" ? "#4C8DFF" : "#C8D8E8", { top: "radial-gradient(circle,#E0A040 0 2.5px,#C8D8E8 3px)" });
				break;
			case "browse":
				downL("");
				part(body, -6, 19, 12, 7, 76, 8, armC, armT);
				part(body, -30, 18, 26, 7, 88, 8, armC, {
					cls: "st-reach",
					...armT
				});
				part(body, -36, 18.5, 7, 6, 87, 8, SK, {
					cls: "st-reach",
					...hand
				});
				break;
			case "throw":
				downL("");
				upR("st-throw");
				break;
			case "wave":
				downL("");
				upR("st-wave");
				break;
			case "talk":
				fwdL(58, "st-gestL");
				downR("");
				break;
			case "curl":
				part(body, -6, -26, 12, 7, 52, 28, armC, armT);
				part(body, -6, 19, 12, 7, 52, 28, armC, armT);
				part(body, -20, -26, 16, 7, 50, 8, SK, {
					cls: "st-curlL",
					...hand
				});
				part(body, -20, 19, 16, 7, 50, 8, SK, {
					cls: "st-curlR",
					...hand
				});
				part(body, -26, -32, 8, 18, 49, 10, "#11151C", {
					cls: "st-curlL",
					top: "linear-gradient(90deg,#3A4556 0 5px,#11151C 5px 13px,#3A4556 13px)"
				});
				part(body, -26, 14, 8, 18, 49, 10, "#11151C", {
					cls: "st-curlR",
					top: "linear-gradient(90deg,#3A4556 0 5px,#11151C 5px 13px,#3A4556 13px)"
				});
				break;
			case "swing":
				fwdL(52, "st-swing");
				fwdR(52, "st-swing");
				part(body, -44, -8, 16, 16, 38, 18, "#E05A5A", {
					cls: "st-swing",
					top: "radial-gradient(circle,#11151C 0 4px,#C04A4A 5px)"
				});
				break;
			case "stretch":
				upL("st-sway");
				upR("st-sway");
				break;
			case "shower":
				upL("st-scrub");
				upR("st-scrub2");
				break;
			case "run":
				downL("st-armL");
				downR("st-armR");
				break;
			case "lift":
				part(body, -6, -26, 12, 7, 74, 40, armC, {
					cls: "st-pressArm",
					origin: 0,
					...armT
				});
				part(body, -6, 19, 12, 7, 74, 40, armC, {
					cls: "st-pressArm",
					origin: 0,
					...armT
				});
				if (K.bareArms) {
					part(body, -6.4, -26.4, 12.8, 7.8, 70, 8, K.top);
					part(body, -6.4, 18.6, 12.8, 7.8, 70, 8, K.top);
				}
				part(body, -4, -25.5, 8, 6, 112, 9, SK, {
					cls: "st-press",
					...hand
				});
				part(body, -4, 19.5, 8, 6, 112, 9, SK, {
					cls: "st-press",
					...hand
				});
				part(body, -2, -52, 4, 104, 118, 3, "#B6BCC8", {
					top: "#C9CED8",
					cls: "st-press"
				});
				part(body, -9, -50, 18, 7, 108, 24, "#11151C", {
					top: "#2B3445",
					cls: "st-press"
				});
				part(body, -9, 43, 18, 7, 108, 24, "#11151C", {
					top: "#2B3445",
					cls: "st-press"
				});
				break;
			case "squat":
				part(body, -6, -26, 12, 7, 66, 16, armC, {
					cls: up,
					...armT
				});
				part(body, -6, 19, 12, 7, 66, 16, armC, {
					cls: up,
					...armT
				});
				part(body, 6, -52, 4, 104, 84, 3, "#B6BCC8", {
					top: "#C9CED8",
					cls: up
				});
				part(body, -1, -50, 18, 7, 74, 24, "#11151C", {
					top: "#2B3445",
					cls: up
				});
				part(body, -1, 43, 18, 7, 74, 24, "#11151C", {
					top: "#2B3445",
					cls: up
				});
				headCls = "st-squatTop";
				break;
			default:
				downL();
				downR();
		}
		if (hold === "phone" && pose === "stand") part(body, -36, 17, 3, 8, 60, 12, "#11151C", { front: "#2B4B8C" });
		headZ = 83;
	} else if (pose === "lie") {
		eyes = "closed";
		headZ = 0;
	} else {
		const bare = pose === "toilet";
		const legC = bare || K.towel ? SK : K.bottom, legC2 = bare || K.towel ? shade(SK, .95) : K.bottom2;
		if (pose === "kneel") {
			part(body, -11, -20, 22, 40, 0, 9, K.hip || K.bottom);
			part(body, -22, -19, 18, 18, -10, 12, legC, { front: shade(legC, .8) });
			part(body, -22, 1, 18, 18, -10, 12, legC2);
			part(body, -22, -19, 38, 18, -18, 8, legC, { front: shade(legC, .8) });
			part(body, -22, 1, 38, 18, -18, 8, legC2);
			if (K.shoe) {
				part(body, 14, -19, 8, 18, -18, 9, K.shoe, shoeO);
				part(body, 14, 1, 8, 18, -18, 9, K.shoe, shoeO);
			} else {
				part(body, 14, -19, 6, 18, -18, 6, SK);
				part(body, 14, 1, 6, 18, -18, 6, SK);
			}
		} else if (pose !== "bedsit") {
			part(body, -11, -20, 22, 40, 0, 9, K.hip || K.bottom);
			part(body, -46, -19, 40, 18, 0, 15, legC, { front: shade(legC, .8) });
			part(body, -46, 1, 40, 18, 0, 15, legC2);
			if (K.shoe) {
				part(body, -50, -19, 5, 18, 0, 15, K.shoe, shoeO);
				part(body, -50, 1, 5, 18, 0, 15, K.shoe, shoeO);
			} else {
				part(body, -50, -19, 5, 18, 0, 12, SK);
				part(body, -50, 1, 5, 18, 0, 12, SK);
			}
			if (bare) part(body, -45, -20, 9, 40, -24, 9, K.bottom || "#55524D", { top: `repeating-linear-gradient(90deg,${K.bottom || "#55524D"} 0 3px,${K.bottom2 || "#4C4945"} 3px 5px)` });
		}
		part(body, -10, -19, 20, 38, 9, 40, K.towel ? SK : K.top, { top: shade(K.towel ? SK : K.top, 1.18) });
		if (!K.towel) part(body, -10.6, -19.6, 21.2, 39.2, 9, 4, K.hem);
		part(body, -4, -6, 8, 12, 49, 3, SK);
		const armT = { top: shade(armC, 1.22) };
		part(body, -7, -26, 13, 7, 30, 18, armC, armT);
		part(body, -7, 19, 13, 7, 30, 18, armC, armT);
		if (pose === "kneel") {
			part(body, -7, -26, 12, 7, 12, 18, armC, armT);
			part(body, -7, 19, 12, 7, 12, 18, armC, armT);
			part(body, -32, -25, 28, 7, 8, 7, armC, {
				cls: "st-rub",
				...armT
			});
			part(body, -32, 18, 28, 7, 8, 7, armC, {
				cls: "st-rub2",
				...armT
			});
			part(body, -38, -24.5, 7, 6, 7, 7, SK, {
				cls: "st-rub",
				...hand
			});
			part(body, -38, 18.5, 7, 6, 7, 7, SK, {
				cls: "st-rub2",
				...hand
			});
		} else if (pose === "desk") {
			part(body, -34, -26, 30, 7, 40, 8, armC, {
				cls: "st-tapL",
				...armT
			});
			part(body, -34, 19, 30, 7, 40, 8, armC, {
				cls: "st-tapR",
				...armT
			});
			part(body, -40, -25.5, 7, 6, 39, 8, SK, {
				cls: "st-tapL",
				...hand
			});
			part(body, -40, 19.5, 7, 6, 39, 8, SK, {
				cls: "st-tapR",
				...hand
			});
		} else if (hold === "pad") {
			part(body, -26, -24, 20, 7, 32, 8, armC, armT);
			part(body, -26, 17, 20, 7, 32, 8, armC, armT);
			part(body, -32, -16, 7, 7, 31, 8, SK, {
				cls: "st-tapL",
				...hand
			});
			part(body, -32, 9, 7, 7, 31, 8, SK, {
				cls: "st-tapR",
				...hand
			});
			part(body, -36, -12, 10, 24, 33, 5, lookId === "agent" ? "#E9ECF2" : "#11151C", {
				top: "radial-gradient(circle at 5px 7px,#11151C 0 1.6px,transparent 2px),radial-gradient(circle at 5px 17px,#11151C 0 1.6px,transparent 2px),linear-gradient(90deg,#F4F6FA 0 30%,#11151C 30% 70%,#F4F6FA 70%)",
				cls: "st-tapL"
			});
		} else if (hold === "book") {
			part(body, -26, -22, 20, 7, 36, 8, armC, armT);
			part(body, -26, 15, 20, 7, 36, 8, armC, armT);
			part(body, -32, -20, 7, 6, 36, 8, SK, hand);
			part(body, -32, 14, 7, 6, 36, 8, SK, hand);
			part(body, -40, -14, 4, 28, 38, 20, "#E9E2D0", {
				side: "linear-gradient(90deg,#C8784A 0 2px,#F4EEE0 2px)",
				front: "#C8784A",
				top: "#F4EEE0"
			});
			part(body, -40, -1, 4, 2, 40, 18, "#C8C0AE", { cls: "st-page" });
		} else if (hold === "plate") {
			part(body, -26, -24, 20, 7, 32, 8, armC, armT);
			part(body, -32, -22, 7, 6, 31, 8, SK, hand);
			part(body, -24, 17, 18, 7, 34, 8, armC, {
				cls: "st-eat",
				...armT
			});
			part(body, -30, 17.5, 7, 6, 34, 8, SK, {
				cls: "st-eat",
				...hand
			});
			part(body, -36, 20, 10, 2, 40, 2, "#B6BCC8", { cls: "st-eat" });
		} else if (hold === "phone") {
			part(body, -24, -20, 18, 7, 38, 8, armC, armT);
			part(body, -24, 13, 18, 7, 38, 8, armC, armT);
			part(body, -30, -8, 4, 16, 42, 22, "#11151C", {
				side: "#2B4B8C",
				front: "#11151C",
				top: "#1C212B"
			});
			part(body, -30, -18, 6, 10, 40, 8, SK, hand);
			part(body, -30, 8, 6, 10, 40, 8, SK, hand);
		} else if (hold === "mug") {
			part(body, -24, -20, 18, 7, 36, 8, armC, armT);
			part(body, -30, -18, 6, 6, 36, 8, SK, hand);
			part(body, -24, 13, 18, 7, 36, 8, armC, armT);
			part(body, -30, 13, 6, 6, 36, 8, SK, hand);
			part(body, -32, 18, 9, 9, 40, 12, "#C8B79E", { top: "radial-gradient(circle,#3A2416 0 3px,#C8B79E 3.6px)" });
		} else if (hold === "dumbbells" || pose === "benchcurl") {
			part(body, -20, -26, 16, 7, 26, 8, SK, {
				cls: "st-curlL",
				...hand
			});
			part(body, -20, 19, 16, 7, 26, 8, SK, {
				cls: "st-curlR",
				...hand
			});
			part(body, -26, -32, 8, 18, 25, 10, "#11151C", { cls: "st-curlL" });
			part(body, -26, 14, 8, 18, 25, 10, "#11151C", { cls: "st-curlR" });
		} else {
			part(body, -24, -26, 18, 7, 22, 8, armC, armT);
			part(body, -24, 19, 18, 7, 22, 8, armC, armT);
			part(body, -30, -25.5, 7, 6, 20, 8, SK, hand);
			part(body, -30, 19.5, 7, 6, 20, 8, SK, hand);
		}
		cyl(bodyD, 0, 0, 48, 3, 6.5, 12, SK, shade(SK, 1.05));
		headZ = 51;
	}
	cyl(headD, 0, 0, 0, 29, 14.5, 20, SK, null);
	const capTop = `radial-gradient(circle at 40% 40%,${shade(L.hairC, 1.6)},${L.hairC} 70%)`;
	if (L.hair === "cap") {
		cyl(headD, 0, 0, 20, 12, 16.2, 20, L.cap, `radial-gradient(circle at 40% 40%,${shade(L.cap, 1.25)},${L.cap} 70%)`);
		part(head, 12, -9, 12, 18, 21, 2.4, L.cap, { top: shade(L.cap, 1.15) });
	} else {
		cyl(headD, 0, 0, 19, 13, 16, 20, L.hairC, capTop);
		cyl(headD, 3, 0, 15, 4, 15.6, 20, L.hairC, null);
	}
	if (L.hair === "puff") {
		cyl(headD, 2, 0, 31, 6, 7, 16, L.hairC, null);
		cyl(headD, 2, 0, 36, 10, 11, 18, L.hairC, `radial-gradient(circle at 40% 40%,${shade(L.hairC, 1.9)},${L.hairC} 70%)`);
		part(head, -2, -2, 4, 4, 33, 3, "#E0B83C", { top: "#F0CF60" });
	}
	if (L.specs) part(head, -15.6, -11, 1.4, 22, 17, 5, "#11151C", { back: "linear-gradient(90deg,#11151C 0 1px,rgba(200,220,255,.4) 1px 9px,#11151C 9px 13px,rgba(200,220,255,.4) 13px 21px,#11151C 21px)" });
	if (lookId === "agent" && HEADPHONES.has(pose)) {
		part(head, -2.5, -18, 5, 36, 32, 2.6, "#2A3242", { top: "#38435A" });
		part(head, -2.5, -18.6, 5, 2.4, 14, 20, "#2A3242");
		part(head, -2.5, 16.2, 5, 2.4, 14, 20, "#2A3242");
		part(head, -5, -21, 10, 4, 8, 11, "#232B39", { side: "#1A2130" });
		part(head, -5, 17, 10, 4, 8, 11, "#232B39", {
			front: "radial-gradient(circle,#4C8DFF 0 1.4px,#232B39 2px)",
			side: "#1A2130"
		});
	}
	return {
		body,
		bodyD,
		head,
		headD,
		headZ,
		headCls,
		eyes,
		height: headZ + 34
	};
}

// site/src/portfolio-world/living-home.js
/**
* Thin Shubur mount for the portfolio's copied CSS-3D house.
* The copied world and avatar geometry stay source-owned; this module maps
* Shubur Life activities onto their existing room spots and poses.
*/
const HOUR_MS = 36e5;
const SAMPLE_SEED = "shubur";
const DEMO_SCOPES = [...new Set(PHONE_ACTIONS.map((tool) => tool.requiredScope))];
const FALLBACK_SPOT = {
	studio: "lounge",
	living: "sofaA",
	kitchen: "dineN",
	bedroom: "window",
	bathroom: "sink",
	gym: "mat",
	garage: "bench2"
};
const SPOT_FOR_ACTIVITY = {
	sleep: { bedroom: "bed" },
	relax: {
		studio: "lounge",
		living: "sofaA",
		bedroom: "bedRead",
		kitchen: "stoolA",
		gym: "mat",
		garage: "bench2"
	},
	eat: {
		kitchen: "dineN",
		living: "sofaA"
	},
	work: {
		studio: "desk",
		garage: "bench"
	},
	read: {
		studio: "books",
		living: "shelf",
		bedroom: "bedRead"
	},
	exercise: { gym: "mat" },
	wash: {
		bathroom: "shower",
		kitchen: "sink"
	},
	groom: { bathroom: "sink" },
	tend: {
		studio: "window",
		living: "shelf",
		kitchen: "coffee"
	},
	gaze: {
		studio: "window",
		living: "shelf",
		bedroom: "window",
		kitchen: "coffee"
	},
	tinker: {
		garage: "bench",
		studio: "desk"
	},
	idle: {
		studio: "lounge",
		living: "sofaA",
		kitchen: "dineN",
		bedroom: "bedRead",
		bathroom: "sink",
		gym: "mat",
		garage: "bench2"
	}
};
const INITIAL_OBJECTS = {
	tv: "off",
	shelf: Array(10).fill(1),
	stove: false,
	coffee: false,
	plateN: "none",
	plateW: "none",
	plateIsland: null,
	sinkPlates: 0,
	bed: "made",
	lamp: false,
	nightBook: false,
	wardrobe: false,
	shower: false,
	towel: "rail",
	fog: false,
	tap: false,
	closed: false,
	tread: "off",
	dumb: "rack",
	bar: "rack",
	kettleOut: false,
	bottleOut: false,
	rollup: false,
	desk: "off",
	deskLamp: false
};
const FACE = `<div class="st-f" style="width:20px;height:17px;transform-origin:0 0;transform:matrix3d(0,1,0,0,0,0,-1,0,-1,0,0,0,-14.9,-10,21,1)"><svg width="20" height="17" viewBox="0 0 20 17"><path d="M3.6 3.2 Q6 2 8.2 3" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/><path d="M11.8 3 Q14 2 16.4 3.2" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/><g class="st-eyes"><ellipse cx="6" cy="6.6" rx="1.35" ry="1.75" fill="#120C09"/><ellipse cx="14" cy="6.6" rx="1.35" ry="1.75" fill="#120C09"/><circle cx="6.5" cy="6" r=".45" fill="#fff"/><circle cx="14.5" cy="6" r=".45" fill="#fff"/></g><path d="M5.6 10.6 Q10 14.6 14.4 10.6" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/><path d="M3.4 9.4 Q4.6 15.4 10 15.6 Q15.4 15.4 16.6 9.4" fill="none" stroke="rgba(18,12,9,.32)" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
const FACE_SLEEP = `<div class="st-f" style="width:20px;height:17px;transform-origin:0 0;transform:matrix3d(0,1,0,0,0,0,-1,0,-1,0,0,0,-14.9,-10,21,1)"><svg width="20" height="17" viewBox="0 0 20 17"><path d="M4.4 6.8 Q6 8 7.6 6.8 M12.4 6.8 Q14 8 15.6 6.8" fill="none" stroke="#120C09" stroke-width="1.1" stroke-linecap="round"/><path d="M7 11.6 Q10 13 13 11.6" fill="none" stroke="#1A110C" stroke-width="1.1" stroke-linecap="round"/></svg></div>`;
const CLOCK_SVG = "<svg width=\"38\" height=\"38\" viewBox=\"0 0 38 38\"><circle cx=\"19\" cy=\"19\" r=\"18\" fill=\"#E9ECF2\" stroke=\"#2A3446\" stroke-width=\"2\"/><circle cx=\"19\" cy=\"19\" r=\"15.5\" fill=\"none\" stroke=\"rgba(17,21,28,.22)\" stroke-width=\"1\" stroke-dasharray=\"1 7.1\"/><g class=\"js-hour\"><line x1=\"19\" y1=\"20\" x2=\"19\" y2=\"10.5\" stroke=\"#11151C\" stroke-width=\"2.2\" stroke-linecap=\"round\"/></g><g class=\"js-min\"><line x1=\"19\" y1=\"21\" x2=\"19\" y2=\"6\" stroke=\"#11151C\" stroke-width=\"1.4\" stroke-linecap=\"round\"/></g><circle cx=\"19\" cy=\"19\" r=\"1.6\" fill=\"#4C8DFF\"/></svg>";
const ARROW = {
	back: "↗",
	left: "↖",
	east: "↘",
	south: "↙"
};
const boxHTML = (b) => `<div class="st-box${b.cls ? ` ${b.cls}` : ""}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.d}px;transform:translateZ(${b.z}px)"><div class="st-f" style="width:${b.w}px;height:${b.d}px;transform:translateZ(${b.h}px);background:${b.top};box-shadow:${b.glow}"></div><div class="st-f" style="width:${b.w}px;height:${b.h}px;top:${b.d}px;transform-origin:0 0;transform:rotateX(90deg);background:${b.front}"></div><div class="st-f" style="width:${b.h}px;height:${b.d}px;left:${b.w}px;transform-origin:0 0;transform:rotateY(-90deg);background:${b.side}"></div></div>`;
const decalHTML = (d) => `<div class="st-f ${d.cls || ""}"${d.id ? ` id="${d.id}"` : ""} style="width:${d.w}px;height:${d.h}px;transform-origin:0 0;transform:${d.m};background:${d.bg || "transparent"};border-radius:${d.r || 0};box-shadow:${d.sh || "none"}">${d.html || ""}</div>`;
const bbHTML = (b) => `<div class="st-bb" style="transform:translate3d(${b.x}px,${b.y}px,${b.z}px) rotateZ(-45deg) rotateX(-60deg)">${b.html}</div>`;
const sceneHTML = (c) => c.boxes.map(boxHTML).join("") + c.decals.map(decalHTML).join("") + c.bbs.map(bbHTML).join("");
function partHTML(b) {
	return `<div class="st-box" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.d}px;transform:translateZ(${b.z}px)"><div class="st-in3 ${b.cls}"${b.origin ? ` style="transform-origin:${b.origin}"` : ""}><div class="st-f" style="width:${b.w}px;height:${b.d}px;transform:translateZ(${b.h}px);background:${b.top}"></div><div class="st-f" style="width:${b.w}px;height:${b.h}px;top:${b.d}px;transform-origin:0 0;transform:rotateX(90deg);background:${b.front}"></div><div class="st-f" style="width:${b.w}px;height:${b.h}px;transform-origin:0 0;transform:rotateX(90deg);background:${b.back}"></div><div class="st-f" style="width:${b.h}px;height:${b.d}px;left:${b.w}px;transform-origin:0 0;transform:rotateY(-90deg);background:${b.side}"></div><div class="st-f" style="width:${b.h}px;height:${b.d}px;transform-origin:0 0;transform:rotateY(-90deg);background:${b.back}"></div></div></div>`;
}
function clockMarkup(roomId) {
	const [wall, along, z] = ROOMS[roomId].clock;
	return `<div class="st-f" style="width:38px;height:38px;transform-origin:0 0;transform:${wall === "back" ? `matrix3d(1,0,0,0,0,0,-1,0,0,1,0,0,${along},0.9,${z + 38},1)` : `matrix3d(0,-1,0,0,0,0,-1,0,1,0,0,0,0.9,${along + 38},${z + 38},1)`}">${CLOCK_SVG}</div>`;
}
/** Map one Shubur activity to an existing portfolio room, spot, and pose. */
function mapLifeActivity(activity) {
	const room = ROOMS[activity?.room] ? activity.room : "living";
	const requested = SPOT_FOR_ACTIVITY[activity?.id]?.[room];
	const spotId = requested && ROOMS[room].spots[requested] ? requested : FALLBACK_SPOT[room];
	const spot = ROOMS[room].spots[spotId];
	let outfit = "home";
	if (activity?.id === "sleep") outfit = "sleep";
	else if (activity?.id === "exercise") outfit = "gym";
	else if (activity?.id === "work" || activity?.id === "tinker") outfit = "work";
	const hold = activity?.id === "read" ? "book" : activity?.id === "eat" ? "plate" : "none";
	return {
		room,
		spotId,
		spot,
		pose: spot.pose || "stand",
		outfit,
		hold
	};
}
/** Produce the same source room and wall-clock geometry used by the portfolio renderer. */
function buildRoomMarkup(roomId, phase, objects = INITIAL_OBJECTS) {
	const room = ROOMS[roomId];
	if (!room) throw new Error(`Unknown portfolio room: ${roomId}`);
	return sceneHTML(room.build(phase)) + clockMarkup(roomId) + sceneHTML(room.dyn(objects, phase));
}
/** Project the source room doors into the same CSS overlay coordinates as the portfolio stage. */
function buildDoorMarkup(roomId) {
	const room = ROOMS[roomId];
	if (!room) throw new Error(`Unknown portfolio room: ${roomId}`);
	return room.doors.map((door) => {
		const point = project(...doorPoints(door).label);
		const name = ROOMS[door.to].name;
		return `<div class="st-anchor door" style="left:${point.sx.toFixed(0)}px;top:${point.sy.toFixed(0)}px"><span class="st-door"><span class="ar">${ARROW[door.side]}</span><span class="t">${name}</span></span></div>`;
	}).join("");
}
/** Keep the portfolio's small sleep cue at its original projected bed position. */
function buildSleepMarkup(mapped) {
	if (mapped.room !== "bedroom" || mapped.pose !== "lie") return "";
	const point = project(250, 60, 130);
	return `<div class="st-zz" style="left:${point.sx.toFixed(0)}px;top:${point.sy.toFixed(0)}px"><span>Z</span><span>z</span><span>z</span></div>`;
}
/** Produce the source avatar's box and faceted-cylinder geometry for one mapped pose. */
function buildAgentMarkup(mapped) {
	const figure = buildPerson("agent", mapped.outfit, mapped.pose, mapped.hold);
	return `${mapped.pose === "lie" || figure.headZ === 51 ? "" : "<div class=\"st-f st-blob\" style=\"width:56px;height:56px;transform:translate3d(-28px,-28px,0.4px)\"></div>"}${figure.body.map(partHTML).join("")}${figure.bodyD.map(decalHTML).join("")}<div class="st-headpos ${figure.headCls}" style="transform:translate3d(0,0,${figure.headZ}px)"><div class="st-head3d"><div class="st-nod">${figure.head.map(partHTML).join("")}${figure.headD.map(decalHTML).join("")}${figure.eyes === "closed" ? FACE_SLEEP : FACE}</div></div></div>`;
}
function actorPosition(mapped) {
	const { spot } = mapped;
	if (spot.s === "lie") return {
		x: spot.a[0],
		y: spot.a[1],
		z: 80,
		heading: 0
	};
	if (spot.s) return {
		x: spot.s[0],
		y: spot.s[1],
		z: spot.s[2],
		heading: spot.s[3]
	};
	return {
		x: spot.a[0],
		y: spot.a[1],
		z: 0,
		heading: spot.h ?? 0
	};
}
function visitorTimeZone() {
	try {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		new Intl.DateTimeFormat("en", { timeZone: zone });
		return zone || "UTC";
	} catch {
		return "UTC";
	}
}
function makeLife(clock, timeZone, apartmentType) {
	const startedAt = /* @__PURE__ */ new Date(Math.floor(clock().getTime() / HOUR_MS) * HOUR_MS - 24 * HOUR_MS);
	return createLifeSimulation({
		agentId: "shubur-portfolio-world",
		seed: SAMPLE_SEED,
		apartmentType,
		apartment: {
			...apartmentTypeConfig(apartmentType),
			avatar: {
				name: "Your agent",
				accessories: ["headphones"]
			}
		},
		startedAt,
		timeZone,
		clock
	});
}
function createStage(target) {
	const stage = target.ownerDocument.createElement("div");
	stage.className = "portfolio-world-stage";
	stage.dataset.worldStage = "";
	stage.setAttribute("role", "group");
	stage.setAttribute("aria-label", "Interactive 3D apartment and live agent status");
	stage.innerHTML = `<div class="st-root">
    <div class="st-glow" aria-hidden="true"></div>
    <div aria-hidden="true" style="position:absolute;left:230px;top:560px;width:540px;height:140px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),transparent)"></div>
    <div class="st-view">
      <div class="st-world" aria-hidden="true">
        <div class="st-layer" data-world-static></div>
        <div class="st-layer" data-world-dynamic></div>
        <div class="st-layer" data-world-actor><div class="st-fig" data-agent></div></div>
      </div>
      <div class="st-overlay" data-world-doors aria-hidden="true"></div>
    </div>
  </div>
  <div class="apartment-ui" data-apartment-ui>
    <section class="apt-copy" aria-labelledby="apt-copy-title">
      <p class="apt-kicker">Shubur · a living home</p>
      <h2 id="apt-copy-title">Pick a home. Your agent decides the rest.</h2>
      <p>Studio, starter flat, one-bedroom, high-rise. Every home comes with what's in it: a bed, a kitchenette, a sofa, a shower, a phone. Everything inside is a tool. There's no schedule and no script; your agent chooses what to use and when. Its phone connects it to the Shubur network.</p>
    </section>
    <div class="apt-controls">
      <label>Apartment type<select data-apartment-type></select></label>
      <label>Room<select data-apartment-room></select></label>
    </div>
    <section class="apt-status" aria-live="polite">
      <span>What it's doing right now</span>
      <strong data-current-status></strong>
    </section>
    <div class="apt-hotspots" data-object-hotspots aria-label="Objects and tools in this room"></div>
    <section class="apt-object-detail" data-object-detail aria-live="polite"></section>
  </div>`;
	return stage;
}
function renderAgent(element, mapped) {
	const key = `${mapped.pose}|${mapped.outfit}|${mapped.hold}`;
	if (element.dataset.pose !== key) {
		element.dataset.pose = key;
		element.innerHTML = buildAgentMarkup(mapped);
	}
	const position = actorPosition(mapped);
	const transform = mapped.pose === "lie" ? `matrix3d(0,0,-1,0,1,0,0,0,0,-1,0,0,${position.x.toFixed(1)},${position.y.toFixed(1)},${position.z},1) scale3d(${FIG_SCALE},${FIG_SCALE},${FIG_SCALE})` : `translate3d(${position.x.toFixed(1)}px,${position.y.toFixed(1)}px,${position.z}px) rotateZ(${position.heading.toFixed(1)}deg) scale3d(${FIG_SCALE},${FIG_SCALE},${FIG_SCALE})`;
	element.style.transform = transform;
	element.style.display = "";
	element.classList.toggle("lying", mapped.pose === "lie");
}
function roomColors(roomId) {
	return {
		studio: ["#151d2a", "#26364c"],
		living: ["#261d1a", "#49382e"],
		kitchen: ["#1b222b", "#394656"],
		bedroom: ["#1b2030", "#393952"],
		bathroom: ["#1b252e", "#39525a"],
		gym: ["#171b21", "#333943"]
	}[roomId] ?? ["#151d2a", "#26364c"];
}
function objectPosition(object) {
	return {
		x: 60 + object.x * 4.8,
		y: 60 + object.y * 4.8
	};
}
function drawApartmentObject(c, object, selectedId, activity) {
	const { x, y } = objectPosition(object);
	const active = activity.objectId === `prop-${object.id}` || selectedId === object.id;
	const wood = "#624831";
	const pale = "#d7d5ce";
	c.shadow(x - 96, y - 64, 192, 128);
	if (active) c.glowAt(x, y, 92, .16);
	switch (object.kind) {
		case "bed":
			c.B(x - 86, y - 56, 172, 112, 0, 18, "#413128", { top: "#6b5037" });
			c.B(x - 78, y - 48, 156, 96, 18, 15, pale, { top: "#ece8df" });
			c.B(x - 73, y - 43, 52, 32, 33, 7, "#f5f1e9", { top: "#ffffff" });
			c.B(x - 15, y - 42, 86, 88, 32, 5, active ? "#8ba9ff" : "#596b91", { top: active ? "#a9b8ff" : "#7586ac" });
			c.B(x - 86, y + 52, 12, 10, -4, 20, wood);
			c.B(x + 74, y + 52, 12, 10, -4, 20, wood);
			break;
		case "sofa":
			c.B(x - 80, y - 45, 160, 92, 0, 28, "#5a4032", { top: "#765744" });
			c.B(x - 72, y - 42, 144, 18, 28, 54, "#6b4c39", { top: "#8a6349" });
			c.B(x - 72, y - 20, 68, 57, 28, 16, active ? "#7183b2" : "#596b91", { top: "#8499c8" });
			c.B(x + 4, y - 20, 68, 57, 28, 16, active ? "#7183b2" : "#596b91", { top: "#8499c8" });
			c.B(x - 88, y - 38, 16, 82, 8, 42, "#765744");
			c.B(x + 72, y - 38, 16, 82, 8, 42, "#765744");
			break;
		case "desk":
			c.B(x - 76, y - 37, 152, 82, 58, 8, "#775639", { top: "#a37a50" });
			c.B(x - 66, y - 30, 9, 68, 0, 58, wood);
			c.B(x + 57, y - 30, 9, 68, 0, 58, wood);
			c.B(x - 23, y - 26, 58, 8, 69, 43, "#17202c", {
				front: "#202e3a",
				side: "#111820"
			});
			c.B(x - 18, y - 21, 48, 3, 112, 2, "#8cced2", {
				front: "#8cced2",
				side: "#8cced2"
			});
			break;
		case "island":
			c.B(x - 82, y - 44, 164, 88, 0, 68, "#75634f", { top: "#b6a88f" });
			c.B(x - 92, y - 54, 184, 108, 68, 10, "#c9c3b6", { top: "#e4e0d7" });
			c.B(x - 49, y - 22, 54, 34, 79, 2, "#94aab0", { top: "#607780" });
			c.B(x - 3, y - 18, 4, 26, 80, 25, "#a5b1b5");
			break;
		case "sink":
			c.B(x - 56, y - 35, 112, 70, 0, 58, "#625041", { top: "#bcb2a1" });
			c.B(x - 48, y - 27, 96, 54, 58, 7, "#e5e3dd", { top: "#f5f3ee" });
			c.B(x - 22, y - 13, 44, 26, 65, 2, "#6f8993", { top: "#b8cdd2" });
			c.B(x + 28, y - 23, 4, 18, 66, 22, "#aab6b8");
			break;
		case "shower":
			c.B(x - 66, y - 52, 132, 104, 0, 7, "#66777a", { top: "#46575c" });
			c.B(x - 60, y - 46, 120, 94, 7, 2, "rgba(155,210,220,.35)", {
				top: "rgba(155,210,220,.18)",
				front: "rgba(155,210,220,.24)",
				side: "rgba(155,210,220,.22)"
			});
			c.B(x - 62, y - 46, 6, 94, 9, 142, "#a9bdc3");
			c.B(x + 56, y - 46, 6, 94, 9, 142, "#a9bdc3");
			c.B(x - 62, y - 46, 124, 5, 146, 7, "#a9bdc3");
			break;
		case "phone":
			c.B(x - 19, y - 30, 38, 60, 0, 8, "#111823");
			c.B(x - 14, y - 24, 28, 48, 8, 2, "#74c5d0", { top: "linear-gradient(145deg,#b2edf0,#4c8294)" });
			c.B(x - 8, y - 17, 16, 3, 10, 2, "#355c70");
			c.B(x - 8, y - 9, 16, 3, 10, 2, "#355c70");
			c.B(x - 8, y - 1, 16, 3, 10, 2, "#355c70");
			break;
		case "bookshelf":
			c.B(x - 58, y - 32, 116, 64, 0, 164, "#503a2b", { top: "#77583d" });
			for (let level = 0; level < 3; level += 1) {
				c.B(x - 51, y - 28, 102, 4, 36 + level * 40, 4, "#a88457");
				for (let book = 0; book < 5; book += 1) c.B(x - 43 + book * 18, y - 22, 11, 30, 40 + level * 40, 26 + book % 2 * 5, [
					"#47647a",
					"#b77853",
					"#7884ad",
					"#547565",
					"#b0966a"
				][book]);
			}
			break;
		case "weights":
			c.B(x - 3, y - 52, 6, 104, 26, 5, "#b8c2d0", { top: "#d6dde7" });
			c.B(x - 23, y - 48, 17, 10, 7, 42, "#232b37");
			c.B(x + 6, y + 38, 17, 10, 7, 42, "#232b37");
			c.B(x - 35, y - 51, 10, 16, 4, 50, "#38485d");
			c.B(x + 25, y + 35, 10, 16, 4, 50, "#38485d");
			break;
		case "mat":
			c.B(x - 66, y - 38, 132, 76, 0, 3, active ? "#9b8bcd" : "#655a86", { top: "repeating-linear-gradient(45deg,#736993 0 4px,#62587f 4px 8px)" });
			break;
		default: c.B(x - 42, y - 32, 84, 64, 0, 42, "#72553b", { top: "#a5835d" });
	}
}
function buildApartmentRoomMarkup(typeId, roomId, phase, activity, selectedId) {
	const c = collector();
	const [floor, wall] = roomColors(roomId);
	c.B(0, 0, 600, 600, -30, 30, floor, { top: `repeating-linear-gradient(90deg,rgba(220,230,245,.035) 0 1px,transparent 1px 72px),repeating-linear-gradient(0deg,rgba(220,230,245,.035) 0 1px,transparent 1px 72px),${floor}` });
	c.B(0, -14, 600, 14, 0, 230, wall, { front: `linear-gradient(180deg,${wall},#0e141f)` });
	c.B(-14, -14, 14, 614, 0, 230, wall, { side: `linear-gradient(90deg,${wall},#0e141f)` });
	const sky = phase === "night" || phase === "evening" ? "linear-gradient(#101932,#263352)" : "linear-gradient(#8bb5e0,#d3e3ed)";
	c.yPlane(310, .8, 68, 185, 118, sky, { sh: "inset 0 0 0 5px #313c51, inset 0 0 0 8px rgba(190,215,230,.45)" });
	c.B(308, 0, 190, 8, 183, 5, "#323e53");
	c.floor(116, 270, 362, 250, .5, "repeating-linear-gradient(45deg,rgba(169,184,255,.045) 0 2px,transparent 2px 8px),#172131", {
		r: "9px",
		sh: "inset 0 0 0 7px #172131,inset 0 0 0 8px rgba(169,184,255,.16)"
	});
	const objects = APARTMENT_TYPES[typeId].objects.filter((object) => object.room === roomId);
	for (const object of objects) drawApartmentObject(c, object, selectedId, activity);
	return {
		markup: sceneHTML(c),
		objects
	};
}
function mapApartmentActivity(typeId, roomId, activity) {
	const type = APARTMENT_TYPES[typeId];
	const target = type.objects.find((object) => activity.objectId === `prop-${object.id}` && object.room === roomId) ?? type.objects.find((object) => object.room === roomId && object.kind !== "phone") ?? type.objects.find((object) => object.room === roomId);
	const pose = {
		sleep: "lie",
		relax: "bedsit",
		eat: "counter",
		work: "desk",
		read: "bedsit",
		exercise: "stretch",
		wash: "wash",
		groom: "sink",
		tend: "stand",
		gaze: "stand",
		tinker: "desk",
		idle: "stand"
	}[activity.id] ?? "stand";
	const position = target ? objectPosition(target) : {
		x: 300,
		y: 390
	};
	const x = position.x - (pose === "lie" ? 0 : 64);
	const y = position.y + (pose === "lie" ? 12 : 70);
	return {
		room: roomId,
		spotId: target?.id ?? "center",
		spot: {
			a: [x, y],
			...pose === "lie" ? { s: "lie" } : pose === "bedsit" ? { s: [
				x,
				y,
				42,
				-90
			] } : {},
			pose
		},
		pose,
		outfit: activity.id === "sleep" ? "sleep" : activity.id === "exercise" ? "gym" : activity.id === "work" || activity.id === "tinker" ? "work" : "home",
		hold: activity.id === "read" ? "book" : activity.id === "eat" ? "plate" : "none"
	};
}
function currentHour(timeZone, now) {
	const parts = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		hourCycle: "h23",
		timeZone
	}).formatToParts(now);
	return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}
function escapeHtml(value) {
	return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderObjectDetail(stage, object, environment, life, state, scopes, timeZone, now) {
	const detail = stage.querySelector("[data-object-detail]");
	if (!object) {
		detail.replaceChildren();
		return;
	}
	const lifeObject = environment.objects.find((item) => item.id === `prop-${object.id}`);
	if (!lifeObject) {
		detail.replaceChildren();
		return;
	}
	const roomWorld = {
		location: state.objects[lifeObject.id]?.room ?? object.room,
		objects: state.objects
	};
	const localTools = availableTools({
		environment,
		world: roomWorld,
		hour: currentHour(timeZone, now)
	}).filter((tool) => tool.objectId === lifeObject.id).map((tool) => tool.verb);
	const networkTools = lifeObject.kind === "phone" ? availablePhoneTools(environment, scopes).map((tool) => `${tool.action.replaceAll("_", " ")} · ${tool.requiredScope}`) : [];
	const tools = [.../* @__PURE__ */ new Set([...localTools, ...networkTools])];
	detail.innerHTML = `<strong>${escapeHtml(object.label)}</strong><span>${escapeHtml(lifeObject.size)} · capacity ${lifeObject.capacity}${lifeObject.carryable ? " · can be carried" : ""}</span><span>Tools: ${tools.length ? tools.map(escapeHtml).join(", ") : "no available tools right now"}</span>${lifeObject.hints.length ? `<span class="apt-hint">${escapeHtml(lifeObject.hints.map((hint) => hint.note).join(" · "))}</span>` : ""}`;
}
function renderHud(stage, typeId, roomId, state, life, timeZone, now, selectedId, onSelection) {
	const typeSelect = stage.querySelector("[data-apartment-type]");
	if (!typeSelect.options.length) typeSelect.innerHTML = Object.values(APARTMENT_TYPES).map((type) => `<option value="${type.id}">${escapeHtml(type.label)}</option>`).join("");
	typeSelect.value = typeId;
	const type = APARTMENT_TYPES[typeId];
	const roomSelect = stage.querySelector("[data-apartment-room]");
	const roomOptions = type.rooms.map((room) => `<option value="${room.id}">${escapeHtml(room.name)}</option>`).join("");
	if (roomSelect.dataset.type !== typeId) {
		roomSelect.dataset.type = typeId;
		roomSelect.innerHTML = roomOptions;
	}
	roomSelect.value = roomId;
	const currentRoom = type.rooms.find((room) => room.id === state.currentActivity.room)?.name ?? type.rooms.find((room) => room.id === type.startRoom)?.name;
	const status = stage.querySelector("[data-current-status]");
	status.textContent = `${state.currentActivity.caption} · ${currentRoom}`;
	const hotspotLayer = stage.querySelector("[data-object-hotspots]");
	const { objects } = buildApartmentRoomMarkup(typeId, roomId, "afternoon", state.currentActivity, selectedId);
	hotspotLayer.innerHTML = objects.map((object) => {
		const pos = objectPosition(object);
		const projected = project(pos.x, pos.y, object.kind === "phone" ? 100 : 158);
		return `<button type="button" class="apt-hotspot${object.id === selectedId ? " is-selected" : ""}" data-object-id="${escapeHtml(object.id)}" aria-pressed="${object.id === selectedId}" style="left:${(projected.sx / STAGE_W * 100).toFixed(2)}%;top:${(projected.sy / 720 * 100).toFixed(2)}%">${escapeHtml(object.label)}</button>`;
	}).join("");
	hotspotLayer.querySelectorAll("[data-object-id]").forEach((button) => button.addEventListener("click", () => onSelection(button.dataset.objectId)));
	renderObjectDetail(stage, objects.find((item) => item.id === selectedId) ?? objects[0], life.getEnvironment(), life, state, DEMO_SCOPES, timeZone, now);
}
function render(stage, life, clock, ui, last, reducedMotion) {
	const now = clock();
	const state = life.advanceTo(now);
	const activity = state.currentActivity;
	const date = new Date(now);
	const sun = sunTimes(date.getFullYear(), date.getMonth() + 1, date.getDate());
	const phase = phaseAt(date.getHours() * 60 + date.getMinutes(), sun);
	const type = APARTMENT_TYPES[ui.typeId];
	if (ui.followActivityRoom && type.rooms.some((room) => room.id === activity.room)) ui.roomId = activity.room;
	if (!type.rooms.some((room) => room.id === ui.roomId)) ui.roomId = type.startRoom;
	const objects = type.objects.filter((object) => object.room === ui.roomId);
	if (!objects.some((object) => object.id === ui.selectedId)) ui.selectedId = objects[0]?.id;
	const signature = `${ui.typeId}|${ui.roomId}|${phase}|${activity.id}|${activity.objectId ?? ""}|${ui.selectedId ?? ""}`;
	stage.querySelector(".st-root").classList.toggle("still", reducedMotion.matches);
	const staticLayer = stage.querySelector("[data-world-static]");
	const dynamicLayer = stage.querySelector("[data-world-dynamic]");
	const actorLayer = stage.querySelector("[data-world-actor]");
	if (last.signature !== signature) {
		staticLayer.innerHTML = buildApartmentRoomMarkup(ui.typeId, ui.roomId, phase, activity, ui.selectedId).markup;
		dynamicLayer.replaceChildren();
		actorLayer.replaceChildren();
		if (activity.room === ui.roomId) {
			const mapped = mapApartmentActivity(ui.typeId, ui.roomId, activity);
			const actor = stage.ownerDocument.createElement("div");
			actor.className = "st-fig";
			actor.dataset.agent = "";
			actorLayer.append(actor);
			renderAgent(actor, mapped);
		}
		last.signature = signature;
	}
	renderHud(stage, ui.typeId, ui.roomId, state, life, ui.timeZone, now, ui.selectedId, (id) => {
		ui.selectedId = id;
		last.signature = "";
		render(stage, life, clock, ui, last, reducedMotion);
	});
	return state;
}
/** Starts the lazy-loaded portfolio house in a Shubur landing-page mount. */
function startPortfolioWorld(target) {
	const media = matchMedia("(prefers-reduced-motion: reduce)");
	const clock = () => /* @__PURE__ */ new Date();
	const timeZone = visitorTimeZone();
	const ui = {
		typeId: "studio",
		roomId: APARTMENT_TYPES.studio.startRoom,
		selectedId: "phone",
		timeZone,
		followActivityRoom: true
	};
	let life = makeLife(clock, timeZone, ui.typeId);
	let timer;
	let resizeListener;
	let resizeObserver;
	const stage = createStage(target);
	const last = { signature: "" };
	target.replaceChildren(stage);
	const typeSelect = stage.querySelector("[data-apartment-type]");
	const roomSelect = stage.querySelector("[data-apartment-room]");
	const update = () => render(stage, life, clock, ui, last, media);
	const handleTypeChange = () => {
		ui.typeId = typeSelect.value;
		ui.roomId = APARTMENT_TYPES[ui.typeId].startRoom;
		ui.followActivityRoom = true;
		ui.selectedId = APARTMENT_TYPES[ui.typeId].objects.find((object) => object.room === ui.roomId)?.id;
		life = makeLife(clock, timeZone, ui.typeId);
		last.signature = "";
		update();
	};
	const handleRoomChange = () => {
		ui.roomId = roomSelect.value;
		ui.followActivityRoom = false;
		ui.selectedId = APARTMENT_TYPES[ui.typeId].objects.find((object) => object.room === ui.roomId)?.id;
		last.signature = "";
		update();
	};
	const handleMotion = () => {
		stage.querySelector(".st-root")?.classList.toggle("still", media.matches);
	};
	typeSelect.addEventListener("change", handleTypeChange);
	roomSelect.addEventListener("change", handleRoomChange);
	media.addEventListener?.("change", handleMotion);
	const scale = () => {
		const root = stage.querySelector(".st-root");
		const width = stage.clientWidth;
		root.style.transform = `scale(${width / STAGE_W})`;
		root.classList.toggle("compact", width < 760);
	};
	scale();
	if ("ResizeObserver" in window) {
		resizeObserver = new ResizeObserver(scale);
		resizeObserver.observe(stage);
	} else {
		resizeListener = scale;
		window.addEventListener("resize", resizeListener);
	}
	update();
	timer = setInterval(update, 3e4);
	return { destroy() {
		clearInterval(timer);
		resizeObserver?.disconnect();
		if (resizeListener) window.removeEventListener("resize", resizeListener);
		media.removeEventListener?.("change", handleMotion);
		typeSelect.removeEventListener("change", handleTypeChange);
		roomSelect.removeEventListener("change", handleRoomChange);
		target.replaceChildren();
	} };
}

export { buildAgentMarkup, buildApartmentRoomMarkup, buildDoorMarkup, buildRoomMarkup, buildSleepMarkup, createStage, mapLifeActivity, startPortfolioWorld };