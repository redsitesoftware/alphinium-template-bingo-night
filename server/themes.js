/**
 * Theme registry for the Bingo Night server.
 *
 * Each theme exposes a `calls` array — the pool of items that will be
 * shuffled into a room's callQueue when the room is created.
 *
 * Add new themes here as the game content expands.
 */

/** @type {Map<string, {id:string, name:string, calls:string[]}>} */
const themeRegistry = new Map();

/**
 * Register a theme so it can be looked up by ID.
 * @param {{id:string, name:string, calls:string[]}} theme
 */
function registerTheme(theme) {
  themeRegistry.set(theme.id, theme);
}

/**
 * Retrieve a theme by ID.
 * @param {string} id
 * @returns {{id:string, name:string, calls:string[]}|null}
 */
function getTheme(id) {
  return themeRegistry.get(id) || null;
}

/**
 * List all registered themes as {id, name} objects (no calls exposed).
 * @returns {{id:string, name:string}[]}
 */
function listThemes() {
  return Array.from(themeRegistry.values()).map(({ id, name }) => ({ id, name }));
}

// ── Built-in themes ───────────────────────────────────────────────────────────

registerTheme({
  id: 'office',
  name: 'Office Buzzword Bingo',
  calls: [
    'Synergy!', 'Circle back', 'Move the needle', 'Boil the ocean', 'Low-hanging fruit',
    'Deep dive', 'Pivot!', 'Blue sky thinking', 'Bandwidth', 'Take it offline',
    'Disruptive', 'Scalable solution', 'Touch base', 'Action items', 'Game changer',
    'Value add', 'Pain points', 'Drill down', 'Going forward', 'Leveraging',
    'Agile mindset', 'KPI', 'ROI focus', 'Stakeholder buy-in', 'Quick win',
    'Paradigm shift', 'Core competency', 'Thought leader', 'Ecosystem', 'Innovation hub',
  ],
});

registerTheme({
  id: 'xmas',
  name: 'Christmas Bingo',
  calls: [
    'Santa Claus', 'Reindeer', 'Mistletoe', 'Eggnog', 'Stocking',
    'Gingerbread', 'Tinsel', 'Candy cane', 'Snowflake', 'Elf on the shelf',
    'Christmas tree', 'Jingle bells', 'Wrapping paper', 'Secret Santa', 'Mulled wine',
    'Nativity', 'Boxing Day', 'Turkey dinner', 'Crackers', 'Carol singing',
    'Baubles', 'Star on top', 'Ugly jumper', 'White Christmas', 'Naughty list',
    'Coal in stocking', 'Ho ho ho', 'Chimney', 'Sleigh bells', 'North Pole',
  ],
});

registerTheme({
  id: 'aussie',
  name: 'Aussie Slang Bingo',
  calls: [
    "G'day mate", 'Arvo', 'Servo', 'Brekkie', 'No worries',
    "She'll be right", 'Crikey', 'Strewth', 'Reckon', 'Thongs',
    'Sunnies', 'Bikkie', 'Ute', 'Barbie', 'Snag',
    'Dead set', 'Fair dinkum', 'Ripper', 'Drongo', 'Larrikin',
    'Dingo', 'Billabong', 'Bush tucker', 'Goon bag', 'Flat white',
    'Dag', 'Dropbear', 'Maccas', 'Bottle-o', 'Smoko',
  ],
});

registerTheme({
  id: 'tech',
  name: 'Tech Buzzword Bingo',
  calls: [
    'Blockchain', 'AI/ML', 'Cloud native', 'DevOps', 'Kubernetes',
    'Microservices', 'API-first', 'Zero trust', 'LLM', 'Prompt engineer',
    'Digital twin', 'Edge computing', 'Serverless', 'Observability', 'GitOps',
    'Tech debt', 'Rubber duck', 'Stack overflow', 'npm install', 'It works locally',
    'Ship it', '10x engineer', 'Move fast', 'Agile sprint', 'Standup',
    'Pull request', 'Code review', 'Hot reload', 'Type safety', 'Ship or skip',
  ],
});

registerTheme({
  id: 'classic',
  name: 'Classic Bingo',
  calls: [
    "One! Number one — Kelly's eye!", 'Two — one little duck!',
    'Three — cup of tea!', 'Four — knock at the door!',
    'Five — man alive!', 'Six — half a dozen!',
    'Seven — lucky seven!', 'Eight — one fat lady!',
    "Nine — doctor's orders!", "Ten — (Prime Minister's) den!",
    'Eleven — legs eleven!', 'Twelve — one dozen!',
    'Thirteen — unlucky for some!', 'Fourteen — valentines day!',
    'Fifteen — young and keen!', 'Sixteen — sweet sixteen!',
    'Seventeen — dancing queen!', 'Eighteen — coming of age!',
    'Nineteen — goodbye teens!', 'Twenty — one score!',
    'Twenty-one — key of the door!', 'Twenty-two — two little ducks!',
    'Twenty-three — thee and me!', 'Twenty-four — two dozen!',
    'Twenty-five — duck and dive!', 'Twenty-six — pick and mix!',
    'Twenty-seven — gateway to heaven!', 'Twenty-eight — overweight!',
    'Twenty-nine — rise and shine!', 'Thirty — Burlington Bertie!',
  ],
});

