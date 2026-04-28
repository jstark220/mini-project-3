// Who's That Pokémon? — main script.
// This file runs after the HTML is parsed (because of the `defer` attribute on
// the <script> tag), so DOM lookups are safe at the top level.
//
// Current scope: fetch a random Gen 1 Pokémon, show it as a silhouette, let
// the user guess (with skip + first-letter hint). On correct or skip, reveal
// the sprite + name + colored type badges and surface a Next button. Score,
// streak, best streak, and caught list persist across sessions via localStorage.
// Still TODO: Pokédex view (Phase 2c), difficulty toggle + stat bars (Phase 3).

// ===== Constants =====
// Base URL for every PokéAPI request. Centralized here so a future change
// (e.g., a different version) only needs one edit.
const POKEMON_API_BASE = "https://pokeapi.co/api/v2";
// Highest valid Pokémon ID in Generation 1. We hard-code Gen 1 in Phase 1; the
// difficulty toggle that picks between Gen 1 and all 1025 lands in Phase 3.
const GEN_1_MAX_ID = 151;
// Canonical list of all 18 Pokémon types. Used to populate the Pokédex
// type-filter dropdown without hard-coding 18 <option> tags in the HTML.
const ALL_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

// ===== Persistence =====
// Single localStorage key holds everything: score, streaks, difficulty, and
// the caught Pokémon list. Keeping it under one key makes load/save a single
// pair of functions instead of one per field.
const STORAGE_KEY = "whosThatPokemon_data";

// Defaults used both on first visit (no saved data) and as a fallback when a
// future schema change adds a field that's missing from old saved data.
function defaultState() {
  return {
    score: 0,
    currentStreak: 0,
    bestStreak: 0,
    difficulty: "gen1",
    caughtPokemon: [],
  };
}

// In-memory copy of what's persisted. Game handlers mutate this then call
// savePersistedState() to flush to localStorage.
let persistedState = defaultState();

// Pull saved data (if any) into persistedState. Wrapped in try/catch so the
// app still runs in private browsing where localStorage may throw.
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return; // first-time visitor — defaults are fine
    const parsed = JSON.parse(raw);
    // Spread defaults first so any new fields we add later get sane values
    // even when the saved data predates them.
    persistedState = { ...defaultState(), ...parsed };
  } catch (error) {
    console.warn("Could not load saved data, using defaults:", error);
  }
}

// Flush persistedState to localStorage. Safe to call after any mutation.
function savePersistedState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (error) {
    console.warn("Could not save data:", error);
  }
}

// ===== DOM references =====
// Look up every element we'll need once at startup, instead of querying inside
// every event handler. This is faster and makes typos surface immediately.
const tabGameButton = document.getElementById("tab-game");
const tabPokedexButton = document.getElementById("tab-pokedex");
const viewGame = document.getElementById("view-game");
const viewPokedex = document.getElementById("view-pokedex");
const pokemonSprite = document.getElementById("pokemon-sprite");
const loadingIndicator = document.getElementById("loading-indicator");
const errorIndicator = document.getElementById("error-indicator");
const retryButton = document.getElementById("retry-button");
const revealPanel = document.getElementById("reveal-panel");
const revealName = document.getElementById("reveal-name");
const revealTypes = document.getElementById("reveal-types");
const guessForm = document.getElementById("guess-form");
const guessInput = document.getElementById("guess-input");
const resultMessage = document.getElementById("result-message");
const hintButton = document.getElementById("hint-button");
const skipButton = document.getElementById("skip-button");
const nextButton = document.getElementById("next-button");
const scoreValue = document.getElementById("score-value");
const streakValue = document.getElementById("streak-value");
const bestStreakValue = document.getElementById("best-streak-value");
const caughtCount = document.getElementById("caught-count");
const typeFilter = document.getElementById("type-filter");
const nameSearch = document.getElementById("name-search");
const pokedexGrid = document.getElementById("pokedex-grid");
const pokedexEmpty = document.getElementById("pokedex-empty");

// ===== State =====
// The Pokémon currently shown to the user. Stored at module scope so the
// guess/skip/hint handlers can compare against (or reveal) the right answer.
let currentPokemon = null;

