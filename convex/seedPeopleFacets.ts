/**
 * Who the hundred and ten people are, past their names.
 *
 * Four things per person, and only four, because these are the four that a
 * reading can group by and that are matters of public record: how they state
 * their own gender, the year they were born, what they are argued about *for*,
 * and where they sit politically when that is a public fact about them rather
 * than a guess. Everything else on a person's facets — their region, their era,
 * their age band, how far the argument reaches — is derived in
 * `backfill.markFacets` from these and from the votes themselves.
 *
 * Keyed on the question rather than the slug, so a row here cannot drift from
 * a row there: the question is what `seedPeopleTopics.ts` writes and what the
 * importer slugs.
 *
 * `lean` is "none" for the many people who have no public political position —
 * an athlete, a chief executive, a religious leader. It is not a guess at what
 * they privately think, and an absent lean is not a centrist one.
 *
 * See the note at the top of `lib/facets.ts` for what is deliberately absent
 * from this file and why.
 */

export type PersonFacet = {
  /** As publicly stated by the person themselves. */
  g: "female" | "male" | "nonbinary";
  /** Year of birth. The age band is computed from it against the clock. */
  b: number;
  /** What they are argued about for. */
  r: string;
  /** Where they stand, where they have said so in public. */
  l: "left" | "centre" | "right" | "none";
};

