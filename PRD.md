# PRD: Who's That Pokémon?

## Overview

A single-page web application that combines a Pokémon guessing game with a persistent personal Pokédex. Built as a mini project for OIM3690 (AI-Powered Web Development) at Babson College. Deployed on GitHub Pages.

The user is a beginner in JavaScript. Code should prioritize clarity over cleverness. Every function and non-trivial block must be commented with `//` explaining what it does and why.

## Technology constraints

- **Vanilla HTML, CSS, and JavaScript only.** No frameworks (no React, Vue, etc.), no build tools, no npm. The entire project must run as static files served from GitHub Pages.
- **No external libraries** unless explicitly justified. If a library is needed (e.g., for charts), use a CDN link in the HTML rather than a package manager.
- **Single-file or minimal-file structure.** Acceptable structures: one `index.html`, one `styles.css`, one `script.js`. Splitting JS into multiple files is acceptable only if it materially improves readability.
- **Modern but broadly compatible JavaScript.** Use `async`/`await`, `const`/`let`, template literals, and arrow functions. Avoid bleeding-edge syntax that would fail in older browsers.
- **No build step.** Code must run by opening `index.html` in a browser with no compilation.

## API

**PokéAPI** — [https://pokeapi.co/api/v2/](https://pokeapi.co/api/v2/)

Endpoints used:

- `GET /pokemon/{id-or-name}` → core Pokémon data including sprites, types, stats, and species reference
- `GET /pokemon-species/{id-or-name}` → generation info, flavor text, and other species-level data
- `GET /generation/{id}` → list of Pokémon belonging to a generation (used for difficulty filtering)

No API key required. No rate limits enforced for normal use, but the app should cache responses where reasonable to be a good citizen.

## Application structure

### Two primary views

The app has two views, toggled via a tab or button at the top of the page:

1. **Game view** (default on load)
2. **Pokédex view**

Only one view is visible at a time. State (score, streak, caught Pokémon) persists across view switches and across sessions via localStorage.

### Game view

**Layout (top to bottom):**
- Header with app title and view toggle
- Score display: current score, current streak, best streak, total caught
- Difficulty toggle: "Gen 1 (151)" or "All Gens (1025)"
- Silhouette display area (centered, prominent)
- Guess input field with submit button
- Hint button (reveals first letter, type, or generation, with point penalty)
- Skip button (advances to next Pokémon, breaks streak)
- Result message area (shows "Correct!" or "Wrong, try again")

**Game flow:**
1. On load (and after each correct guess or skip), fetch a random Pokémon based on current difficulty.
2. Show silhouette via CSS `filter: brightness(0)` on the official artwork sprite.
3. User types a guess and submits (Enter key or button click).
4. Normalize both guess and answer (lowercase, strip punctuation, handle special cases like "Mr. Mime," "Farfetch'd," "Nidoran-f").
5. On correct guess:
   - Remove silhouette filter with a brief CSS transition
   - Display Pokémon name, types (color-coded), and stat bars (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed)
   - Add Pokémon to caught collection in localStorage
   - Increment score and streak
   - Show "Next" button to load the next Pokémon
6. On wrong guess: show feedback, allow retry, do not advance.
7. On skip: reveal answer briefly, reset streak to 0, advance.

### Pokédex view

**Layout:**
- Header with app title and view toggle
- Filter bar: type filter (dropdown of all 18 types plus "All"), search by name (text input)
- Grid of caught Pokémon cards, each showing sprite, name, and types
- Empty state message if no Pokémon have been caught yet
- Click on a card opens a detail modal or expanded view

**Detail view:**
- Larger official artwork
- Name, ID number, types
- Full stat bars
- Generation info
- Close button to return to grid

## Required features (assignment rubric)

These are non-negotiable per the assignment requirements:

- ✅ Fetches data from external API using `fetch()`
- ✅ Displays data dynamically via JavaScript (no hard-coded Pokémon)
- ✅ Includes search/filter/browse (Pokédex view has type filter and name search)
- ✅ Loading state (spinner or "Loading..." while fetching)
- ✅ Error state (friendly message if API fails, with retry option)
- ✅ Responsive design (works on mobile and desktop)
- ✅ Deployed on GitHub Pages

## Planned features beyond the rubric

In rough order of priority:

1. **localStorage persistence** for caught Pokémon, score, streak, best streak, and difficulty preference.
2. **Detail view** when clicking a Pokédex entry.
3. **Visual stat bars** on reveal screen and detail view.
4. **Streak counter** with best-streak tracking.
5. **Difficulty modes** (Gen 1 vs. All Gens).
6. **Hint system** with point penalties.
7. **Type-based color coding** throughout the app (background tints, badges).
8. **Reveal animation** transitioning silhouette to full color.

## Data model

### localStorage schema

Single key: `whosThatPokemon_data`

Value (JSON-stringified):

```json
{
  "score": 0,
  "currentStreak": 0,
  "bestStreak": 0,
  "difficulty": "gen1",
  "caughtPokemon": [
    {
      "id": 25,
      "name": "pikachu",
      "types": ["electric"],
      "sprite": "https://...",
      "stats": { "hp": 35, "attack": 55, "defense": 40, "spAtk": 50, "spDef": 50, "speed": 90 },
      "generation": 1,
      "caughtAt": "2026-04-28T12:34:56Z"
    }
  ]
}
```

Caching caught Pokémon's full data (rather than just IDs) means the Pokédex view loads instantly without re-fetching from the API.

### In-memory state

A single state object in `script.js`:

```javascript
const state = {
  currentView: 'game',         // 'game' or 'pokedex'
  currentPokemon: null,        // the Pokémon currently being guessed
  isLoading: false,
  hasError: false,
  hintsUsedThisRound: 0,
  // plus persisted values loaded from localStorage on init
};
```

## Edge cases to handle

- **Special name characters:** Handle "Mr. Mime," "Farfetch'd," "Nidoran-f," "Nidoran-m," "Type: Null," "Mime Jr." in name normalization.
- **API failure:** Show error message with retry button. Do not advance the game on failure.
- **Empty Pokédex:** Friendly empty state in Pokédex view ("No Pokémon caught yet, go play!").
- **Filter with no results:** "No caught Pokémon match this filter."
- **localStorage unavailable:** App should still function in-session even if localStorage is disabled (e.g., private browsing).
- **Same Pokémon guessed twice:** Don't add duplicates to the caught list; if already caught, just increment score and streak.
- **Loading state flicker:** Ensure loading state is shown for any fetch over ~150ms; very fast fetches shouldn't cause UI flashes.

## Visual design direction

- **Clean, modern, slightly playful.** Not a kids' app, but should feel inviting.
- **Type-based color palette.** Use the canonical Pokémon type colors (e.g., fire = red-orange, water = blue, grass = green) for badges and accents.
- **Dark or light theme.** Pick one and execute it well; no theme toggle needed.
- **Stat bars** should be visually clear, with color coding by stat value (e.g., red for low, green for high).
- **Sprites:** Use official artwork (`sprites.other['official-artwork'].front_default`) when available, falling back to default sprite.

## Out of scope

- User accounts or any backend
- Multiplayer or social features
- Sound effects or music
- Battle simulator or team builder
- Pokémon evolution chains or move lists
- Localization beyond English

## Build phases (mapped to assignment iterations)

### Phase 1: Fetch and display
- Build basic HTML structure with game view only
- Fetch a random Pokémon from PokéAPI
- Display sprite (no silhouette yet) and name
- `console.log` the response to confirm understanding of JSON structure
- Hard-code difficulty to Gen 1 for now

### Phase 2: Interactivity and design
- Add silhouette effect with CSS filter
- Add guess input, submit logic, name normalization
- Add reveal animation, score, and streak
- Add loading and error states
- Style the game view with responsive CSS
- Add the Pokédex view with type filter
- Connect localStorage for caught Pokémon

### Phase 3: Polish and extend
- Add detail view modal for Pokédex entries
- Add hint system
- Add difficulty toggle
- Add stat bars with color coding
- Handle all edge cases above
- Run Lighthouse audit and fix issues
- Final visual polish

## File structure

```
/
├── index.html          # Single page with both views
├── styles.css          # All styling
├── script.js           # All game logic and API calls
├── PROPOSAL.md         # Assignment proposal
├── PRD.md              # This file
├── README.md           # Project description, live link, screenshot
└── .gitignore          # Files Git should ignore (see contents below)
```

## .gitignore contents

PokéAPI requires no key, so there are no secrets to protect in this project. The `.gitignore` exists to keep editor configs, OS metadata, and any future build artifacts out of the repo. Create a file named `.gitignore` in the project root with the following contents:

```
# macOS
.DS_Store
.AppleDouble
.LSOverride

# Windows
Thumbs.db
ehthumbs.db
Desktop.ini

# Editor and IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Logs and dependency directories (in case anything is added later)
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files (in case the project ever needs a key in the future)
.env
.env.local
.env.*.local

# OS and system files
*.log
*.tmp
```

## Code style requirements

- **Comment heavily.** Every function gets a comment explaining its purpose. Non-obvious lines get inline `//` comments.
- **Use descriptive names.** `fetchRandomPokemon()` not `getPokemon()`. `normalizeGuess()` not `clean()`.
- **Keep functions small.** A function should do one thing. If it's longer than ~30 lines, consider splitting.
- **Group related code.** Keep all API calls together, all DOM manipulation together, all state updates together.
- **Avoid premature abstraction.** Don't build a framework. Solve the problem at hand with straightforward code.
- **No `var`.** Use `const` by default, `let` only when reassignment is needed.