registerTheme({
  id: 'office',
  name: 'Office Bingo',
  calls: [
    'Synergy!', 'Circle back', 'Move the needle', 'Boil the ocean', 'Low-hanging fruit',
    'Deep dive', 'Pivot!', 'Blue sky thinking', 'Bandwidth', 'Take it offline',
    'Disruptive', 'Scalable solution', 'Touch base', 'Action items', 'Game changer',
    'Value add', 'Pain points', 'Drill down', 'Going forward', 'Leveraging',
    'Agile mindset', 'KPI', 'ROI focus', 'Stakeholder buy-in', 'Quick win',
    'Paradigm shift', 'Core competency', 'Thought leader', 'Ecosystem', 'Innovation hub',
  ],
});

registerTheme({
  id: 'xmas',
  name: 'Christmas Bingo',
  calls: [
    'Santa Claus', 'Reindeer', 'Mistletoe', 'Eggnog', 'Stocking',
    'Gingerbread', 'Tinsel', 'Candy cane', 'Snowflake', 'Elf on the shelf',
    'Christmas tree', 'Jingle bells', 'Wrapping paper', 'Secret Santa', 'Mulled wine',
    'Nativity', 'Boxing Day', 'Turkey dinner', 'Crackers', 'Carol singing',
    'Baubles', 'Star on top', 'Ugly jumper', 'White Christmas', 'Naughty list',
    'Coal in stocking', 'Ho ho ho', 'Chimney', 'Sleigh bells', 'North Pole',
  ],
});

registerTheme({
  id: 'aussie',
  name: 'Aussie Bingo',
  calls: [
    "G'day mate", 'Arvo', 'Servo', 'Brekkie', 'No worries',
    "She'll be right", 'Crikey', 'Strewth', 'Reckon', 'Thongs',
    'Sunnies', 'Bikkie', 'Ute', 'Barbie', 'Snag',
    'Dead set', 'Fair dinkum', 'Ripper', 'Drongo', 'Larrikin',
    'Dingo', 'Billabong', 'Bush tucker', 'Goon bag', 'Flat white',
    'Dag', 'Dropbear', 'Maccas', 'Bottle-o', 'Smoko',
  ],
});

registerTheme({
  id: 'tech',
  name: 'Tech Bingo',
  calls: [
    'Blockchain', 'AI/ML', 'Cloud native', 'DevOps', 'Kubernetes',
    'Microservices', 'API-first', 'Zero trust', 'LLM', 'Prompt engineer',
    'Digital twin', 'Edge computing', 'Serverless', 'Observability', 'GitOps',
    'Tech debt', 'Rubber duck', 'Stack overflow', 'npm install', 'It works locally',
    'Ship it', '10x engineer', 'Move fast', 'Agile sprint', 'Standup',
    'Pull request', 'Code review', 'Hot reload', 'Type safety', 'Ship or skip',
  ],
});

registerTheme({
  id: 'pub-quiz',
  name: 'Pub Quiz Night',
  calls: [
    'Name the capital of France', 'Who painted the Mona Lisa?',
    'How many sides on a hexagon?', 'What year did WWII end?',
    'Largest planet in our solar system?', 'Who wrote Romeo and Juliet?',
    'Chemical symbol for gold?', 'How many strings on a guitar?',
    'Fastest land animal?', 'Currency of Japan?',
    'Who invented the telephone?', 'What is the square root of 144?',
    'Longest river in the world?', 'How many bones in the human body?',
    'Which country has the largest population?', "What's the boiling point of water?",
    'First man on the moon?', 'How many colours in a rainbow?',
    'What language has the most native speakers?', 'Highest mountain on Earth?',
    'Year the Berlin Wall fell?', 'How many planets in the solar system?',
    'Who was the first US President?', 'What is the speed of light (approx)?',
    'How many keys on a standard piano?',
  ],
});

/**
 * List all registered themes (id, name, emoji — no calls array).
 * @returns {{ id: string, name: string, emoji?: string }[]}
 */
function listThemes() {
  return Array.from(themeRegistry.values()).map(({ id, name, emoji }) =>
    emoji !== undefined ? { id, name, emoji } : { id, name }
  );
}

module.exports = { getTheme, registerTheme, listThemes, themeRegistry };