// ===== View toggle =====
// Show the requested view and hide the other. Called by the tab buttons.
// `viewName` is either "game" or "pokedex".
function showView(viewName) {
  // Toggle the .is-hidden CSS class on each view section.
  viewGame.classList.toggle("is-hidden", viewName !== "game");
  viewPokedex.classList.toggle("is-hidden", viewName !== "pokedex");

  // Move the .is-active highlight to the matching tab button.
  tabGameButton.classList.toggle("is-active", viewName === "game");
  tabPokedexButton.classList.toggle("is-active", viewName === "pokedex");

  // When switching to the Pokédex, refresh the grid so newly-caught Pokémon
  // appear without needing a page reload.
  if (viewName === "pokedex") {
    renderPokedex();
  }
}

// Wire the tab buttons. Each click switches which view is visible.
tabGameButton.addEventListener("click", () => showView("game"));
tabPokedexButton.addEventListener("click", () => showView("pokedex"));

// ===== Pokédex view =====

// Populate the type-filter dropdown with all 18 Pokémon types. Called once
// at startup so the dropdown is ready before the user clicks the tab.
function populateTypeFilter() {
  for (const type of ALL_TYPES) {
    const option = document.createElement("option");
    option.value = type;
    // Capitalize the first letter for display ("fire" → "Fire").
    option.textContent = type[0].toUpperCase() + type.slice(1);
    typeFilter.appendChild(option);
  }
}

// Apply the current type-filter and search-term to the caught list. Returns a
// new array — the source list in persistedState stays untouched.
function getFilteredCaught() {
  const selectedType = typeFilter.value; // "all" or a specific type slug
  const searchTerm = nameSearch.value.toLowerCase().trim();
  return persistedState.caughtPokemon.filter((p) => {
    const matchesType = selectedType === "all" || p.types.includes(selectedType);
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
    return matchesType && matchesSearch;
  });
}

// Build a single Pokédex card element for one caught Pokémon. Returned as
// a detached DOM node; renderPokedex appends it to the grid.
function buildPokedexCard(pokemon) {
  const card = document.createElement("div");
  card.className = "pokedex-card";
  // Stash the ID so Phase 2d's detail-modal click handler can look up the
  // full record without rebuilding it.
  card.dataset.pokemonId = pokemon.id;

  const sprite = document.createElement("img");
  sprite.className = "pokedex-card-sprite";
  sprite.src = pokemon.sprite;
  sprite.alt = pokemon.name;

  const name = document.createElement("h3");
  name.className = "pokedex-card-name";
  name.textContent = pokemon.name;

  const types = document.createElement("div");
  types.className = "pokedex-card-types";
  for (const type of pokemon.types) {
    const badge = document.createElement("span");
    badge.className = `type-badge type-${type}`;
    badge.textContent = type;
    types.appendChild(badge);
  }

  card.appendChild(sprite);
  card.appendChild(name);
  card.appendChild(types);
  return card;
}

// Render the Pokédex grid based on the current caught list and active filters.
// Uses two distinct empty-state messages: one for "you haven't caught anything
// yet" and one for "your filter excludes everything you've caught."
function renderPokedex() {
  pokedexGrid.innerHTML = "";

  // Case 1: nothing caught at all — invite the user to play.
  if (persistedState.caughtPokemon.length === 0) {
    pokedexEmpty.textContent = "No Pokémon caught yet — go play!";
    pokedexEmpty.hidden = false;
    return;
  }

  // Case 2: caught some, but the current filter rules them all out.
  const filtered = getFilteredCaught();
  if (filtered.length === 0) {
    pokedexEmpty.textContent = "No caught Pokémon match this filter.";
    pokedexEmpty.hidden = false;
    return;
  }

  // Case 3: at least one match — render cards in stable Pokédex-number order.
  pokedexEmpty.hidden = true;
  const sorted = [...filtered].sort((a, b) => a.id - b.id);
  for (const pokemon of sorted) {
    pokedexGrid.appendChild(buildPokedexCard(pokemon));
  }
}

// Re-render whenever the user changes filters. "input" fires on every
// keystroke for the search box; "change" fires on selection for the dropdown.
typeFilter.addEventListener("change", renderPokedex);
nameSearch.addEventListener("input", renderPokedex);

