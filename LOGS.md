## Iteration 1

The API takes the name, ID, the official artwork sprite, the list of types, and the six base stats. I used the API in both the game and Pokedex detail page. Types and stats were arrays of objects, not simple lists, so I had to have AI console.log the whole response just to figure out where everything lived. AI helped me specifically with await; it explained that without it, the code would not wait for the API's response, so there would be a "pending" object instead of a Pokemon.

## Iteration 2

User inputs come in wiith the buttons like Skip, Next, and the difficulty radios all call my fetch function so the user pulls a new random Pokémon. For CSS, I used Flexbox for stuff laid out in rows like the score bar and the guess form. I also used CSS variables for the dark theme colors so I could change the whole palette by editing one place. I also used external style sheets for both CSS and JS. Beyond the dark theme, I used yellow accents to make the site look more interesting and have a Pokemon feel. I also used the type colors for the type badges for each pokemon.

## Iteration 3

The biggest extention I added was the personal Pokédex — every time you guess correctly, the Pokémon gets saved to localStorage with its sprite, types, and stats, so you can browse them later with a type filter and a search bar. I also added a detail modal that pops up when you click a card to show the full stat bars and generation info. I tested a lot of edge cases; catching the same Pokémon twice doesn't add it twice, an empty Pokédex shows a "go play" message, and if your filter rules everything out it says "no matches" instead of just looking broken. I also cleaned up weird names like "Mr. Mime" and "Farfetch'd" so when the user types "Mr Mime" it still matches the API. I was surprised at how much data is in a free API that doesn't need a key. Everything I could ever need Pokemon-related was in there!