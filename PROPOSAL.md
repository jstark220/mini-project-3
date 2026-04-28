# Mini Project #3: Proposal

## What I'm building

A "Who's That Pokémon?" browser-based guessing game where players identify silhouetted Pokémon, with a personal Pokédex view that builds up over time as players correctly guess Pokémon.

## Which API I'm using

PokéAPI: https://pokeapi.co/

## Why I chose this

A guessing game pushes me to use the API in two ways: pulling random data on demand for gameplay, and building a collection view that grows over time. That dual structure gives me a real reason to use localStorage and manage state across views, both of which I want hands-on practice with. PokéAPI is also key-free with rich data, so I can spend my time on JavaScript and design rather than authentication.

## Core features

1. Silhouette guessing game: Random Pokémon loads as a black silhouette; correct guesses reveal it with full stats.
2. Personal Pokédex: A second view of every Pokémon the user has guessed correctly, filterable by type with a detail page for each entry.
3. Persistent scoring: Score, current streak, and best streak saved in localStorage across sessions.
4. Difficulty modes: Toggle between Gen 1 only and all generations.
5. :Hint system: Optional hints (first letter, type, or generation) at the cost of points.

## What I don't know yet

I don't yet know how to manage application state across two views (game mode and Pokédex mode) without things getting tangled, since this is more state management than my previous projects required. This is my first time using an API, so I will have to ensure that it is intigrated properaly and in .gitignore. I am going to have AI help me with a PRD so that I can rely on Claude Code to not make any mistakes or go too far with the API and that it handles .gitignore properly. 