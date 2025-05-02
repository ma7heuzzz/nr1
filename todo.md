# Nr1 Game - Fase 2 Development Checklist

## 1. SEO Optimization (Task 003)
- [ ] Add/Update `<title>` tag in `public/index.html`.
- [ ] Add `<meta name="description">` tag in `public/index.html`.
- [ ] Add `<meta name="keywords">` tag in `public/index.html`.
- [ ] Add Open Graph meta tags (og:title, og:description, og:image, og:url, og:type) in `public/index.html`.
- [ ] Add Twitter Card meta tags (twitter:card, twitter:title, twitter:description, twitter:image) in `public/index.html`.
- [ ] Implement Schema.org JSON-LD script for `VideoGame` in `public/index.html`.
- [ ] Create `public/robots.txt`.
- [ ] Generate `public/sitemap.xml`.
- [ ] Review `public/index.html` for semantic HTML structure.

## 2. Sound Effects (Task 004)
- [ ] Identify all necessary game actions requiring sound (e.g., move, win, lose, opponent move, game start, button click).
- [ ] Source or generate sound files for each action (use existing `click.mp3` where appropriate).
- [ ] Integrate sound playback into `public/js/gameUI.js` or `public/js/client.js` for relevant actions.
- [ ] Ensure sounds respect the setting toggle (see Task 3).

## 3. Settings Menu (Task 005)
- [ ] Add a gear icon button to the UI in `public/index.html` / `public/js/ui.js`.
- [ ] Create HTML structure for the settings modal/panel in `public/index.html`.
- [ ] Style the settings modal/panel in `public/css/style.scss`.
- [ ] Implement JavaScript logic in `public/js/ui.js` to show/hide the settings modal.
- [ ] Add a sound toggle switch/button in the settings modal.
- [ ] Implement sound enable/disable logic, storing preference in LocalStorage (`public/js/ui.js`, affect sound playback logic from Task 2).
- [ ] Add a fullscreen toggle button in the settings modal.
- [ ] Implement fullscreen request/exit logic using Fullscreen API (`public/js/ui.js`).

## 4. PWA Configuration (Task 006)
- [ ] Create `public/manifest.json` with appropriate fields (name, short_name, icons, start_url, display, background_color, theme_color). Use existing icons.
- [ ] Link `manifest.json` in `public/index.html`.
- [ ] Create a basic service worker file `public/sw.js` for app shell caching.
- [ ] Add script in `public/js/client.js` or `public/js/ui.js` to register `sw.js`.
- [ ] Add necessary meta tags for PWA compatibility (e.g., theme-color, viewport) in `public/index.html`.

## 5. Dynamic Board Sizes (Task 007)
- [ ] Update server logic (`server/server.js`, `server/roomManager.js`, `server/board.js`) to accept and handle board size parameter during room creation.
- [ ] Modify game state representation to include board size.
- [ ] Update client UI (`public/index.html`, `public/js/ui.js`) to allow selecting board size (e.g., dropdown or buttons) when creating a game.
- [ ] Update client game rendering (`public/js/gameUI.js`) to dynamically draw the board based on size.
- [ ] Update client game logic (`public/js/client.js`, `public/js/gameUI.js`) to handle interactions based on board size.
- [ ] Ensure server validates moves according to the correct board size.

## 6. Sharing Functionality (Task 008)
- [ ] Design UI elements for sharing (buttons/icons).
- [ ] Implement sharing logic in `public/js/ui.js` or `public/js/gameUI.js`.
- [ ] Use Web Share API where available.
- [ ] Implement fallback (e.g., copy link to clipboard) for browsers not supporting Web Share API.
- [ ] Generate dynamic share messages/links for:
    - [ ] Sharing the game itself (link to homepage).
    - [ ] Sharing a specific game room/invitation (requires server changes to handle invitation links).
    - [ ] Sharing a game result (e.g., "I won!").
- [ ] Add share options at appropriate points (e.g., game end screen, lobby).

## 7. Rules Explanation (Task 009)
- [ ] Add a "How to Play" or "?" icon button to the UI (`public/index.html` / `public/js/ui.js`).
- [ ] Create HTML structure for the rules modal/panel in `public/index.html`.
- [ ] Write clear and concise game rules.
- [ ] Style the rules modal/panel in `public/css/style.scss`.
- [ ] Implement JavaScript logic in `public/js/ui.js` to show/hide the rules modal.

## 8. Testing and Optimization (Tasks 010, 011)
- [ ] Test all new features thoroughly across different scenarios.
    - [ ] SEO tag rendering.
    - [ ] Sound playback and settings toggle.
    - [ ] Settings menu functionality (sound, fullscreen).
    - [ ] PWA installation and offline behavior (basic).
    - [ ] Dynamic board size creation and gameplay.
    - [ ] Sharing functionality (Web Share and fallback).
    - [ ] Rules display.
- [ ] Test responsiveness on different screen sizes.
- [ ] Optimize asset loading (images, sounds).
- [ ] Review JavaScript performance.

## 9. Code Structure for Future Games (Task 012)
- [ ] Review server-side game logic (`server/board.js`, `server/socketHandlers.js`) for modularity.
- [ ] Refactor if necessary to easily accommodate different game types later (e.g., abstracting game-specific logic).
- [ ] Review client-side rendering and logic (`public/js/gameUI.js`, `public/js/client.js`) for modularity.

## 10. Deployment and Validation (Tasks 013, 014)
- [ ] Prepare build/deployment files (if necessary, e.g., compiling SCSS).
- [ ] Deploy the updated code to the production environment (nr1.lat).
- [ ] Validate SEO using online tools (e.g., Google Rich Results Test, Facebook Sharing Debugger).
- [ ] Perform final functional testing on the live site.

## 11. Final Report (Task 015)
- [ ] Prepare a summary of implemented features and changes.
- [ ] Notify the user about the completion and provide access to the updated game.