// ===== Name normalization =====
// Strip everything except letters and digits, then lowercase. This makes
// "Mr. Mime", "mr-mime", and "MR MIME" all match the API slug "mr-mime"
// once both sides are normalized to "mrmime". Also handles Farfetch'd,
// Nidoran-f/m, Type: Null, Ho-Oh, Porygon-Z, etc.
function normalizeName(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ===== API =====
// Pick a random Pokémon ID within Gen 1 (1–151 inclusive).
// Math.random() returns a float in [0, 1), so multiplying by 151 and flooring
// gives 0–150; adding 1 shifts to 1–151.
function getRandomGen1Id() {
  return Math.floor(Math.random() * GEN_1_MAX_ID) + 1;
}

// Fetch a single Pokémon's data from PokéAPI. Throws if the network is down or
// the API returns a non-2xx status, so the caller can show an error state.
async function fetchPokemon(id) {
  const response = await fetch(`${POKEMON_API_BASE}/pokemon/${id}`);
  // `fetch` only rejects on network failure — a 404 still resolves, so we
  // have to check `ok` ourselves and throw to unify the error path.
  if (!response.ok) {
    throw new Error(`PokéAPI returned ${response.status} for id ${id}`);
  }
  return response.json();
}

// Pull the best-quality sprite URL from the API response. Official artwork is
// preferred; we fall back to the default sprite if it's missing (rare, but
// some Pokémon don't have official artwork in the dataset).
function getSpriteUrl(pokemon) {
  return (
    pokemon.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default
  );
}

// ===== Score bar + caught helpers =====

// Reflect persistedState into the header score bar. Call after any mutation.
function updateScoreBar() {
  scoreValue.textContent = persistedState.score;
  streakValue.textContent = persistedState.currentStreak;
  bestStreakValue.textContent = persistedState.bestStreak;
  caughtCount.textContent = persistedState.caughtPokemon.length;
}

// Reduce a PokéAPI Pokémon's stat array to a friendly object.
// API stat slugs (e.g. "special-attack") become camelCase keys (spAtk),
// which match the schema in the PRD's localStorage spec.
function extractStats(pokemon) {
  const keyMap = {
    "hp": "hp",
    "attack": "attack",
    "defense": "defense",
    "special-attack": "spAtk",
    "special-defense": "spDef",
    "speed": "speed",
  };
  const stats = {};
  for (const slot of pokemon.stats) {
    const key = keyMap[slot.stat.name];
    if (key) stats[key] = slot.base_stat;
  }
  return stats;
}

// Add a Pokémon to the caught collection. No-op if already caught — the PRD
// calls for the Pokédex to behave like a set, no duplicates.
function addToCaught(pokemon) {
  if (persistedState.caughtPokemon.some((p) => p.id === pokemon.id)) return;
  persistedState.caughtPokemon.push({
    id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((slot) => slot.type.name),
    sprite: getSpriteUrl(pokemon),
    stats: extractStats(pokemon),
    caughtAt: new Date().toISOString(),
  });
}

// ===== Rendering =====
// Set up a fresh round: load the new sprite as a silhouette, hide the reveal
// panel, clear the input + result message, and re-enable buttons that get
// disabled at end-of-round (hint, next).
function renderPokemon(pokemon) {
  pokemonSprite.src = getSpriteUrl(pokemon);
  // Don't leak the answer via alt text. We'll update alt on reveal.
  pokemonSprite.alt = "Mystery Pokémon";
  pokemonSprite.classList.add("is-silhouette");
  pokemonSprite.hidden = false;

  // Hide the reveal panel and clear its contents until the user guesses or skips.
  revealPanel.hidden = true;
  revealName.textContent = "";
  revealTypes.innerHTML = "";

  // Reset the input + result message for a fresh round.
  guessInput.value = "";
  guessInput.disabled = false;
  guessInput.focus();
  resultMessage.textContent = "";
  resultMessage.classList.remove("is-correct", "is-wrong");

  // Hint is one-per-round; re-enable for the new Pokémon. Next stays hidden
  // until the user either guesses correctly or skips.
  hintButton.disabled = false;
  nextButton.hidden = true;
}

// Reveal the answer: drop the silhouette, fill the reveal panel with name +
// colored type badges, lock further input, and surface the "Next" button.
// Called from both correct-guess and skip paths.
function revealAnswer() {
  pokemonSprite.classList.remove("is-silhouette");
  pokemonSprite.alt = currentPokemon.name; // accessibility: describe what's visible

  revealName.textContent = currentPokemon.name;

  // Render each type as a colored badge. Colors live in styles.css under
  // .type-{name} classes; we just attach the right class here.
  revealTypes.innerHTML = "";
  for (const slot of currentPokemon.types) {
    const badge = document.createElement("span");
    badge.className = `type-badge type-${slot.type.name}`;
    badge.textContent = slot.type.name;
    revealTypes.appendChild(badge);
  }
  revealPanel.hidden = false;

  // Lock the round so the user can't keep guessing or hinting after reveal.
  guessInput.disabled = true;
  hintButton.disabled = true;
  nextButton.hidden = false;
}

// ===== Loading flow =====
// Show the loading indicator, hide everything else, then wait for a fresh
// Pokémon. On success we render it; on failure we surface the error UI.
async function loadNewPokemon() {
  // Reset the stage so the previous Pokémon (or stale error) doesn't linger
  // while the next request is in flight.
  loadingIndicator.hidden = false;
  errorIndicator.hidden = true;
  pokemonSprite.hidden = true;
  revealPanel.hidden = true;
  // Clear the previous round's Pokémon so handlers don't act on stale data
  // if the fetch fails or is slow.
  currentPokemon = null;

  try {
    const id = getRandomGen1Id();
    const pokemon = await fetchPokemon(id);
    // Log the full response so we can inspect the JSON shape in DevTools.
    // Useful while learning the API; safe to remove later.
    console.log("Fetched Pokémon:", pokemon);
    currentPokemon = pokemon;
    renderPokemon(pokemon);
  } catch (error) {
    // Log to console for debugging, then show a friendly retry UI to the user.
    console.error("Failed to fetch Pokémon:", error);
    errorIndicator.hidden = false;
  } finally {
    // Whether we succeeded or errored, the loading indicator should go away.
    loadingIndicator.hidden = true;
  }
}

// Wire the retry button so a transient network blip doesn't soft-lock the app.
retryButton.addEventListener("click", loadNewPokemon);

// ===== Game flow handlers =====

// Submit the user's guess. The form fires "submit" on Enter or button click,
// so wiring to "submit" handles both with one listener.
guessForm.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the browser from trying to navigate
  if (!currentPokemon) return; // mid-load — ignore
  const userGuess = normalizeName(guessInput.value);
  if (!userGuess) return; // empty input — ignore

  const answer = normalizeName(currentPokemon.name);
  if (userGuess === answer) {
    // Correct: bump score + streak, lift the best-streak ceiling if needed,
    // catch the Pokémon (no-op if already caught), then persist.
    persistedState.score += 1;
    persistedState.currentStreak += 1;
    if (persistedState.currentStreak > persistedState.bestStreak) {
      persistedState.bestStreak = persistedState.currentStreak;
    }
    addToCaught(currentPokemon);
    savePersistedState();
    updateScoreBar();

    resultMessage.textContent = "Correct!";
    resultMessage.classList.remove("is-wrong");
    resultMessage.classList.add("is-correct");
    revealAnswer();
  } else {
    // Wrong: don't touch score or streak — wrong guesses just allow retry.
    resultMessage.textContent = "Wrong, try again.";
    resultMessage.classList.remove("is-correct");
    resultMessage.classList.add("is-wrong");
  }
});

