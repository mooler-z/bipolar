/**
 * A hundred people the internet cannot agree about.
 *
 * `seedTopics.ts` is the evergreen half — pineapple, tabs, coriander —
 * and `seedWorldTopics.ts` is named subjects across the world. This is the
 * third kind, and the one the product is loudest about: **named living
 * people**, where the whole room already has an opinion and the only
 * question is how it splits.
 *
 * Two rules were applied to the list itself, and they are worth stating
 * because they are editorial rather than technical:
 *
 * **Only people who are genuinely argued about.** Politicians, financiers,
 * commentators, founders, celebrities — figures whose public conduct is a
 * matter of live public disagreement.
 *
 * **Nobody here is a victim, and nobody is a convicted sex offender.** A
 * LOVE button beside such a name is not edgy, it is grotesque, and the
 * product does not need it to be interesting.
 *
 * `k` is the country each person is argued about *in* or *from*, which is
 * what feeds the atlas: a question about Netanyahu is a question about
 * Israel, so a nation's lean across those becomes its verdict on that
 * country. That is the whole reason the world map has anything to say.
 *
 * `w` is an English Wikipedia article title. Every one of them was checked
 * against the live API for a lead image before this file was committed; a
 * title that later loses its picture costs one wasted lookup and leaves the
 * topic as clean type, which is the failure this was designed to survive.
 */

export type PersonSeed = {
  q: string;
  c: string;
  /** ISO 3166-1 alpha-2, or null where the argument belongs to nobody. */
  k: string | null;
  d: string;
  t: string[];
  w: string;
  /**
   * Roughly the share of a worldwide audience that would press LOVE.
   *
   * Used only by the demo seed, never by the product. Polarising figures sit
   * low even where they are domestically adored — the home crowd is restored
   * by the stake adjustment in `seedOpinions.ts`, which is what makes a seeded
   * Netanyahu split Israel from Palestine rather than averaging them.
   */
  f: number;
};

