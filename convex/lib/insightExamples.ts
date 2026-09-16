/**
 * The worked examples, as `question -> lens subject`.
 *
 * Apart from the instructions because together they run past the three hundred
 * lines a file in this project is allowed, and because these are the half that
 * changes: a question that comes back with the wrong chart is answered by
 * adding a line here, not by rewriting the rules above it.
 *
 * Grouped by the mistake each group prevents rather than by lens. The ordering
 * is the teaching.
 */

export const EXAMPLES = `A HUNDRED WORKED EXAMPLES

Named people, products and things -> topic_world, subject = the name
  which country hates donald trump -> topic_world "Donald Trump"
  who loves elon musk -> topic_world "Elon Musk"
  what does the world think of taylor swift -> topic_world "Taylor Swift"
  is jordan peterson popular -> topic_world "Jordan Peterson"
  who hates netanyahu the most -> topic_world "Benjamin Netanyahu"
  greta thunberg -> topic_world "Greta Thunberg"
  where is putin liked -> topic_world "Vladimir Putin"
  does anyone like mark zuckerberg -> topic_world "Mark Zuckerberg"
  countries that love messi -> topic_world "Lionel Messi"
  ronaldo or messi, who does the world prefer -> topic_world "Cristiano Ronaldo"
  how divisive is andrew tate -> topic_world "Andrew Tate"
  who backs zelensky -> topic_world "Volodymyr Zelenskyy"
  world opinion on xi jinping -> topic_world "Xi Jinping"
  who likes modi -> topic_world "Narendra Modi"
  is macron hated -> topic_world "Emmanuel Macron"
  feelings about kanye -> topic_world "Kanye West"
  what about the iphone -> topic_world "The iPhone"
  who hates the cybertruck -> topic_world "Cybertruck"
  is the nintendo switch loved -> topic_world "Nintendo Switch"
  what does the world think of tesla cars -> topic_world "Tesla Model 3"
  chatgpt opinions -> topic_world "ChatGPT"
  who hates printers -> topic_world "Printers"
  are crocs acceptable -> topic_world "Wearing Crocs"
  lego -> topic_world "Lego bricks"
  which countries like pineapple on pizza -> topic_world "Pineapple on pizza"
  is fast fashion hated -> topic_world "Fast fashion"
  who loves air fryers -> topic_world "Air fryers"
  opinions on vaping -> topic_world "Vape pens"
  where are suvs popular -> topic_world "Giant SUVs"
  who likes the boeing 737 max -> topic_world "Boeing 737 MAX"
  do people like open plan offices -> topic_world "Open-plan offices"
  world view on bitcoin -> topic_world "Bitcoin"
  is nuclear power popular -> topic_world "Nuclear power"
  what do people think about remote work -> topic_world "Working from home"
  who supports the death penalty -> topic_world "The death penalty"
  attitudes to abortion -> topic_world "Abortion"
  is immigration popular -> topic_world "Immigration"
  who hates crypto -> topic_world "Cryptocurrency"
  thoughts on veganism -> topic_world "Veganism"
  do people like ai art -> topic_world "AI art"

Superlatives about people and things -> topic_ranking
  who is the most hated person in the world -> topic_ranking person hate
  most hated person -> topic_ranking person hate
  who is the most loved person -> topic_ranking person love
  which person is most disliked -> topic_ranking person hate
  who do people hate the most -> topic_ranking person hate
  most hated man alive -> topic_ranking person hate
  best liked celebrity -> topic_ranking person love
  rank people by how hated they are -> topic_ranking person hate
  most hated thing here -> topic_ranking null hate
  what is the most popular thing on this site -> topic_ranking null love
  which topic is most hated -> topic_ranking null hate
  most hated product -> topic_ranking product hate
  best loved gadget -> topic_ranking product love
  worst thing you can buy -> topic_ranking product hate
  most hated politician -> topic_ranking politics hate
  best liked politician -> topic_ranking politics love
  most hated tech product -> topic_ranking product hate
  worst food opinion -> topic_ranking food hate
  most loved food -> topic_ranking food love
  most hated musician -> topic_ranking music hate
  worst thing in gaming -> topic_ranking gaming hate
  most hated car -> topic_ranking life hate
  who does everyone hate -> topic_ranking null hate
  what does everyone love -> topic_ranking null love
  rank the worst people -> topic_ranking null hate
  top five most hated -> topic_ranking null hate
  league table of hate -> topic_ranking null hate
  who is winning -> topic_ranking null love

Comparing kinds of subject, not names -> facet_split, subject = the attribute
  are women judged more harshly than men -> facet_split gender hate
  who does the world prefer, men or women -> facet_split gender love
  is gender a factor here -> facet_split gender hate
  which age group is most hated -> facet_split ageBand hate
  are older people liked more -> facet_split ageBand love
  do young figures do better -> facet_split ageBand love
  which profession is most hated -> facet_split role hate
  are politicians more hated than founders -> facet_split role hate
  do athletes get an easier ride -> facet_split role love
  are billionaires hated -> facet_split role hate
  left or right, who is more hated -> facet_split lean hate
  are right wing figures more disliked -> facet_split lean hate
  is the centre liked -> facet_split lean love
  which region is most disliked -> facet_split region hate
  which part of the world does best -> facet_split region love
  which nationality is most hated -> facet_split nationality hate
  which decade is most hated -> facet_split era hate
  are old things loved more than new ones -> facet_split era love
  are expensive things forgiven -> facet_split priceBand love
  is cheap stuff more hated -> facet_split priceBand hate
  which brand is most hated -> facet_split brand hate
  which ecosystem do people prefer -> facet_split platform love
  are cars more hated than phones -> facet_split form hate
  what kind of argument goes worst -> facet_split axis hate
  do niche things do better than global ones -> facet_split scale love
  is expert stuff better liked -> facet_split audience love
  people or products, which is more hated -> facet_split kind hate
  are crawled questions worse than written ones -> facet_split origin hate

Countries as the thing being judged -> verdict_ranking, subject = code
  who hates china -> verdict_ranking CN hate
  who hates israel -> verdict_ranking IL hate
  which country loves america most -> verdict_ranking US love
  world opinion of russia -> verdict_ranking RU hate
  who likes britain -> verdict_ranking GB love
  is india well liked -> verdict_ranking IN love
  who dislikes france -> verdict_ranking FR hate
  countries that hate iran -> verdict_ranking IR hate
  attitudes towards saudi arabia -> verdict_ranking SA hate
  who thinks best of japan -> verdict_ranking JP love
  the world on north korea -> verdict_ranking KP hate
  who hates the eu -> verdict_ranking EU hate
  how is germany seen -> verdict_ranking DE love
  who loves brazil -> verdict_ranking BR love
  world view of pakistan -> verdict_ranking PK hate

One country's own character -> nation_profile, subject = code
  what is ethiopia like -> nation_profile ET
  tell me about japan -> nation_profile JP
  how does america vote -> nation_profile US
  profile of turkey -> nation_profile TR
  what does korea think about everything -> nation_profile KR
  describe france's taste -> nation_profile FR
  is argentina positive or negative -> nation_profile AR
  who does ethiopia agree with -> nation_profile ET
  what makes brazil different -> nation_profile BR
  is greece contrarian -> nation_profile GR
  how negative is turkey -> nation_profile TR
  show me palestine -> nation_profile PS

Two countries -> pair_agreement, subject and other
  india vs pakistan -> pair_agreement IN PK
  do israel and palestine ever agree -> pair_agreement IL PS
  us versus china -> pair_agreement US CN
  compare france and germany -> pair_agreement FR DE
  korea and japan -> pair_agreement KR JP
  are britain and america alike -> pair_agreement GB US
  ethiopia against egypt -> pair_agreement ET EG
  brazil vs argentina -> pair_agreement BR AR
  russia and ukraine agreement -> pair_agreement RU UA
  turkey and greece -> pair_agreement TR GR

Whole subjects -> subject_leans
  what does the world hate most -> subject_leans null hate
  which subject is most loved -> subject_leans null love
  how does the world feel about politics -> subject_leans politics
  are people positive about ai -> subject_leans ai
  what about sport -> subject_leans sport
NOTE: a plural profession — footballers, musicians, CEOs, actors — is a
narrowing of people and NEVER a subject. "Football players popularity" is
topic_ranking with role:athlete, not subject_leans sport.
  food opinions -> subject_leans food
  what does america think by subject -> subject_leans US
  ethiopia by category -> subject_leans ET
  which topics divide people -> subject_leans null hate
  is religion divisive -> subject_leans religion
  how do people feel about money -> subject_leans money
  climate attitudes -> subject_leans climate

Geography first -> world_map
  show me the map -> world_map null
  map of the world's mood -> world_map null
  colour the map by how people feel about china -> world_map CN
  which regions are most negative -> world_map null
  map israel -> world_map IL
  world map of opinions -> world_map null

Superlatives and everything else -> extremes
  surprise me -> extremes
  what is interesting here -> extremes
  most loving country -> extremes love
  most negative country -> extremes hate
  who is the biggest hater -> extremes hate
  which two countries never agree -> extremes hate
  most contrarian country -> extremes
  give me a fun fact -> extremes
  what is the weirdest thing in this data -> extremes
  hello -> extremes
  who are you -> extremes
  what is the weather -> extremes

NAMES, OR KINDS
  "Who is the most hated person" wants one name at the top -> topic_ranking
  "Are women more hated than men" wants two groups compared -> facet_split
A question that names no subject and compares two sorts of subject is always
facet_split. A question that wants a winner is topic_ranking.

CHOOSING BETWEEN THE THREE TOPIC-SHAPED VIEWS
  One named thing, and where it stands -> topic_world "Donald Trump"
  Many named things, ranked against each other -> topic_ranking
  Countries ranked on their opinion of one country -> verdict_ranking
"Who hates Donald Trump" names a man and asks about countries -> topic_world.
"Who is the most hated person" names nobody and asks for a winner ->
topic_ranking. extremes is about COUNTRIES only — most loving country, biggest
feud — and must never be used for a superlative about a person or a thing.

CHOOSING BETWEEN topic_world AND verdict_ranking
This is the distinction that matters most.
  "who hates China" -> the thing judged is the country -> verdict_ranking CN
  "who hates Xi Jinping" -> the thing judged is a man -> topic_world "Xi Jinping"
  "world opinion of Israel" -> country -> verdict_ranking IL
  "world opinion of Netanyahu" -> person -> topic_world "Benjamin Netanyahu"
A named human being, company, product, film or policy is ALWAYS topic_world,
even when their country is obvious from the name.
`;
