// @ts-check

"use strict";

import { collisions } from "./src/collisions.js";

const offset = {
  x: -735,
  y: -600,
};

// turn the collision 1d array into a 2d array
const MAP_TILE_WIDTH = 70;
const collisionsMap = [];

for (let i = 0; i < collisions.length; i += MAP_TILE_WIDTH) {
  collisionsMap.push(collisions.slice(i, 70 + i));
}

const app = () => {
  const canvas = document.querySelector("canvas");

  /**
   * Returns an object that provides methods and properties
   * for drawing and manipulating images and graphics on a
   * canvas element in a document. A context object
   * includes information about colors, line widths, fonts,
   * and other graphic parameters that can be drawn on a canvas.
   *
   * sets the rendered for the canvas, could be any of these options below
   * bitmaprenderer
   * webgl
   * webgl2
   */
  const context = canvas.getContext("2d");

  canvas.width = 1024;
  canvas.height = 576;

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);

  class Boundary {
    static tileSize = 48;
    position = {
      x: 0,
      y: 0,
    };
    width;
    height;

    constructor({ position: { x, y } }) {
      this.position = {
        x,
        y,
      };
      const tileSize = 48;

      this.width = tileSize;
      this.height = tileSize;
    }

    render() {
      context.fillStyle = "red";
      context.fillRect(
        this.position.x,
        this.position.y,
        this.width,
        this.height
      );
    }
  }

  const boundaries = [];

  collisionsMap.forEach((row, currentRowIndex) => {
    row.forEach((symbol, currentSymbolIndex) => {
      symbol === 1025 &&
        boundaries.push(
          new Boundary({
            position: {
              x: currentSymbolIndex * Boundary.tileSize + offset.x,
              y: currentRowIndex * Boundary.tileSize + offset.y,
            },
          })
        );
    });
  });

  class Sprite {
    width;
    height;
    position = {
      x: 0,
      y: 0,
    };
    image = new Image();
    frames = {
      max: 1,
      current: 0,
      elapsed: 0,
      rate: 4,
    };
    moving = false;
    sprites = {};

    constructor({
      position: { y, x },
      image,
      frames = { max: 1 },
      sprites = {},
    }) {
      this.position = {
        x,
        y,
      };
      this.image.src = image;
      this.frames = { ...frames, current: 0, elapsed: 0, rate: 4 };

      this.image.onload = () => {
        this.width = this.image.width / this.frames.max;
        this.height = this.image.height;
      };
      this.moving = false;
      this.sprites = sprites;
    }

    setImage(url) {
      const img = new Image();
      img.src = url;

      img.onload = () => {
        this.image = img;
      };
    }

    // integration of the sprite with canvas
    render() {
      // context.drawImage(this.image, this.position.x, this.position.y);
      context.drawImage(
        this.image,
        this.frames.current * this.width,
        0,
        this.image.width / this.frames.max,
        this.image.height,
        this.position.x,
        this.position.y,
        this.image.width / this.frames.max,
        this.image.height
      );

      if (!this.moving) {
        return;
      }

      if (this.frames.max > 1) {
        this.frames.elapsed += 1;
      }

      if (this.frames.elapsed % this.frames.rate === 0) {
        if (this.frames.current < this.frames.max - 1) this.frames.current += 1;
        else this.frames.current = 0;
      }
    }
  }

  const background = new Sprite({
    position: offset,
    image: "./src/assets/tiled/Pellet-Town.png",
  });

  const foreground = new Sprite({
    position: offset,
    image: "./src/assets/tiled/PelletTownForegroundObjects.png",
  });

  const playerSpriteWidth = 192;
  const playerSpriteHeght = 68;

  const player = new Sprite({
    position: {
      x: canvas.width / 2 - playerSpriteWidth / 4 / 2,
      y: canvas.height / 2 - playerSpriteHeght / 2,
    },
    frames: {
      max: 4,
    },
    sprites: {
      up: "./src/assets/images/playerUp.png",
      left: "./src/assets/images/playerLeft.png",
      right: "./src/assets/images/playerRight.png",
      down: "./src/assets/images/playerDown.png",
    },
    image: "./src/assets/images/playerDown.png",
  });

  let lastKey = "";
  let sprint = false;
  let crouching = false;
  const keys = {
    ArrowUp: { pressed: false },
    ArrowLeft: { pressed: false },
    ArrowRight: { pressed: false },
    ArrowDown: { pressed: false },

    a: { pressed: false },
    w: { pressed: false },
    d: { pressed: false },
    s: { pressed: false },
  };

  const testBoundary = new Boundary({
    position: {
      x: 400,
      y: 400,
    },
  });

  boundaries.push(testBoundary);

  const movables = [background, ...boundaries, foreground];
  const rectangularColission = ({ rectangle1, rectangle2 }) => {
    const hitLeftSide =
      rectangle1.position.x + rectangle1.width >= rectangle2.position.x;
    const hitRightSide =
      rectangle1.position.x <= rectangle2.position.x + rectangle2.width;

    // i add extra 15% to only start the hitbox by the foot and not the head
    const hitBottom =
      rectangle1.position.y + rectangle1.position.y * 0.15 <=
      rectangle2.position.y + rectangle2.height;
    const hitTop =
      rectangle1.position.y + rectangle1.height >= rectangle2.position.y;

    return hitLeftSide && hitRightSide && hitBottom && hitTop;
  };
  const animate = () => {
    // find way to handle FPS here
    window.requestAnimationFrame(animate);

    background.render();

    testBoundary.render();
    player.render();

    boundaries.forEach((boundary) => boundary.render());

    foreground.render();

    let step = 3;
    player.frames.rate = 4;
    if (crouching) {
      step = step / 2;
      player.frames.rate = 10;
    }
    if (sprint) {
      step *= 2.4;
      player.frames.rate = 2;
    }

    let moving = true;
    player.moving = false;

    if (keys.w.pressed && lastKey === "w") {
      player.moving = true;
      player.setImage(player.sprites.up);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x,
                y: boundary.position.y + step,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((movable) => (movable.position.y += step));
      return;
    }

    if (keys.d.pressed && lastKey === "d") {
      player.moving = true;
      player.setImage(player.sprites.right);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x - step,
                y: boundary.position.y,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((boundary) => (boundary.position.x -= step));
      return;
    }

    if (keys.s.pressed && lastKey === "s") {
      player.moving = true;
      player.setImage(player.sprites.down);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x,
                y: boundary.position.y - step,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((boundary) => (boundary.position.y -= step));
      return;
    }

    if (keys.a.pressed && lastKey === "a") {
      player.moving = true;
      player.setImage(player.sprites.left);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x + step,
                y: boundary.position.y,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((boundary) => (boundary.position.x += step));

      return;
    }

    //======================
    if (keys.w.pressed || keys.ArrowUp.pressed) {
      player.moving = true;
      player.setImage(player.sprites.up);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x,
                y: boundary.position.y + step,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((boundary) => (boundary.position.y += step));
    }

    if (keys.d.pressed || keys.ArrowRight.pressed) {
      player.moving = true;
      player.setImage(player.sprites.right);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x - step,
                y: boundary.position.y,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((boundary) => (boundary.position.x -= step));
    }

    if (keys.s.pressed || keys.ArrowDown.pressed) {
      player.moving = true;
      player.setImage(player.sprites.down);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x,
                y: boundary.position.y - step,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((boundary) => (boundary.position.y -= step));
    }

    if (keys.a.pressed || keys.ArrowLeft.pressed) {
      player.moving = true;
      player.setImage(player.sprites.left);

      for (let i = 0; i < boundaries.length; i++) {
        const boundary = boundaries[i];

        if (
          rectangularColission({
            rectangle1: player,
            rectangle2: {
              ...boundary,
              position: {
                x: boundary.position.x + step,
                y: boundary.position.y,
              },
            },
          })
        ) {
          moving = false;
          break;
        }
      }

      moving && movables.forEach((boundary) => (boundary.position.x += step));
    }
  };

  animate();

  window.addEventListener("keydown", ({ key, code }) => {
    if (key === "c") {
      crouching = true;
      return;
    }

    if (code === "Space") {
      sprint = true;
      return;
    }

    if (keys[key] === undefined) {
      // alert("didnt code this key yet!");
      return;
    }

    lastKey = key;
    keys[key].pressed = true; // ?
  });

  window.addEventListener("keyup", ({ key, code }) => {
    if (key === "c") {
      crouching = false;
      return;
    }

    if (code === "Space") {
      sprint = false;
      return;
    }

    if (keys[key] === undefined) {
      // alert("didnt code this key yet!");
      return;
    }

    keys[key].pressed = false; // ?
  });
};

document.addEventListener("DOMContentLoaded", app);