export const PEOPLE_FACETS: Record<string, PersonFacet> = {
  "Benjamin Netanyahu?": { g: "male", b: 1949, r: "head-of-state", l: "right" },
  "Donald Trump?": { g: "male", b: 1946, r: "head-of-state", l: "right" },
  "Vladimir Putin?": { g: "male", b: 1952, r: "head-of-state", l: "right" },
  "Volodymyr Zelenskyy?": { g: "male", b: 1978, r: "head-of-state", l: "centre" },
  "Xi Jinping?": { g: "male", b: 1953, r: "head-of-state", l: "none" },
  "Narendra Modi?": { g: "male", b: 1950, r: "head-of-state", l: "right" },
  "Recep Tayyip Erdogan?": { g: "male", b: 1954, r: "head-of-state", l: "right" },
  "Viktor Orban?": { g: "male", b: 1963, r: "head-of-state", l: "right" },
  "Javier Milei?": { g: "male", b: 1970, r: "head-of-state", l: "right" },
  "Kim Jong Un?": { g: "male", b: 1984, r: "head-of-state", l: "none" },
  "Mohammed bin Salman?": { g: "male", b: 1985, r: "head-of-state", l: "none" },
  "Lula da Silva?": { g: "male", b: 1945, r: "head-of-state", l: "left" },
  "Jair Bolsonaro?": { g: "male", b: 1955, r: "head-of-state", l: "right" },
  "Nicolas Maduro?": { g: "male", b: 1962, r: "head-of-state", l: "left" },
  "Rodrigo Duterte?": { g: "male", b: 1945, r: "head-of-state", l: "right" },
  "Emmanuel Macron?": { g: "male", b: 1977, r: "head-of-state", l: "centre" },
  "Giorgia Meloni?": { g: "female", b: 1977, r: "head-of-state", l: "right" },
  "Keir Starmer?": { g: "male", b: 1962, r: "head-of-state", l: "left" },
  "Boris Johnson?": { g: "male", b: 1964, r: "head-of-state", l: "right" },
  "Nigel Farage?": { g: "male", b: 1964, r: "politician", l: "right" },
  "Marine Le Pen?": { g: "female", b: 1968, r: "politician", l: "right" },
  "Abiy Ahmed?": { g: "male", b: 1976, r: "head-of-state", l: "centre" },
  "Imran Khan?": { g: "male", b: 1952, r: "head-of-state", l: "centre" },
  "Mahmoud Abbas?": { g: "male", b: 1935, r: "head-of-state", l: "centre" },
  "Itamar Ben-Gvir?": { g: "male", b: 1976, r: "politician", l: "right" },
  "Ursula von der Leyen?": { g: "female", b: 1958, r: "official", l: "centre" },
  "Justin Trudeau?": { g: "male", b: 1971, r: "head-of-state", l: "centre" },
  "JD Vance?": { g: "male", b: 1984, r: "politician", l: "right" },
  "Kamala Harris?": { g: "female", b: 1964, r: "politician", l: "left" },
  "Ron DeSantis?": { g: "male", b: 1978, r: "politician", l: "right" },
  "Alexandria Ocasio-Cortez?": { g: "female", b: 1989, r: "politician", l: "left" },
  "Bernie Sanders?": { g: "male", b: 1941, r: "politician", l: "left" },
  "Robert F. Kennedy Jr.?": { g: "male", b: 1954, r: "official", l: "none" },
  "Marjorie Taylor Greene?": { g: "female", b: 1974, r: "politician", l: "right" },
  "Nancy Pelosi?": { g: "female", b: 1940, r: "politician", l: "left" },
  "Elizabeth Warren?": { g: "female", b: 1949, r: "politician", l: "left" },
  "Zohran Mamdani?": { g: "male", b: 1991, r: "politician", l: "left" },
  "George Soros?": { g: "male", b: 1930, r: "investor", l: "left" },
  "Warren Buffett?": { g: "male", b: 1930, r: "investor", l: "none" },
  "Elon Musk?": { g: "male", b: 1971, r: "founder", l: "right" },
  "Jeff Bezos?": { g: "male", b: 1964, r: "founder", l: "none" },
  "Mark Zuckerberg?": { g: "male", b: 1984, r: "founder", l: "none" },
  "Peter Thiel?": { g: "male", b: 1967, r: "investor", l: "right" },
  "Bill Gates?": { g: "male", b: 1955, r: "founder", l: "centre" },
  "Jamie Dimon?": { g: "male", b: 1956, r: "executive", l: "none" },
  "Larry Fink?": { g: "male", b: 1952, r: "executive", l: "none" },
  "Bill Ackman?": { g: "male", b: 1966, r: "investor", l: "right" },
  "Cathie Wood?": { g: "female", b: 1955, r: "investor", l: "right" },
  "Ray Dalio?": { g: "male", b: 1949, r: "investor", l: "none" },
  "Ken Griffin?": { g: "male", b: 1968, r: "investor", l: "right" },
  "Jerome Powell?": { g: "male", b: 1953, r: "official", l: "none" },
  "Christine Lagarde?": { g: "female", b: 1956, r: "official", l: "centre" },
  "Michael Saylor?": { g: "male", b: 1965, r: "executive", l: "none" },
  "Changpeng Zhao?": { g: "male", b: 1977, r: "founder", l: "none" },
  "Vitalik Buterin?": { g: "male", b: 1994, r: "founder", l: "none" },
  "Bernard Arnault?": { g: "male", b: 1949, r: "executive", l: "none" },
  "Rupert Murdoch?": { g: "male", b: 1931, r: "executive", l: "right" },
  "Ben Shapiro?": { g: "male", b: 1984, r: "commentator", l: "right" },
  "Jordan Peterson?": { g: "male", b: 1962, r: "commentator", l: "right" },
  "Charlie Kirk?": { g: "male", b: 1993, r: "activist", l: "right" },
  "Joe Rogan?": { g: "male", b: 1967, r: "commentator", l: "none" },
  "Tucker Carlson?": { g: "male", b: 1969, r: "commentator", l: "right" },
  "Candace Owens?": { g: "female", b: 1989, r: "commentator", l: "right" },
  "Andrew Tate?": { g: "male", b: 1986, r: "commentator", l: "right" },
  "Piers Morgan?": { g: "male", b: 1965, r: "journalist", l: "centre" },
  "Bill Maher?": { g: "male", b: 1956, r: "commentator", l: "centre" },
  "John Oliver?": { g: "male", b: 1977, r: "commentator", l: "left" },
  "Hasan Piker?": { g: "male", b: 1991, r: "commentator", l: "left" },
  "Sam Harris?": { g: "male", b: 1967, r: "author", l: "centre" },
  "Richard Dawkins?": { g: "male", b: 1941, r: "academic", l: "none" },
  "Noam Chomsky?": { g: "male", b: 1928, r: "academic", l: "left" },
  "Slavoj Zizek?": { g: "male", b: 1949, r: "academic", l: "left" },
  "Jon Stewart?": { g: "male", b: 1962, r: "commentator", l: "left" },
  "Greta Thunberg?": { g: "female", b: 2003, r: "activist", l: "left" },
  "Sam Altman?": { g: "male", b: 1985, r: "founder", l: "none" },
  "Sundar Pichai?": { g: "male", b: 1972, r: "executive", l: "none" },
  "Satya Nadella?": { g: "male", b: 1967, r: "executive", l: "none" },
  "Tim Cook?": { g: "male", b: 1960, r: "executive", l: "none" },
  "Jensen Huang?": { g: "male", b: 1963, r: "founder", l: "none" },
  "Marc Andreessen?": { g: "male", b: 1971, r: "investor", l: "right" },
  "Geoffrey Hinton?": { g: "male", b: 1947, r: "academic", l: "none" },
  "Yann LeCun?": { g: "male", b: 1960, r: "academic", l: "none" },
  "Demis Hassabis?": { g: "male", b: 1976, r: "founder", l: "none" },
  "Edward Snowden?": { g: "male", b: 1983, r: "activist", l: "none" },
  "Julian Assange?": { g: "male", b: 1971, r: "journalist", l: "none" },
  "Pavel Durov?": { g: "male", b: 1984, r: "founder", l: "none" },
  "Jack Dorsey?": { g: "male", b: 1976, r: "founder", l: "none" },
  "Palmer Luckey?": { g: "male", b: 1992, r: "founder", l: "right" },
  "Kanye West?": { g: "male", b: 1977, r: "musician", l: "right" },
  "Taylor Swift?": { g: "female", b: 1989, r: "musician", l: "left" },
  "Drake the rapper?": { g: "male", b: 1986, r: "musician", l: "none" },
  "Kendrick Lamar?": { g: "male", b: 1987, r: "musician", l: "none" },
  "Kim Kardashian?": { g: "female", b: 1980, r: "founder", l: "none" },
  "JK Rowling?": { g: "female", b: 1965, r: "author", l: "centre" },
  "Dave Chappelle?": { g: "male", b: 1973, r: "actor", l: "none" },
  "Ricky Gervais?": { g: "male", b: 1961, r: "actor", l: "none" },
  "MrBeast?": { g: "male", b: 1998, r: "founder", l: "none" },
  "Logan Paul?": { g: "male", b: 1995, r: "commentator", l: "none" },
  "Cristiano Ronaldo?": { g: "male", b: 1985, r: "athlete", l: "none" },
  "Lionel Messi?": { g: "male", b: 1987, r: "athlete", l: "none" },
  "LeBron James?": { g: "male", b: 1984, r: "athlete", l: "left" },
  "Conor McGregor?": { g: "male", b: 1988, r: "athlete", l: "right" },
  "Novak Djokovic?": { g: "male", b: 1987, r: "athlete", l: "none" },
  "Lance Armstrong?": { g: "male", b: 1971, r: "athlete", l: "none" },
  "Andrew Huberman?": { g: "male", b: 1975, r: "academic", l: "none" },
  "Gwyneth Paltrow?": { g: "female", b: 1972, r: "actor", l: "none" },
  "Meghan Markle?": { g: "female", b: 1981, r: "royal", l: "none" },
  "Prince Harry?": { g: "male", b: 1984, r: "royal", l: "none" },
  "Pope Leo XIV?": { g: "male", b: 1955, r: "religious", l: "none" },
  "The Dalai Lama?": { g: "male", b: 1935, r: "religious", l: "none" },
};
