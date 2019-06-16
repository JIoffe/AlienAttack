# Alien Attack
## Retro-inspired FPS

This is an homage to games like Doom and Duke Nukem 3D - an in-browser first person shooter where you have to save the day from aliens and monsters!

This utilizes the Buld engine map format. The rendering code itself is custom, as is any of the assets.

Please do not redistribute the code outside of this repo.

## To Install and run
This requires NPM to run locally, as well as a local server.

Install dependencies via "npm install" and then execute "npm run build" to create the bundle.
Run the game from alien_attack.html from a local server.

## Controls
<ul>
<li>(Click on window to enable mouse look)</li>
<li>WASD - Move Forward / Strafe</li>
<li>CTRL/Mouse 1 - Fire</li>
<li>Space - Jump</li>
</ul>

*CTRL may interfere with browser hotkey combinations.*
The key bindings are hard-coded in **gameplay/input.js**.

## Additional libraries used:
- [glMatrix](http://glmatrix.net/)
- [libtess.js](https://github.com/brendankenny/libtess.js)