// Skip: give up on the current Pokémon and reveal the answer.
// Skipping breaks the streak; score and best-streak are unaffected.
skipButton.addEventListener("click", () => {
  if (!currentPokemon) return;
  persistedState.currentStreak = 0;
  savePersistedState();
  updateScoreBar();

  resultMessage.textContent = `It was ${currentPokemon.name}.`;
  resultMessage.classList.remove("is-correct", "is-wrong");
  revealAnswer();
});

// Hint: show the first letter. Each hint costs 1 point, floored at 0 so the
// score can't go negative. Disabled after use so it can't be spammed.
hintButton.addEventListener("click", () => {
  if (!currentPokemon) return;
  persistedState.score = Math.max(0, persistedState.score - 1);
  savePersistedState();
  updateScoreBar();

  const firstLetter = currentPokemon.name.charAt(0).toUpperCase();
  resultMessage.textContent = `Hint: starts with "${firstLetter}".`;
  resultMessage.classList.remove("is-correct", "is-wrong");
  hintButton.disabled = true;
});

// Next: load a fresh random Pokémon for the next round.
nextButton.addEventListener("click", loadNewPokemon);

// ===== Startup =====
console.log("Who's That Pokémon? — script.js loaded.");
// Pull saved progress from localStorage and reflect it in the score bar
// before the first fetch lands, so returning users see their stats immediately.
loadPersistedState();
updateScoreBar();
// Build the type-filter dropdown once so it's ready when the user opens the
// Pokédex view. The grid itself renders on first tab switch.
populateTypeFilter();
// Kick off the first fetch.
loadNewPokemon();
