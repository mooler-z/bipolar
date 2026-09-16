/**
 * A hundred things people own, and cannot agree about.
 *
 * `seedTopics.ts` is the evergreen half — pineapple, tabs, coriander.
 * `seedWorldTopics.ts` is named subjects across the world, and
 * `seedPeopleTopics.ts` is named living people. This is the fourth kind, and
 * it exists because the other three had drifted into one: three quarters of
 * the catalogue was a name and a question mark, and a feed cannot be
 * interesting about anything it does not have.
 *
 * **Objects, not their makers.** "Cybertruck" is a thing somebody can picture
 * and has an opinion about; "Tesla" is a share price and an argument about one
 * man. Where a company is the product — IKEA, Lego, Nespresso — it is named as
 * the thing you buy rather than the firm you own shares in.
 *
 * `k` is where the thing comes *from*, which is what feeds the atlas: a room
 * that loves the Corolla and hates the Cybertruck is a room saying something
 * about Japan and America, and a nation's lean across those becomes its
 * verdict on that country.
 *
 * `w` is an English Wikipedia article title. Every one of the hundred was
 * checked against the live API for a lead image before this file was
 * committed; a title that later loses its picture costs one wasted lookup and
 * leaves the topic as clean type, which is the failure this was designed to
 * survive.
 *
 * `f` is roughly the share of a worldwide audience that would press LOVE. Used
 * only by the demo seed, never by the product.
 *
 * A few questions read a word longer than they want to — "The iPhone?" rather
 * than "iPhone?". That is the importer's floor of eight characters, and it is
 * a good floor: a question that short is usually a noun somebody forgot to
 * finish. It applies to a prepared batch exactly as it applies to the crawler.
 */

export type ProductSeed = {
  q: string;
  c: string;
  /** ISO 3166-1 alpha-2 where the thing is from, or null where it is nobody's. */
  k: string | null;
  d: string;
  t: string[];
  w: string;
  f: number;
};

