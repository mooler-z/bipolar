/**
 * A hundred arguments with faces on them.
 *
 * `seedTopics.ts` holds the evergreen ones — pineapple, tabs, coriander. These
 * are the other half of a feed: named subjects, spread across the world and
 * across the categories, each one pointing at a Wikipedia article so the topic
 * arrives with a picture rather than as a line of type.
 *
 * Every line obeys the rules `importTopics.ts` enforces: a specific subject,
 * answerable with LOVE or HATE and nothing else, never opening with a word that
 * promises a list, and never restating the buttons.
 *
 * `w` is an English Wikipedia article title, checked to be one that carries a
 * lead image. `images.resolve` turns it into the picture; a title that misses
 * costs one wasted lookup and leaves the topic as clean type, which is the
 * failure this was designed to survive.
 */

export type WorldSeed = {
  q: string;
  c: string;
  /** ISO 3166-1 alpha-2, or null where the argument belongs to nobody. */
  k: string | null;
  d: string;
  t: string[];
  w: string;
};

export const WORLD_TOPICS: readonly WorldSeed[] = [
  // ── Food, which every country is willing to fight about ────────────────
  { q: "Vegemite?", c: "food", k: "AU", d: "A salty yeast spread Australians grow up on and most visitors never finish.", t: ["spread", "australia"], w: "Vegemite" },
  { q: "Natto for breakfast?", c: "food", k: "JP", d: "Fermented soybeans, stringy and pungent, eaten over rice across eastern Japan.", t: ["fermented", "japan"], w: "Nattō" },
  { q: "Haggis on the menu?", c: "food", k: "GB", d: "Sheep offal, oats and spice in a casing, and Scotland's national dish.", t: ["scotland", "offal"], w: "Haggis" },
  { q: "Surstromming?", c: "food", k: "SE", d: "Swedish fermented herring, traditionally opened outdoors and well away from company.", t: ["fermented", "sweden"], w: "Surströmming" },
  { q: "Century eggs?", c: "food", k: "CN", d: "Eggs cured for weeks until the white turns amber and the yolk goes green.", t: ["preserved", "china"], w: "Century egg" },
  { q: "Injera with everything?", c: "food", k: "ET", d: "The sour teff flatbread that serves as plate, cutlery and staple across Ethiopia.", t: ["teff", "ethiopia"], w: "Injera" },
  { q: "Poutine?", c: "food", k: "CA", d: "Chips, cheese curds and gravy, and Quebec's most exported idea.", t: ["quebec", "chips"], w: "Poutine" },
  { q: "Balut as street food?", c: "food", k: "PH", d: "A fertilised duck egg boiled and eaten from the shell, sold on Philippine streets.", t: ["street-food", "philippines"], w: "Balut (food)" },
  { q: "Marmite on toast?", c: "food", k: "GB", d: "The spread whose own advertising has told you to hate it since 1902.", t: ["spread", "britain"], w: "Yeast extract" },
  { q: "Kimchi at every meal?", c: "food", k: "KR", d: "Fermented cabbage with chilli, served with almost everything on a Korean table.", t: ["fermented", "korea"], w: "Kimchi" },
  { q: "Durian on public transport?", c: "food", k: "SG", d: "A fruit banned from the Singapore metro for its smell alone.", t: ["fruit", "singapore"], w: "Durian" },
  { q: "Escargot?", c: "food", k: "FR", d: "Snails baked in garlic butter, a French restaurant fixture for two centuries.", t: ["snails", "france"], w: "Escargot" },

  // ── Sport ──────────────────────────────────────────────────────────────
  { q: "The video assistant referee?", c: "sport", k: null, d: "Replay officials who can overturn a goal minutes after the crowd has celebrated it.", t: ["football", "refereeing"], w: "Video assistant referee" },
  { q: "Bullfighting?", c: "sport", k: "ES", d: "A centuries-old spectacle now banned in parts of Spain and defended as heritage in others.", t: ["tradition", "spain"], w: "Bullfighting" },
  { q: "The designated hitter?", c: "sport", k: "US", d: "A batter who never fields, adopted league-wide in baseball only in 2022.", t: ["baseball", "rules"], w: "Designated hitter" },
  { q: "Five-day Test cricket?", c: "sport", k: "IN", d: "The longest format in professional sport, and the one the money is leaving.", t: ["cricket", "format"], w: "Test cricket" },
  { q: "Sumo's foreign grand champions?", c: "sport", k: "JP", d: "Mongolian and Hawaiian wrestlers have held sumo's top rank for most of thirty years.", t: ["sumo", "japan"], w: "Makuuchi" },
  { q: "Formula One in Las Vegas?", c: "sport", k: "US", d: "A night race down the Strip, and the most expensive ticket on the calendar.", t: ["motorsport", "vegas"], w: "Las Vegas Grand Prix" },
  { q: "The Tour de France's mountain stages?", c: "sport", k: "FR", d: "Six hours of climbing that decide the race and empty the peloton.", t: ["cycling", "france"], w: "Tour de France" },
  { q: "Rugby's bunker review?", c: "sport", k: "NZ", d: "An off-field official who upgrades a yellow card to red while play continues.", t: ["rugby", "refereeing"], w: "Rugby union" },
  { q: "The Super Bowl halftime show?", c: "sport", k: "US", d: "Twelve minutes of pop that outdraws the game it interrupts.", t: ["nfl", "music"], w: "Super Bowl" },
  { q: "Esports at the Olympics?", c: "sport", k: null, d: "The IOC has run an esports series and keeps circling full inclusion.", t: ["esports", "olympics"], w: "Olympic Esports Series" },

  // ── Politics and the world ─────────────────────────────────────────────
  { q: "Compulsory voting?", c: "politics", k: "AU", d: "Australia fines citizens who fail to turn out, and turnout runs above 90 per cent.", t: ["voting", "australia"], w: "Australian Electoral Commission" },
  { q: "The Electoral College?", c: "politics", k: "US", d: "The system that has twice sent a candidate to the White House without the popular vote.", t: ["elections", "usa"], w: "United States Electoral College" },
  { q: "The House of Lords?", c: "politics", k: "GB", d: "An unelected second chamber including ninety-two hereditary peers.", t: ["parliament", "britain"], w: "House of Lords" },
  { q: "Switzerland's referendums?", c: "politics", k: "CH", d: "Swiss voters decide national questions directly, several times a year.", t: ["democracy", "switzerland"], w: "Direct democracy" },
  { q: "Term limits for legislators?", c: "politics", k: null, d: "Capping how long a lawmaker can serve, common for presidents and rare for parliaments.", t: ["reform", "terms"], w: "White House" },
  { q: "The European Union?", c: "world", k: null, d: "Twenty-seven states sharing a market, a court and, for twenty of them, a currency.", t: ["europe", "union"], w: "European Union" },
  { q: "The UN Security Council veto?", c: "world", k: null, d: "Five countries can block any resolution, a settlement drawn up in 1945.", t: ["un", "veto"], w: "United Nations Security Council veto power" },
  { q: "BRICS expansion?", c: "world", k: "BR", d: "The bloc has grown well past its original five and now spans four continents.", t: ["brics", "bloc"], w: "BRICS" },
  { q: "The Commonwealth?", c: "world", k: "GB", d: "Fifty-six states, mostly former British territories, meeting as equals.", t: ["commonwealth", "empire"], w: "Commonwealth of Nations" },
  { q: "The African Union's free trade area?", c: "world", k: "ET", d: "A single market of 1.3 billion people, agreed in Kigali and still being built.", t: ["africa", "trade"], w: "African Continental Free Trade Area" },
  { q: "Golden passports?", c: "world", k: "MT", d: "Citizenship sold for investment, a practice the EU has taken Malta to court over.", t: ["citizenship", "malta"], w: "Immigrant investor programs" },
  { q: "The Schengen Area?", c: "world", k: "DE", d: "Twenty-nine countries with no routine checks at their shared borders.", t: ["borders", "europe"], w: "Schengen Area" },

  // ── Money and business ─────────────────────────────────────────────────
  { q: "Bitcoin as legal tender?", c: "money", k: "SV", d: "El Salvador made it legal tender in 2021 and few merchants took it up.", t: ["bitcoin", "salvador"], w: "Bitcoin" },
  { q: "The euro?", c: "money", k: "DE", d: "One currency for twenty countries with twenty very different economies.", t: ["euro", "currency"], w: "Euro" },
  { q: "Universal basic income?", c: "money", k: "FI", d: "Finland paid 2,000 unemployed people a monthly sum for two years and measured what happened.", t: ["ubi", "welfare"], w: "Universal basic income" },
  { q: "Negative interest rates?", c: "money", k: "JP", d: "Japan charged banks to hold reserves for eight years before abandoning it in 2024.", t: ["rates", "japan"], w: "Bank of Japan" },
  { q: "Tipping culture?", c: "money", k: "US", d: "American service wages assume a tip; most of the world assumes the price is the price.", t: ["tipping", "wages"], w: "Gratuity" },
  { q: "A four-day week on full pay?", c: "work", k: "IS", d: "Iceland cut hours for a tenth of its workforce and kept productivity flat.", t: ["hours", "iceland"], w: "Reykjavík" },
  { q: "Return-to-office mandates?", c: "work", k: null, d: "Employers calling staff back to desks they proved they did not need.", t: ["remote", "office"], w: "Remote work" },
  { q: "Germany's works councils?", c: "work", k: "DE", d: "Employee representatives with a legal seat in company decisions.", t: ["labour", "germany"], w: "Volkswagen" },
  { q: "Japan's lifetime employment?", c: "work", k: "JP", d: "A postwar bargain of a job for life, now eroding but not gone.", t: ["employment", "japan"], w: "Salaryman" },
  { q: "Sovereign wealth funds?", c: "business", k: "NO", d: "Norway banked its oil money and owns roughly 1.5 per cent of every listed company on earth.", t: ["oil", "norway"], w: "Norges Bank" },
  { q: "Breaking up big tech?", c: "business", k: "US", d: "Antitrust suits against Google, Amazon, Apple and Meta are all live at once.", t: ["antitrust", "tech"], w: "Googleplex" },
  { q: "Fast fashion?", c: "business", k: "BD", d: "Clothes made in weeks and discarded in months, stitched largely in South Asia.", t: ["fashion", "labour"], w: "Fast fashion" },

  // ── Technology, AI and the internet ────────────────────────────────────
  { q: "Generative AI in classrooms?", c: "ai", k: null, d: "Schools have moved from banning chatbots to teaching with them in two years.", t: ["ai", "schools"], w: "Generative artificial intelligence" },
  { q: "AI-generated music?", c: "ai", k: null, d: "Models trained on catalogues now write in the voice of artists who never sang it.", t: ["ai", "music"], w: "Synthesizer" },
  { q: "Self-driving taxis?", c: "tech", k: "US", d: "Driverless fleets carry paying passengers in several American cities.", t: ["robotaxi", "cars"], w: "Waymo" },
  { q: "Facial recognition in public?", c: "tech", k: "CN", d: "Cameras that identify people by face, deployed at very different scales worldwide.", t: ["surveillance", "privacy"], w: "Facial recognition system" },
  { q: "India's Aadhaar ID?", c: "tech", k: "IN", d: "A biometric number for 1.3 billion people, tied to benefits and banking.", t: ["identity", "india"], w: "Nandan Nilekani" },
  { q: "Estonia's e-residency?", c: "tech", k: "EE", d: "A digital identity that lets anyone run an EU company from anywhere.", t: ["digital", "estonia"], w: "E-Residency of Estonia" },
  { q: "Starlink over every country?", c: "tech", k: null, d: "Thousands of satellites delivering internet, and astronomers asking them to stop.", t: ["satellites", "internet"], w: "Starlink" },
  { q: "The right to be forgotten?", c: "internet", k: "ES", d: "A European court made search engines delist results about ordinary people.", t: ["privacy", "search"], w: "Court of Justice of the European Union" },
  { q: "Age verification for social media?", c: "internet", k: "AU", d: "Australia has legislated a minimum age for social accounts.", t: ["children", "regulation"], w: "Parliament House, Canberra" },
  { q: "The Great Firewall?", c: "internet", k: "CN", d: "The filtering that keeps most of the global web out of mainland China.", t: ["censorship", "china"], w: "Golden Shield Project" },
  { q: "Paying for a blue tick?", c: "internet", k: null, d: "Verification sold by subscription rather than earned by identity.", t: ["verification", "social"], w: "Twitter verification" },
  { q: "Wikipedia as a source?", c: "internet", k: null, d: "The encyclopaedia anyone can edit, cited by everyone and trusted by teachers reluctantly.", t: ["wikipedia", "sources"], w: "Wikipedia" },

  // ── Science, health and climate ────────────────────────────────────────
  { q: "Nuclear power?", c: "climate", k: "FR", d: "France draws about two thirds of its electricity from reactors.", t: ["nuclear", "energy"], w: "Nuclear power" },
  { q: "Germany's nuclear shutdown?", c: "climate", k: "DE", d: "Germany closed its last three reactors in 2023 and burned more coal that year.", t: ["nuclear", "germany"], w: "Nuclear power in Germany" },
  { q: "Carbon offsetting?", c: "climate", k: null, d: "Paying elsewhere for emissions here, and audits that keep finding nothing was saved.", t: ["carbon", "offsets"], w: "Carbon offset" },
  { q: "Geoengineering the stratosphere?", c: "climate", k: null, d: "Reflecting sunlight by seeding the upper atmosphere, proposed and barely tested.", t: ["geoengineering", "climate"], w: "Solar radiation modification" },
  { q: "The Three Gorges Dam?", c: "climate", k: "CN", d: "The largest power station ever built, and a million people moved to build it.", t: ["dam", "china"], w: "Three Gorges Dam" },
  { q: "The Grand Ethiopian Renaissance Dam?", c: "climate", k: "ET", d: "Africa's biggest hydroelectric project, filled over Egyptian objections.", t: ["nile", "dam"], w: "Grand Ethiopian Renaissance Dam" },
  { q: "Lab-grown meat?", c: "science", k: "SG", d: "Singapore was the first country to approve cultivated chicken for sale.", t: ["food-tech", "singapore"], w: "Cultured meat" },
  { q: "Gene-edited babies?", c: "science", k: "CN", d: "A Chinese scientist edited embryos in 2018 and went to prison for it.", t: ["crispr", "ethics"], w: "He Jiankui affair" },
  { q: "Crewed missions to Mars?", c: "science", k: null, d: "A journey of at least two years, proposed on timelines that keep slipping.", t: ["mars", "space"], w: "Human mission to Mars" },
  { q: "Daylight saving time?", c: "life", k: null, d: "Clocks moved twice a year in about seventy countries, and abolished in others.", t: ["clocks", "time"], w: "Daylight saving time" },
  { q: "Ultra-processed food?", c: "health", k: "BR", d: "A Brazilian classification that has reshaped dietary advice worldwide.", t: ["diet", "nova"], w: "Ultra-processed food" },
  { q: "Weight-loss injections?", c: "health", k: "DK", d: "GLP-1 drugs developed in Denmark, now the most talked-about medicines on earth.", t: ["ozempic", "obesity"], w: "Semaglutide" },
  { q: "Cannabis legalisation?", c: "health", k: "CA", d: "Canada legalised recreational cannabis nationally in 2018.", t: ["cannabis", "canada"], w: "Cannabis in Canada" },
  { q: "Portugal's drug decriminalisation?", c: "health", k: "PT", d: "Possession has been an administrative matter, not a crime, since 2001.", t: ["drugs", "portugal"], w: "Lisbon" },

  // ── Culture, music, entertainment, gaming ──────────────────────────────
  { q: "The Eurovision Song Contest?", c: "music", k: "SE", d: "Sixty-nine years of pop, politics and voting blocs.", t: ["eurovision", "pop"], w: "Eurovision Song Contest" },
  { q: "Autotune in pop music?", c: "music", k: null, d: "Pitch correction that went from studio fix to audible instrument.", t: ["autotune", "production"], w: "Auto-Tune" },
  { q: "Reggaeton?", c: "music", k: "PR", d: "Born in Puerto Rico and now the most streamed sound in the Spanish-speaking world.", t: ["reggaeton", "latin"], w: "Reggaeton" },
  { q: "K-pop training contracts?", c: "music", k: "KR", d: "Years of training under contracts that critics call indentured and labels call investment.", t: ["kpop", "korea"], w: "BTS" },
  { q: "Afrobeats going global?", c: "music", k: "NG", d: "Lagos pop filling arenas from London to Los Angeles.", t: ["afrobeats", "nigeria"], w: "Burna Boy" },
  { q: "Bollywood's three-hour runtimes?", c: "entertainment", k: "IN", d: "Indian films built around an interval that most markets no longer have.", t: ["bollywood", "film"], w: "Shah Rukh Khan" },
  { q: "Telenovelas?", c: "entertainment", k: "MX", d: "Nightly serials that have exported Mexican drama for sixty years.", t: ["television", "mexico"], w: "Thalía" },
  { q: "Nollywood's output?", c: "entertainment", k: "NG", d: "Nigeria releases more films a year than almost anywhere on earth.", t: ["nollywood", "film"], w: "Cinema of Nigeria" },
  { q: "Streaming films on release day?", c: "entertainment", k: "US", d: "Cinema windows collapsed during the pandemic and never fully reopened.", t: ["streaming", "cinema"], w: "Streaming media" },
  { q: "Loot boxes in games?", c: "gaming", k: "BE", d: "Belgium ruled paid random rewards a form of gambling and banned them.", t: ["lootboxes", "belgium"], w: "Loot box" },
  { q: "Remaking old games?", c: "gaming", k: "JP", d: "Studios rebuilding their back catalogue instead of making something new.", t: ["remakes", "games"], w: "Video game remake" },
  { q: "Anime's seasonal release schedule?", c: "entertainment", k: "JP", d: "Dozens of series every quarter, produced on famously brutal deadlines.", t: ["anime", "japan"], w: "Anime" },
  { q: "Graffiti as public art?", c: "culture", k: "BR", d: "São Paulo commissions murals on the same walls it prosecutes taggers for.", t: ["street-art", "brazil"], w: "Graffiti" },
  { q: "Returning museum artefacts?", c: "culture", k: "GR", d: "Greece has asked for the Parthenon marbles back since 1832.", t: ["restitution", "museums"], w: "Parthenon Marbles" },
  { q: "Tattoos in the workplace?", c: "culture", k: "JP", d: "Japanese gyms and hot springs still turn away visible ink.", t: ["tattoos", "work"], w: "Tattoo" },
  { q: "Halloween outside America?", c: "culture", k: "MX", d: "An import that arrives each year alongside Day of the Dead.", t: ["halloween", "tradition"], w: "Halloween" },

  // ── History, religion, law, education, travel, life ────────────────────
  { q: "Colonial-era statues in public squares?", c: "history", k: "ZA", d: "Cape Town removed Rhodes in 2015 and the argument spread worldwide.", t: ["statues", "memory"], w: "Rhodes Must Fall" },
  { q: "The Berlin Wall memorial?", c: "history", k: "DE", d: "A preserved stretch of the wall kept standing as a warning.", t: ["berlin", "memory"], w: "Berlin Wall" },
  { q: "Renaming cities?", c: "history", k: "IN", d: "Bombay to Mumbai, Madras to Chennai, and the argument each time.", t: ["names", "india"], w: "Mumbai" },
  { q: "Religious dress codes in schools?", c: "religion", k: "FR", d: "France bans conspicuous religious symbols in state classrooms.", t: ["secularism", "france"], w: "Laïcité" },
  { q: "The Hajj quota system?", c: "religion", k: "SA", d: "Every country gets a fixed allocation of pilgrims each year.", t: ["hajj", "pilgrimage"], w: "Hajj" },
  { q: "Blue laws on Sundays?", c: "religion", k: "DE", d: "German shops close on Sundays by law, and the rule is defended across politics.", t: ["sunday", "retail"], w: "Kaufhaus des Westens" },
  { q: "The death penalty?", c: "law", k: "US", d: "Retained in 27 American states and abolished across the whole of Europe bar one.", t: ["capital-punishment", "justice"], w: "Capital punishment" },
  { q: "Jury trials?", c: "law", k: "GB", d: "Twelve strangers deciding guilt, used heavily in some systems and not at all in others.", t: ["juries", "courts"], w: "Jury trial" },
  { q: "Singapore's caning sentences?", c: "law", k: "SG", d: "Judicial corporal punishment, still on the books for dozens of offences.", t: ["sentencing", "singapore"], w: "Caning in Singapore" },
  { q: "Free university tuition?", c: "education", k: "DE", d: "German public universities charge no tuition, to domestic and foreign students alike.", t: ["tuition", "germany"], w: "Higher education in Germany" },
  { q: "Finland's school system?", c: "education", k: "FI", d: "Little homework, no national testing, and results everyone else studies.", t: ["schools", "finland"], w: "Education in Finland" },
  { q: "China's gaokao?", c: "education", k: "CN", d: "A single exam that decides university places for more than ten million students a year.", t: ["exams", "china"], w: "Gaokao" },
  { q: "School uniforms?", c: "education", k: "GB", d: "Compulsory in most British schools and rare across much of Europe.", t: ["uniforms", "schools"], w: "School uniform" },
  { q: "Venice's tourist entry fee?", c: "travel", k: "IT", d: "Day visitors now pay to enter the historic centre on busy days.", t: ["overtourism", "venice"], w: "Tourism in Venice" },
  { q: "Bhutan's tourist levy?", c: "travel", k: "BT", d: "A daily fee per visitor, set deliberately high to limit numbers.", t: ["bhutan", "tourism"], w: "Tourism in Bhutan" },
  { q: "Cruise ships in historic ports?", c: "travel", k: "ES", d: "Barcelona has capped terminals as residents protest the crowds.", t: ["cruises", "barcelona"], w: "Cruise ship" },
  { q: "Reclining your airline seat?", c: "travel", k: null, d: "Four inches of space that two passengers both believe they paid for.", t: ["flying", "etiquette"], w: "Airline seat" },
  { q: "Siestas?", c: "life", k: "ES", d: "An afternoon break most Spaniards no longer take and no one wants abolished.", t: ["siesta", "spain"], w: "Siesta" },
  { q: "Hygge as a lifestyle?", c: "life", k: "DK", d: "A Danish word for cosiness that became a global lifestyle export.", t: ["hygge", "denmark"], w: "Hygge" },
  { q: "Queuing culture?", c: "life", k: "GB", d: "An orderly line treated in Britain as something close to a moral position.", t: ["queues", "britain"], w: "Queue area" },
  { q: "Sauna every day?", c: "life", k: "FI", d: "Finland has more saunas than cars, and about one for every two people.", t: ["sauna", "finland"], w: "Finnish sauna" },
  { q: "Arranged marriages?", c: "life", k: "IN", d: "Still the majority route to marriage across South Asia.", t: ["marriage", "family"], w: "Weddings in India" },
  { q: "Mandatory military service?", c: "conflict", k: "IL", d: "Conscription for most citizens, a settlement argued over since the state was founded.", t: ["conscription", "israel"], w: "Conscription" },
  { q: "NATO expansion?", c: "conflict", k: "UA", d: "The alliance has taken in sixteen members since 1999, most recently Sweden.", t: ["nato", "security"], w: "Enlargement of NATO" },
  { q: "Nuclear deterrence?", c: "conflict", k: null, d: "Nine states hold warheads on the theory that holding them prevents their use.", t: ["nuclear", "deterrence"], w: "Deterrence theory" },
  { q: "Armed drones?", c: "conflict", k: "TR", d: "Turkish-built drones have changed the arithmetic of several recent wars.", t: ["drones", "turkey"], w: "Unmanned combat aerial vehicle" },
] as const;