export const PEOPLE_TOPICS: readonly PersonSeed[] = [
  // ── Heads of government and the people who want to be ──────────────────
  { q: "Benjamin Netanyahu?", c: "politics", k: "IL", d: "Israel's longest-serving prime minister, in office through the Gaza war and his own corruption trial.", t: ["israel", "leader"], w: "Benjamin Netanyahu", f: 22 },
  { q: "Donald Trump?", c: "politics", k: "US", d: "The 45th and 47th US president, and the most litigated figure in modern American politics.", t: ["usa", "leader"], w: "Donald Trump", f: 35 },
  { q: "Vladimir Putin?", c: "politics", k: "RU", d: "Russia's president since 1999, and the man who ordered the invasion of Ukraine.", t: ["russia", "leader"], w: "Vladimir Putin", f: 18 },
  { q: "Volodymyr Zelenskyy?", c: "politics", k: "UA", d: "The comedian turned wartime president of Ukraine.", t: ["ukraine", "leader"], w: "Volodymyr Zelenskyy", f: 62 },
  { q: "Xi Jinping?", c: "politics", k: "CN", d: "China's most powerful leader since Mao, after removing his own term limits.", t: ["china", "leader"], w: "Xi Jinping", f: 25 },
  { q: "Narendra Modi?", c: "politics", k: "IN", d: "India's prime minister, credited with its rise and accused of majoritarianism.", t: ["india", "leader"], w: "Narendra Modi", f: 45 },
  { q: "Recep Tayyip Erdogan?", c: "politics", k: "TR", d: "Turkey's president for two decades, and the jailer of many of his critics.", t: ["turkey", "leader"], w: "Recep Tayyip Erdoğan", f: 28 },
  { q: "Viktor Orban?", c: "politics", k: "HU", d: "Hungary's prime minister and Europe's self-described illiberal democrat.", t: ["hungary", "leader"], w: "Viktor Orbán", f: 25 },
  { q: "Javier Milei?", c: "politics", k: "AR", d: "Argentina's chainsaw-wielding libertarian president, halving inflation and the state with it.", t: ["argentina", "leader"], w: "Javier Milei", f: 42 },
  { q: "Kim Jong Un?", c: "politics", k: "KP", d: "North Korea's third hereditary ruler and its nuclear programme's owner.", t: ["north-korea", "leader"], w: "Kim Jong Un", f: 8 },
  { q: "Mohammed bin Salman?", c: "politics", k: "SA", d: "Saudi Arabia's crown prince, behind both its social opening and the Khashoggi killing.", t: ["saudi", "leader"], w: "Mohammed bin Salman", f: 22 },
  { q: "Lula da Silva?", c: "politics", k: "BR", d: "Brazil's president twice over, with a quashed corruption conviction in between.", t: ["brazil", "leader"], w: "Luiz Inácio Lula da Silva", f: 45 },
  { q: "Jair Bolsonaro?", c: "politics", k: "BR", d: "Brazil's former president, barred from office and tried over an attempted coup.", t: ["brazil", "leader"], w: "Jair Bolsonaro", f: 28 },
  { q: "Nicolas Maduro?", c: "politics", k: "VE", d: "Venezuela's president, holding power through elections most observers reject.", t: ["venezuela", "leader"], w: "Nicolás Maduro", f: 15 },
  { q: "Rodrigo Duterte?", c: "politics", k: "PH", d: "The Philippine ex-president whose drug war killed thousands, now at the ICC.", t: ["philippines", "leader"], w: "Rodrigo Duterte", f: 25 },
  { q: "Emmanuel Macron?", c: "politics", k: "FR", d: "France's centrist president, governing through strikes, riots and a hung parliament.", t: ["france", "leader"], w: "Emmanuel Macron", f: 38 },
  { q: "Giorgia Meloni?", c: "politics", k: "IT", d: "Italy's first woman prime minister, from a party with post-fascist roots.", t: ["italy", "leader"], w: "Giorgia Meloni", f: 35 },
  { q: "Keir Starmer?", c: "politics", k: "GB", d: "Britain's prime minister, a former chief prosecutor with a landslide and low approval.", t: ["britain", "leader"], w: "Keir Starmer", f: 32 },
  { q: "Boris Johnson?", c: "politics", k: "GB", d: "The Brexit campaigner turned prime minister, brought down by parties in lockdown.", t: ["britain", "brexit"], w: "Boris Johnson", f: 30 },
  { q: "Nigel Farage?", c: "politics", k: "GB", d: "The man who did more than anyone to take Britain out of the European Union.", t: ["britain", "brexit"], w: "Nigel Farage", f: 28 },
  { q: "Marine Le Pen?", c: "politics", k: "FR", d: "France's national-populist leader, convicted of embezzlement and barred from running.", t: ["france", "populism"], w: "Marine Le Pen", f: 25 },
  { q: "Abiy Ahmed?", c: "politics", k: "ET", d: "Ethiopia's Nobel peace laureate, who then led the country into the Tigray war.", t: ["ethiopia", "leader"], w: "Abiy Ahmed", f: 35 },
  { q: "Imran Khan?", c: "politics", k: "PK", d: "The cricketer turned Pakistani prime minister, now writing from prison.", t: ["pakistan", "leader"], w: "Imran Khan", f: 48 },
  { q: "Mahmoud Abbas?", c: "politics", k: "PS", d: "President of the Palestinian Authority since 2005, with no election since.", t: ["palestine", "leader"], w: "Mahmoud Abbas", f: 28 },
  { q: "Itamar Ben-Gvir?", c: "politics", k: "IL", d: "Israel's far-right national security minister, convicted of incitement before taking office.", t: ["israel", "far-right"], w: "Itamar Ben-Gvir", f: 15 },
  { q: "Ursula von der Leyen?", c: "politics", k: "BE", d: "The European Commission president, running the bloc's response to war and AI alike.", t: ["europe", "leader"], w: "Ursula von der Leyen", f: 38 },
  { q: "Justin Trudeau?", c: "politics", k: "CA", d: "Canada's prime minister for nine years, ending on his own party's terms.", t: ["canada", "leader"], w: "Justin Trudeau", f: 35 },

  // ── American politics, which the whole internet votes in ───────────────
  { q: "JD Vance?", c: "politics", k: "US", d: "The venture capitalist and memoirist who became Trump's vice president.", t: ["usa", "vp"], w: "JD Vance", f: 33 },
  { q: "Kamala Harris?", c: "politics", k: "US", d: "The former vice president and 2024 Democratic nominee.", t: ["usa", "democrat"], w: "Kamala Harris", f: 40 },
  { q: "Ron DeSantis?", c: "politics", k: "US", d: "Florida's governor, who built a national profile fighting Disney and universities.", t: ["usa", "republican"], w: "Ron DeSantis", f: 32 },
  { q: "Alexandria Ocasio-Cortez?", c: "politics", k: "US", d: "The bartender turned congresswoman who made the American left loud again.", t: ["usa", "left"], w: "Alexandria Ocasio-Cortez", f: 45 },
  { q: "Bernie Sanders?", c: "politics", k: "US", d: "The democratic socialist senator who moved his party's centre of gravity twice.", t: ["usa", "left"], w: "Bernie Sanders", f: 55 },
  { q: "Robert F. Kennedy Jr.?", c: "health", k: "US", d: "The environmental lawyer turned vaccine sceptic, now America's health secretary.", t: ["usa", "vaccines"], w: "Robert F. Kennedy Jr.", f: 30 },
  { q: "Marjorie Taylor Greene?", c: "politics", k: "US", d: "The Georgia congresswoman who brought conspiracy politics onto the House floor.", t: ["usa", "republican"], w: "Marjorie Taylor Greene", f: 20 },
  { q: "Nancy Pelosi?", c: "politics", k: "US", d: "The longest-serving woman in US congressional leadership, and the right's favourite villain.", t: ["usa", "democrat"], w: "Nancy Pelosi", f: 30 },
  { q: "Elizabeth Warren?", c: "money", k: "US", d: "The bankruptcy professor turned senator who wants to break up big everything.", t: ["usa", "regulation"], w: "Elizabeth Warren", f: 42 },
  { q: "Zohran Mamdani?", c: "politics", k: "US", d: "The democratic socialist who won New York's mayoralty on a rent-freeze platform.", t: ["usa", "new-york"], w: "Zohran Mamdani", f: 45 },

  // ── Money, and the people who move it ──────────────────────────────────
  { q: "George Soros?", c: "money", k: "US", d: "The hedge fund manager turned philanthropist at the centre of a thousand conspiracy theories.", t: ["finance", "philanthropy"], w: "George Soros", f: 30 },
  { q: "Warren Buffett?", c: "money", k: "US", d: "The Omaha investor whose annual letter moves more money than most central banks.", t: ["finance", "investing"], w: "Warren Buffett", f: 70 },
  { q: "Elon Musk?", c: "tech", k: "US", d: "Tesla, SpaceX and X, plus the loudest posting habit in the history of capital.", t: ["tech", "x"], w: "Elon Musk", f: 42 },
  { q: "Jeff Bezos?", c: "business", k: "US", d: "Amazon's founder, now owner of the Washington Post and a rocket company.", t: ["amazon", "billionaire"], w: "Jeff Bezos", f: 35 },
  { q: "Mark Zuckerberg?", c: "tech", k: "US", d: "Facebook's founder, who has renamed the company and his politics at least once each.", t: ["meta", "social"], w: "Mark Zuckerberg", f: 30 },
  { q: "Peter Thiel?", c: "tech", k: "US", d: "The PayPal founder who funds contrarian politics and sued a website out of existence.", t: ["venture", "politics"], w: "Peter Thiel", f: 25 },
  { q: "Bill Gates?", c: "health", k: "US", d: "Microsoft's founder, now the world's most conspiracy-theorised philanthropist.", t: ["philanthropy", "microsoft"], w: "Bill Gates", f: 45 },
  { q: "Jamie Dimon?", c: "money", k: "US", d: "JPMorgan's chief executive, and Wall Street's most quoted opinion.", t: ["banking", "wall-street"], w: "Jamie Dimon", f: 40 },
  { q: "Larry Fink?", c: "money", k: "US", d: "BlackRock's chief executive, who manages more money than most countries earn.", t: ["blackrock", "esg"], w: "Larry Fink", f: 28 },
  { q: "Bill Ackman?", c: "money", k: "US", d: "The activist investor who now campaigns on universities as loudly as on stocks.", t: ["hedge-fund", "activist"], w: "Bill Ackman", f: 32 },
  { q: "Cathie Wood?", c: "money", k: "US", d: "ARK's founder, whose conviction bets make her either visionary or a cautionary tale.", t: ["investing", "tech"], w: "Cathie Wood", f: 38 },
  { q: "Ray Dalio?", c: "money", k: "US", d: "Bridgewater's founder, exporting radical transparency and warnings of imperial decline.", t: ["hedge-fund", "macro"], w: "Ray Dalio", f: 45 },
  { q: "Ken Griffin?", c: "money", k: "US", d: "Citadel's founder, the market maker at the centre of the meme-stock hearings.", t: ["hedge-fund", "citadel"], w: "Ken Griffin (businessman)", f: 33 },
  { q: "Jerome Powell?", c: "money", k: "US", d: "The Federal Reserve chair whose rate decisions set the price of money everywhere.", t: ["fed", "rates"], w: "Jerome Powell", f: 42 },
  { q: "Christine Lagarde?", c: "money", k: "DE", d: "The European Central Bank president, steering the euro through inflation and war.", t: ["ecb", "euro"], w: "Christine Lagarde", f: 40 },
  { q: "Michael Saylor?", c: "money", k: "US", d: "The software executive who turned his company into a leveraged bitcoin holding.", t: ["bitcoin", "crypto"], w: "Michael J. Saylor", f: 38 },
  { q: "Changpeng Zhao?", c: "money", k: "AE", d: "Binance's founder, who pleaded guilty to money-laundering failures and served time.", t: ["crypto", "binance"], w: "Changpeng Zhao", f: 35 },
  { q: "Vitalik Buterin?", c: "tech", k: "SG", d: "Ethereum's creator, and crypto's most reluctant philosopher-king.", t: ["ethereum", "crypto"], w: "Vitalik Buterin", f: 62 },
  { q: "Bernard Arnault?", c: "business", k: "FR", d: "The LVMH chairman who has been, on some days, the richest person alive.", t: ["luxury", "billionaire"], w: "Bernard Arnault", f: 40 },
  { q: "Rupert Murdoch?", c: "culture", k: "US", d: "The proprietor whose newspapers and networks shaped politics on three continents.", t: ["media", "news"], w: "Rupert Murdoch", f: 22 },

  // ── The commentariat ───────────────────────────────────────────────────
  { q: "Ben Shapiro?", c: "culture", k: "US", d: "The fast-talking conservative commentator and co-founder of the Daily Wire.", t: ["commentary", "conservative"], w: "Ben Shapiro", f: 35 },
  { q: "Jordan Peterson?", c: "culture", k: "CA", d: "The psychologist whose lectures on order and meaning made him a global lightning rod.", t: ["psychology", "commentary"], w: "Jordan Peterson", f: 40 },
  { q: "Charlie Kirk?", c: "politics", k: "US", d: "The founder of Turning Point USA, who took campus conservatism to stadium scale.", t: ["campus", "conservative"], w: "Charlie Kirk", f: 30 },
  { q: "Joe Rogan?", c: "culture", k: "US", d: "The comedian whose three-hour podcast reaches more people than most networks.", t: ["podcast", "media"], w: "Joe Rogan", f: 48 },
  { q: "Tucker Carlson?", c: "culture", k: "US", d: "The broadcaster who left Fox and took his audience with him.", t: ["media", "commentary"], w: "Tucker Carlson", f: 30 },
  { q: "Candace Owens?", c: "culture", k: "US", d: "The commentator whose turns against former allies keep her permanently in the feed.", t: ["commentary", "conservative"], w: "Candace Owens", f: 25 },
  { q: "Andrew Tate?", c: "culture", k: "RO", d: "The kickboxer turned influencer, facing trafficking charges in two countries.", t: ["influencer", "manosphere"], w: "Andrew Tate", f: 22 },
  { q: "Piers Morgan?", c: "culture", k: "GB", d: "The broadcaster who has fallen out with roughly everyone on camera.", t: ["media", "britain"], w: "Piers Morgan", f: 25 },
  { q: "Bill Maher?", c: "culture", k: "US", d: "The comedian whose politics annoy both parties, increasingly on purpose.", t: ["comedy", "commentary"], w: "Bill Maher", f: 42 },
  { q: "John Oliver?", c: "culture", k: "US", d: "The British comedian who turned twenty-minute policy explainers into television.", t: ["comedy", "media"], w: "John Oliver", f: 58 },
  { q: "Hasan Piker?", c: "culture", k: "US", d: "The left's biggest livestreamer, arguing politics to hundreds of thousands nightly.", t: ["streaming", "left"], w: "Hasan Piker", f: 38 },
  { q: "Sam Harris?", c: "culture", k: "US", d: "The neuroscientist and podcaster who picks fights with every side in turn.", t: ["podcast", "atheism"], w: "Sam Harris", f: 45 },
  { q: "Richard Dawkins?", c: "science", k: "GB", d: "The evolutionary biologist whose atheism became as famous as his science.", t: ["science", "atheism"], w: "Richard Dawkins", f: 50 },
  { q: "Noam Chomsky?", c: "culture", k: "US", d: "The linguist whose critique of American foreign policy defined a left tradition.", t: ["linguistics", "left"], w: "Noam Chomsky", f: 48 },
  { q: "Slavoj Zizek?", c: "culture", k: "SI", d: "The Slovenian philosopher who explains Hegel through films nobody else would cite.", t: ["philosophy", "left"], w: "Slavoj Žižek", f: 50 },
  { q: "Jon Stewart?", c: "culture", k: "US", d: "The satirist who shaped a generation's politics from a fake news desk.", t: ["comedy", "media"], w: "Jon Stewart", f: 62 },
  { q: "Greta Thunberg?", c: "climate", k: "SE", d: "The activist who began a global school strike at fifteen and has not stopped.", t: ["climate", "activism"], w: "Greta Thunberg", f: 45 },

  // ── Technology, and who gets to build it ───────────────────────────────
  { q: "Sam Altman?", c: "ai", k: "US", d: "OpenAI's chief executive, fired and reinstated in a weekend.", t: ["openai", "ai"], w: "Sam Altman", f: 42 },
  { q: "Sundar Pichai?", c: "tech", k: "US", d: "Alphabet's chief executive, running search through the arrival of its replacement.", t: ["google", "ai"], w: "Sundar Pichai", f: 48 },
  { q: "Satya Nadella?", c: "tech", k: "US", d: "Microsoft's chief executive, who bet the company on OpenAI and won.", t: ["microsoft", "ai"], w: "Satya Nadella", f: 58 },
  { q: "Tim Cook?", c: "tech", k: "US", d: "Apple's chief executive, defending the App Store's cut in every jurisdiction at once.", t: ["apple", "antitrust"], w: "Tim Cook", f: 52 },
  { q: "Jensen Huang?", c: "ai", k: "US", d: "Nvidia's founder, whose chips became the bottleneck of the AI boom.", t: ["nvidia", "chips"], w: "Jensen Huang", f: 60 },
  { q: "Marc Andreessen?", c: "tech", k: "US", d: "The browser pioneer turned venture capitalist and techno-optimist manifesto author.", t: ["venture", "tech"], w: "Marc Andreessen", f: 35 },
  { q: "Geoffrey Hinton?", c: "ai", k: "CA", d: "The godfather of deep learning, who quit Google to warn about it.", t: ["ai", "safety"], w: "Geoffrey Hinton", f: 62 },
  { q: "Yann LeCun?", c: "ai", k: "US", d: "Meta's chief AI scientist, and the loudest voice against AI doom.", t: ["ai", "meta"], w: "Yann LeCun", f: 52 },
  { q: "Demis Hassabis?", c: "ai", k: "GB", d: "DeepMind's founder, a chess prodigy with a Nobel prize for protein folding.", t: ["deepmind", "ai"], w: "Demis Hassabis", f: 65 },
  { q: "Edward Snowden?", c: "tech", k: "RU", d: "The contractor who exposed mass surveillance and has lived in Moscow since.", t: ["surveillance", "leaks"], w: "Edward Snowden", f: 58 },
  { q: "Julian Assange?", c: "tech", k: "AU", d: "WikiLeaks' founder, freed in 2024 after years in an embassy and a prison.", t: ["wikileaks", "leaks"], w: "Julian Assange", f: 50 },
  { q: "Pavel Durov?", c: "tech", k: "AE", d: "Telegram's founder, arrested in France over what his users do on it.", t: ["telegram", "moderation"], w: "Pavel Durov", f: 52 },
  { q: "Jack Dorsey?", c: "tech", k: "US", d: "Twitter's founder, who sold it, regretted it, and now builds the alternative.", t: ["twitter", "bitcoin"], w: "Jack Dorsey", f: 42 },
  { q: "Palmer Luckey?", c: "tech", k: "US", d: "The Oculus founder who now builds autonomous weapons for the Pentagon.", t: ["defence", "vr"], w: "Palmer Luckey", f: 35 },

  // ── Culture, sport and the famous ──────────────────────────────────────
  { q: "Kanye West?", c: "entertainment", k: "US", d: "The producer whose records are canon and whose statements cost him everything twice.", t: ["music", "controversy"], w: "Kanye West", f: 25 },
  { q: "Taylor Swift?", c: "entertainment", k: "US", d: "The songwriter whose tour moved national economies and whose fans move elections.", t: ["music", "pop"], w: "Taylor Swift", f: 55 },
  { q: "Drake the rapper?", c: "entertainment", k: "CA", d: "The most streamed rapper alive, and the loser of hip-hop's biggest public feud.", t: ["music", "rap"], w: "Drake (musician)", f: 45 },
  { q: "Kendrick Lamar?", c: "entertainment", k: "US", d: "The Pulitzer-winning rapper who won that feud in front of the Super Bowl.", t: ["music", "rap"], w: "Kendrick Lamar", f: 68 },
  { q: "Kim Kardashian?", c: "entertainment", k: "US", d: "The reality star turned billionaire, and the template for modern fame.", t: ["celebrity", "business"], w: "Kim Kardashian", f: 30 },
  { q: "JK Rowling?", c: "culture", k: "GB", d: "The author whose books defined a childhood and whose posts divided its readers.", t: ["books", "controversy"], w: "J. K. Rowling", f: 35 },
  { q: "Dave Chappelle?", c: "entertainment", k: "US", d: "The comedian whose specials keep becoming the argument itself.", t: ["comedy", "controversy"], w: "Dave Chappelle", f: 48 },
  { q: "Ricky Gervais?", c: "entertainment", k: "GB", d: "The comedian who hosts awards shows by insulting everyone in the room.", t: ["comedy", "britain"], w: "Ricky Gervais", f: 50 },
  { q: "MrBeast?", c: "entertainment", k: "US", d: "YouTube's biggest creator, giving away millions and answering for how it is filmed.", t: ["youtube", "creator"], w: "MrBeast", f: 55 },
  { q: "Logan Paul?", c: "entertainment", k: "US", d: "The YouTuber turned boxer and drinks mogul, with a trail of apologies behind him.", t: ["youtube", "boxing"], w: "Logan Paul", f: 25 },
  { q: "Cristiano Ronaldo?", c: "sport", k: "PT", d: "Football's record scorer, still playing and still arguing about who is best.", t: ["football", "goat"], w: "Cristiano Ronaldo", f: 62 },
  { q: "Lionel Messi?", c: "sport", k: "AR", d: "The World Cup winner most of the sport calls the greatest to play it.", t: ["football", "goat"], w: "Lionel Messi", f: 78 },
  { q: "LeBron James?", c: "sport", k: "US", d: "The NBA's all-time scorer, and a political voice his critics wish were quieter.", t: ["basketball", "nba"], w: "LeBron James", f: 55 },
  { q: "Conor McGregor?", c: "sport", k: "IE", d: "The fighter who built the biggest draw in the UFC and a civil verdict against himself.", t: ["ufc", "ireland"], w: "Conor McGregor", f: 30 },
  { q: "Novak Djokovic?", c: "sport", k: "RS", d: "The most decorated man in tennis, deported from Australia over a vaccine.", t: ["tennis", "vaccines"], w: "Novak Djokovic", f: 48 },
  { q: "Lance Armstrong?", c: "sport", k: "US", d: "The cyclist stripped of seven Tour titles after the sport's biggest doping case.", t: ["cycling", "doping"], w: "Lance Armstrong", f: 22 },
  { q: "Andrew Huberman?", c: "health", k: "US", d: "The neuroscientist whose protocols made morning sunlight a personality.", t: ["podcast", "wellness"], w: "Andrew Huberman", f: 45 },
  { q: "Gwyneth Paltrow?", c: "health", k: "US", d: "The actress whose wellness company has been fined for what it claimed.", t: ["wellness", "goop"], w: "Gwyneth Paltrow", f: 25 },
  { q: "Meghan Markle?", c: "culture", k: "US", d: "The actress turned duchess who left the royal family and said why on television.", t: ["royals", "media"], w: "Meghan, Duchess of Sussex", f: 28 },
  { q: "Prince Harry?", c: "culture", k: "GB", d: "The prince who wrote the memoir and sued the papers that made him famous.", t: ["royals", "britain"], w: "Prince Harry, Duke of Sussex", f: 35 },
  { q: "Pope Leo XIV?", c: "religion", k: "VA", d: "The first American pope, inheriting a church arguing with itself.", t: ["catholic", "church"], w: "Pope Leo XIV", f: 48 },
  { q: "The Dalai Lama?", c: "religion", k: "IN", d: "Tibet's exiled spiritual leader, and the succession Beijing intends to control.", t: ["tibet", "buddhism"], w: "14th Dalai Lama", f: 68 },
];