export const PRODUCT_TOPICS: readonly ProductSeed[] = [
  // ── Phones, and the things bolted to them ───────────────────────────────
  { q: "The iPhone?", c: "tech", k: "US", d: "Apple's phone: the most profitable consumer product ever made, and a walled garden.", t: ["phones", "apple"], w: "IPhone", f: 58 },
  { q: "Samsung Galaxy S series?", c: "tech", k: "KR", d: "Android's flagship answer to the iPhone, stuffed with features nobody asked for.", t: ["phones", "samsung"], w: "Samsung Galaxy S25", f: 56 },
  { q: "Google Pixel?", c: "tech", k: "US", d: "The phone Google builds to show what its software can do with a camera.", t: ["phones", "google"], w: "Google Pixel", f: 60 },
  { q: "Huawei phones?", c: "tech", k: "CN", d: "Excellent hardware, banned from Google's services, and a geopolitical argument in a pocket.", t: ["phones", "china"], w: "Huawei", f: 42 },
  { q: "Xiaomi phones?", c: "tech", k: "CN", d: "Flagship specifications at half the price, funded by ads in the operating system.", t: ["phones", "china"], w: "Xiaomi", f: 52 },
  { q: "Nothing Phone?", c: "tech", k: "GB", d: "A transparent back and blinking lights, from ex-OnePlus people betting on style.", t: ["phones", "design"], w: "Nothing Phone (1)", f: 50 },
  { q: "Folding phones?", c: "tech", k: null, d: "A tablet that fits in a pocket, with a crease down the middle and a price to match.", t: ["phones", "hardware"], w: "Foldable smartphone", f: 45 },
  { q: "BlackBerry?", c: "tech", k: "CA", d: "The keyboard phone that ran business until the touchscreen ended it.", t: ["phones", "nostalgia"], w: "BlackBerry", f: 55 },
  { q: "Nokia 3310?", c: "tech", k: "FI", d: "A week of battery, no apps, and a brick you could drop off a building.", t: ["phones", "nostalgia"], w: "Nokia 3310", f: 72 },
  { q: "Phone cases?", c: "life", k: null, d: "A thousand-dollar design, wrapped in rubber the day it arrives.", t: ["phones", "accessories"], w: "Mobile phone accessories", f: 48 },
  // ── Computers, and what runs on them ────────────────────────────────────
  { q: "MacBook?", c: "tech", k: "US", d: "Apple's laptop: a trackpad nobody has beaten, on a machine you cannot upgrade.", t: ["computers", "apple"], w: "MacBook (2015–2019)", f: 62 },
  { q: "ThinkPad?", c: "tech", k: "CN", d: "The red nub, the matte black, and a keyboard the rest of the industry gave up on.", t: ["computers", "lenovo"], w: "ThinkPad", f: 70 },
  { q: "Chromebooks?", c: "tech", k: "US", d: "A browser with a lid, sold to schools by the million.", t: ["computers", "google"], w: "Chromebook Pixel", f: 42 },
  { q: "Gaming PCs?", c: "gaming", k: null, d: "Glass, RGB and a graphics card that costs more than the rest of it together.", t: ["computers", "gaming"], w: "Gaming computer", f: 62 },
  { q: "Steam Deck?", c: "gaming", k: "US", d: "A handheld PC that runs your whole library, if you are willing to tinker.", t: ["gaming", "handheld"], w: "Steam Deck", f: 72 },
  { q: "Raspberry Pi?", c: "tech", k: "GB", d: "A computer the size of a card that started a generation of tinkerers.", t: ["computers", "diy"], w: "Raspberry Pi", f: 78 },
  { q: "Mechanical keyboards?", c: "tech", k: null, d: "A hobby that sounds like a typewriter and costs like a laptop.", t: ["computers", "keyboards"], w: "Keyboard technology", f: 60 },
  { q: "Apple Silicon?", c: "tech", k: "US", d: "The chips that made laptops silent and fast, and locked the platform tighter.", t: ["computers", "apple"], w: "Apple silicon", f: 68 },
  { q: "NVIDIA graphics cards?", c: "tech", k: "US", d: "The company that owns AI's picks and shovels, priced accordingly.", t: ["computers", "nvidia"], w: "Nvidia", f: 52 },
  { q: "Windows 11?", c: "tech", k: "US", d: "A centred taskbar, adverts in the start menu, and a hardware check nobody wanted.", t: ["software", "microsoft"], w: "Microsoft", f: 38 },
  { q: "Linux on the desktop?", c: "tech", k: null, d: "Free, fast, yours — and still explaining itself to everybody else.", t: ["software", "open-source"], w: "Linux", f: 64 },
  // ── Cars, and the argument about what they cost everybody else ──────────
  { q: "Tesla Model 3?", c: "tech", k: "US", d: "The car that made electric normal, with panel gaps and a CEO attached.", t: ["cars", "electric"], w: "Tesla Model 3", f: 52 },
  { q: "Cybertruck?", c: "tech", k: "US", d: "A stainless-steel wedge that looks like a polygon budget ran out.", t: ["cars", "electric"], w: "Tesla Cybertruck", f: 35 },
  { q: "BYD cars?", c: "business", k: "CN", d: "The Chinese carmaker that outsold Tesla, and half of Europe wants tariffs on.", t: ["cars", "china"], w: "BYD Auto", f: 50 },
  { q: "Toyota Corolla?", c: "life", k: "JP", d: "The best-selling car in history, and the least exciting object ever engineered.", t: ["cars", "japan"], w: "Toyota Corolla", f: 66 },
  { q: "Toyota Hilux?", c: "life", k: "JP", d: "The pickup that refuses to die, in every conflict zone and farm on earth.", t: ["cars", "japan"], w: "Toyota Hilux", f: 72 },
  { q: "Porsche 911?", c: "life", k: "DE", d: "The engine is in the wrong place and it has been right for sixty years.", t: ["cars", "germany"], w: "Porsche 911", f: 74 },
  { q: "Jeep Wrangler?", c: "life", k: "US", d: "Unstoppable off-road, miserable on it, and a personality for some owners.", t: ["cars", "usa"], w: "Jeep Wrangler", f: 58 },
  { q: "Land Rover Defender?", c: "life", k: "GB", d: "A farm tool turned luxury statement, at four times the price.", t: ["cars", "britain"], w: "Land Rover Defender", f: 60 },
  { q: "Volkswagen Golf GTI?", c: "life", k: "DE", d: "The hot hatch that invented the category and still argues about touch controls.", t: ["cars", "germany"], w: "Volkswagen Golf", f: 68 },
  { q: "Giant SUVs?", c: "climate", k: null, d: "Heavier, thirstier and deadlier to pedestrians — and most of what anybody buys.", t: ["cars", "climate"], w: "Sport utility vehicle", f: 35 },
  { q: "Pickup trucks?", c: "life", k: "US", d: "America's best-selling vehicle, and a bed most owners never load.", t: ["cars", "usa"], w: "Pickup truck", f: 45 },
  { q: "Electric vehicles?", c: "climate", k: null, d: "Cleaner to run, filthier to build, and only as green as the grid behind them.", t: ["cars", "climate"], w: "Electric car", f: 62 },
  // ── Sound ───────────────────────────────────────────────────────────────
  { q: "Self-driving cars?", c: "ai", k: null, d: "Software taking the wheel, one recall and one lawsuit at a time.", t: ["cars", "ai"], w: "Waymo", f: 45 },
  { q: "AirPods?", c: "tech", k: "US", d: "White stems everywhere, brilliant on Apple things and disposable by design.", t: ["audio", "apple"], w: "AirPods", f: 58 },
  { q: "Noise-cancelling headphones?", c: "tech", k: null, d: "Silence on a plane, and the faint unease of not hearing the room.", t: ["audio", "headphones"], w: "Noise-cancelling headphones", f: 76 },
  { q: "Vinyl records?", c: "music", k: null, d: "Warmer, they say, on a format that outsells CDs again at four times the price.", t: ["audio", "music"], w: "Phonograph record", f: 66 },
  { q: "Bluetooth speakers?", c: "music", k: null, d: "Portable sound, and somebody else's playlist on every beach on earth.", t: ["audio", "speakers"], w: "Bluetooth", f: 48 },
  { q: "Turntables?", c: "music", k: null, d: "A ritual, a stylus and a room that has to be quiet.", t: ["audio", "music"], w: "Turntablism", f: 60 },
  { q: "PlayStation 5?", c: "gaming", k: "JP", d: "Sony's console: the exclusives, the size of a small radiator.", t: ["gaming", "sony"], w: "PlayStation 5", f: 70 },
  // ── Games, and the boxes that play them ─────────────────────────────────
  { q: "Xbox Series X?", c: "gaming", k: "US", d: "The most powerful box with the thinnest reason to own one.", t: ["gaming", "microsoft"], w: "Xbox Series X and Series S", f: 58 },
  { q: "Nintendo Switch?", c: "gaming", k: "JP", d: "Underpowered, overpriced joy-cons, and the best games of the decade.", t: ["gaming", "nintendo"], w: "Nintendo Switch", f: 80 },
  { q: "Game Boy?", c: "gaming", k: "JP", d: "Four shades of green, four AA batteries, and Tetris on the school bus.", t: ["gaming", "nostalgia"], w: "Game Boy", f: 84 },
  { q: "Nintendo 64?", c: "gaming", k: "JP", d: "Three-pronged controller, blurry textures, four players on one sofa.", t: ["gaming", "nostalgia"], w: "Nintendo 64", f: 80 },
  { q: "Virtual reality headsets?", c: "gaming", k: null, d: "Astonishing for twenty minutes, then a drawer for two years.", t: ["gaming", "vr"], w: "Virtual reality headset", f: 45 },
  { q: "Apple Vision Pro?", c: "tech", k: "US", d: "The finest display anybody has strapped to a face, at the price of a car deposit.", t: ["vr", "apple"], w: "Apple Vision Pro", f: 38 },
  { q: "Meta Quest?", c: "gaming", k: "US", d: "VR that actually sold, tied to an account most buyers resent.", t: ["vr", "meta"], w: "Meta Quest", f: 48 },
  { q: "Loot boxes?", c: "gaming", k: null, d: "Gambling for children, regulated in some countries and shipped everywhere.", t: ["gaming", "monetisation"], w: "Loot box", f: 12 },
  { q: "DJI drones?", c: "tech", k: "CN", d: "The best flying cameras made, and a national-security file in several capitals.", t: ["cameras", "drones"], w: "DJI", f: 55 },
  // ── Cameras ─────────────────────────────────────────────────────────────
  { q: "Fujifilm X100?", c: "culture", k: "JP", d: "A fixed lens, film simulations, and a waiting list because of TikTok.", t: ["cameras", "fujifilm"], w: "Fujifilm X100V", f: 74 },
  { q: "Polaroid cameras?", c: "culture", k: "US", d: "One shot, no retakes, and film that costs two dollars a frame.", t: ["cameras", "film"], w: "Polaroid camera", f: 68 },
  { q: "Canon DSLRs?", c: "culture", k: "JP", d: "The workhorse a generation learned on, being retired for mirrorless.", t: ["cameras", "canon"], w: "Canon EOS", f: 68 },
  { q: "Apple Watch?", c: "health", k: "US", d: "A health monitor that has saved lives, and another screen on your wrist.", t: ["wearables", "apple"], w: "Apple Watch", f: 60 },
  // ── Things worn ─────────────────────────────────────────────────────────
  { q: "Oura Ring?", c: "health", k: "FI", d: "Sleep scores on your finger, at a subscription for your own data.", t: ["wearables", "health"], w: "Smart ring", f: 48 },
  { q: "Garmin watches?", c: "sport", k: "US", d: "Ugly, unkillable, and the only thing runners actually trust.", t: ["wearables", "running"], w: "Garmin", f: 72 },
  { q: "Smart glasses?", c: "tech", k: null, d: "A camera on somebody's face, in a room that did not consent.", t: ["wearables", "privacy"], w: "Smartglasses", f: 30 },
  { q: "Fitness trackers?", c: "health", k: null, d: "A number for everything you do, and guilt when you miss it.", t: ["wearables", "health"], w: "Activity tracker", f: 52 },
  { q: "Dyson vacuums?", c: "life", k: "GB", d: "Engineering as theatre, at four times what a vacuum should cost.", t: ["appliances", "dyson"], w: "Dyson (company)", f: 60 },
  { q: "Robot vacuums?", c: "life", k: null, d: "Cleaning while you are out, and mapping your house while it does.", t: ["appliances", "robots"], w: "Robotic vacuum cleaner", f: 62 },
  // ── Kitchens, and the machines in them ──────────────────────────────────
  { q: "Air fryers?", c: "food", k: null, d: "A small convection oven that conquered kitchens and counter space.", t: ["appliances", "cooking"], w: "Air fryer", f: 70 },
  { q: "Nespresso pods?", c: "food", k: "CH", d: "Good coffee, fast, in aluminium nobody recycles.", t: ["appliances", "coffee"], w: "Nespresso", f: 45 },
  { q: "Instant Pot?", c: "food", k: "CA", d: "Seven appliances in one, and a company that went bankrupt anyway.", t: ["appliances", "cooking"], w: "Instant Pot", f: 68 },
  { q: "Smart fridges?", c: "life", k: null, d: "A tablet on a door that will stop getting updates before the fridge dies.", t: ["appliances", "smart-home"], w: "Refrigerator", f: 28 },
  { q: "Cast iron pans?", c: "food", k: null, d: "Heavy, indestructible, and an internet argument about washing up.", t: ["cooking", "kitchen"], w: "Cast-iron cookware", f: 78 },
  { q: "Non-stick pans?", c: "food", k: null, d: "Effortless eggs, a scratched surface, and a chemistry debate.", t: ["cooking", "kitchen"], w: "Non-stick surface", f: 50 },
  { q: "ChatGPT?", c: "ai", k: "US", d: "The fastest-adopted product in history, and everybody's homework.", t: ["ai", "openai"], w: "ChatGPT", f: 58 },
  { q: "Amazon Alexa?", c: "tech", k: "US", d: "A speaker that answers questions and listens to the rest of it.", t: ["smart-home", "amazon"], w: "Amazon Alexa", f: 42 },
  { q: "Ring doorbells?", c: "tech", k: "US", d: "A camera on every porch, sharing with police departments by default.", t: ["smart-home", "privacy"], w: "Ring (company)", f: 32 },
  // ── Houses that listen ──────────────────────────────────────────────────
  { q: "Smart thermostats?", c: "climate", k: null, d: "Lower bills, learned habits, and your heating in a subscription.", t: ["smart-home", "energy"], w: "Smart thermostat", f: 62 },
  { q: "The Kindle?", c: "culture", k: "US", d: "A library in a pocket, on a device that can delete your books.", t: ["reading", "amazon"], w: "Amazon Kindle", f: 68 },
  { q: "E-ink tablets?", c: "culture", k: null, d: "Paper that syncs, at the price of an iPad and none of the speed.", t: ["reading", "hardware"], w: "Electronic paper", f: 58 },
  { q: "Printers?", c: "work", k: null, d: "The last device that can still ruin a morning, and subscription ink.", t: ["office", "frustration"], w: "Printer (computing)", f: 18 },
  { q: "Fax machines?", c: "work", k: null, d: "Still legally required in hospitals and German offices in 2026.", t: ["office", "legacy"], w: "Fax", f: 22 },
  // ── Reading, and the desks it happens at ────────────────────────────────
  { q: "Standing desks?", c: "work", k: null, d: "Better than sitting all day, worse than the posts about them suggest.", t: ["office", "health"], w: "Standing desk", f: 58 },
  { q: "Herman Miller Aeron chair?", c: "work", k: "US", d: "Fifteen hundred dollars of mesh that your spine will thank you for.", t: ["office", "furniture"], w: "Aeron chair", f: 66 },
  { q: "Open-plan offices?", c: "work", k: null, d: "Cheaper per head, louder per hour, and hated by everyone in them.", t: ["office", "work"], w: "Open plan", f: 20 },
  { q: "IKEA furniture?", c: "life", k: "SE", d: "Flat-packed, allen-keyed, and in half the homes on earth.", t: ["furniture", "ikea"], w: "IKEA", f: 68 },
  { q: "Wearing Crocs?", c: "culture", k: "US", d: "Objectively hideous, undeniably comfortable, and back in fashion.", t: ["fashion", "shoes"], w: "Clog", f: 48 },
  { q: "Air Jordans?", c: "sport", k: "US", d: "A basketball shoe that became a currency, resold before it is worn.", t: ["fashion", "shoes"], w: "Sneaker collecting", f: 68 },
  { q: "Birkenstocks?", c: "culture", k: "DE", d: "Cork footbeds, decades of mockery, and a luxury listing in Paris.", t: ["fashion", "shoes"], w: "Sandal", f: 58 },
  // ── Worn out of the house ───────────────────────────────────────────────
  { q: "Fast fashion?", c: "climate", k: null, d: "A new outfit for the price of lunch, and a landfill in Ghana.", t: ["fashion", "climate"], w: "Fast fashion", f: 22 },
  { q: "Rolex watches?", c: "money", k: "CH", d: "A steel watch with a waiting list, bought as an asset more than a clock.", t: ["watches", "luxury"], w: "Rolex", f: 55 },
  { q: "Lego bricks?", c: "culture", k: "DK", d: "The best toy ever made, and a hundred pounds for a spaceship.", t: ["toys", "lego"], w: "Lego", f: 86 },
  { q: "Barbie dolls?", c: "culture", k: "US", d: "Sixty years of argument about what a doll teaches, and a billion-dollar film.", t: ["toys", "culture"], w: "Barbie", f: 55 },
  { q: "Bicycles?", c: "life", k: null, d: "The most efficient machine ever built for moving a human being.", t: ["transport", "cycling"], w: "Bicycle", f: 82 },
  // ── Getting about ───────────────────────────────────────────────────────
  { q: "Electric scooters?", c: "travel", k: null, d: "Cheap last-mile transport, dumped across every pavement in Europe.", t: ["transport", "cities"], w: "Motorized scooter", f: 38 },
  { q: "Electric bikes?", c: "travel", k: null, d: "Hills made flat, commutes made possible, and batteries that catch fire.", t: ["transport", "cycling"], w: "Electric bicycle", f: 70 },
  { q: "Motorcycles?", c: "life", k: null, d: "The most fun per pound, and thirty times the fatality rate of a car.", t: ["transport", "motorcycles"], w: "Motorcycle", f: 58 },
  { q: "Harley-Davidson?", c: "life", k: "US", d: "The sound, the chrome, and an average owner who is now sixty.", t: ["transport", "motorcycles"], w: "Harley-Davidson", f: 50 },
  { q: "Airbus A380?", c: "travel", k: "FR", d: "The double-decker nobody could fill, and the quietest ride in the sky.", t: ["aviation", "aircraft"], w: "Airbus A380", f: 72 },
  { q: "Boeing 737 MAX?", c: "travel", k: "US", d: "Two crashes, a grounding, and a door plug that left mid-flight.", t: ["aviation", "safety"], w: "Boeing 737 MAX", f: 20 },
  { q: "Concorde?", c: "travel", k: "GB", d: "New York in three hours, for people who could afford three hours.", t: ["aviation", "history"], w: "Concorde", f: 78 },
  // ── Flying, and floating ────────────────────────────────────────────────
  { q: "Cruise ships?", c: "travel", k: null, d: "A floating town, a buffet, and the emissions of a small country.", t: ["travel", "climate"], w: "Cruise ship", f: 38 },
  { q: "Bottled water?", c: "climate", k: null, d: "Tap water, in plastic, at a thousand times the price.", t: ["drinks", "climate"], w: "Bottled water", f: 28 },
  { q: "Energy drinks?", c: "health", k: "AT", d: "Caffeine, taurine and sugar, marketed at teenagers by extreme sports.", t: ["drinks", "health"], w: "Energy drink", f: 32 },
  { q: "Coca-Cola?", c: "food", k: "US", d: "The most recognised product on earth, and a can of liquid sugar.", t: ["drinks", "brands"], w: "Coca-Cola", f: 52 },
  // ── Drunk, eaten, inhaled ───────────────────────────────────────────────
  { q: "Vape pens?", c: "health", k: null, d: "Safer than cigarettes, and a nicotine habit sold to children in mango.", t: ["health", "nicotine"], w: "Electronic cigarette", f: 25 },
  { q: "Smart TVs?", c: "tech", k: null, d: "A cheap panel subsidised by watching what you watch.", t: ["tv", "privacy"], w: "Smart TV", f: 38 },
  { q: "OLED televisions?", c: "tech", k: "KR", d: "Perfect blacks, real risk of burn-in, and a price that keeps falling.", t: ["tv", "displays"], w: "OLED", f: 74 },
  { q: "Projectors?", c: "entertainment", k: null, d: "A cinema on a wall, if the room is dark and nobody moves the table.", t: ["tv", "home-cinema"], w: "Video projector", f: 60 },
] as const;
