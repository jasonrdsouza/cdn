// State
const state = {
  seed: Date.now(),
  colors: { bg: "#ffffff", fg: "#000000" },
  rng: null,
};

// Configuration
// Parameters derived from Alex Chan's blog post source:
// innerR=1, outerR=2 (Ratio 1:2)
// subdivideChance=0.2
const CONFIG = {
  innerR: 20,
  outerR: 40,
  get tileSize() {
    return (this.innerR + this.outerR) * 2;
  },
  get padding() {
    return Math.max(this.innerR, this.outerR);
  },
  get center() {
    return this.padding + this.tileSize / 2;
  },
  subdivideChance: 0.2,
  maxLayers: 4,
};

/**
 * Seeded Random Number Generator (Mulberry32)
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
    this.rng = this.mulberry32(seed);
  }

  mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  next() {
    return this.rng();
  }
}

/**
 * Coordinate-based Hash Function (MurmurHash3-like mixer)
 * Returns a float between 0 and 1.
 */
function hash(x, y, layer, seed, salt = 0) {
  let h = 0x811c9dc5 ^ seed;
  h = Math.imul(h ^ x, 0xcc9e2d51);
  h = Math.imul(h ^ y, 0x1b873593);
  h = Math.imul(h ^ layer, 0x85ebca6b);
  h = Math.imul(h ^ salt, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Generates a complementary color palette.
 */
function generatePalette(rng) {
  const h = Math.floor(rng.next() * 360);
  const s = 60 + Math.floor(rng.next() * 30);
  const l = 20 + Math.floor(rng.next() * 60);

  const isDark = l < 50;
  const c1 = `hsl(${h}, ${s}%, ${l}%)`;

  const h2 = (h + 180) % 360;
  const s2 = s;
  const l2 = isDark ? 90 : 10;

  const c2 = `hsl(${h2}, ${s2}%, ${l2}%)`;

  return isDark ? { fg: c1, bg: c2 } : { fg: c2, bg: c1 };
}

// Initial Setup
function initRNG(seed) {
  state.seed = seed;
  state.rng = new SeededRandom(seed);
  state.colors = generatePalette(state.rng);
}

/**
 * Creates the SVG Definitions for Primitives and Tiles
 */
function createDefs() {
  const { innerR, outerR, tileSize, padding, center } = CONFIG;
  const { bg, fg } = state.colors;

  const slashPath = `
        M ${padding + outerR} ${padding}
        l ${2 * innerR} 0
        a ${outerR} ${outerR} 0 0 0 ${outerR} ${outerR}
        l 0 ${2 * innerR}
        a ${innerR * 2 + outerR} ${innerR * 2 + outerR} 0 0 1 ${-innerR * 2 - outerR} ${-innerR * 2 - outerR}
    `;

  const wedgePath = `
        M ${padding + outerR} ${padding}
        l ${2 * innerR} 0
        a ${outerR} ${outerR} 0 0 0 ${outerR} ${outerR}
        l 0 ${2 * innerR}
        l ${-innerR * 2 - outerR} 0
    `;

  return `
    <style>
        .tile-bg { fill: ${bg}; }
        .tile-fg { fill: ${fg}; }
    </style>

    <!-- Base -->
    <symbol id="base">
        <rect x="${padding}" y="${padding}" width="${tileSize}" height="${tileSize}" class="tile-bg" />
        <g class="tile-bg">
             <circle cx="${padding}" cy="${padding}" r="${outerR}" />
             <circle cx="${padding + tileSize}" cy="${padding}" r="${outerR}" />
             <circle cx="${padding}" cy="${padding + tileSize}" r="${outerR}" />
             <circle cx="${padding + tileSize}" cy="${padding + tileSize}" r="${outerR}" />
        </g>
        <g class="tile-fg">
             <circle cx="${padding}" cy="${center}" r="${innerR}" />
             <circle cx="${padding + tileSize}" cy="${center}" r="${innerR}" />
             <circle cx="${center}" cy="${padding}" r="${innerR}" />
             <circle cx="${center}" cy="${padding + tileSize}" r="${innerR}" />
        </g>
    </symbol>

    <!-- Base Inverted -->
    <symbol id="base-inverted">
        <rect x="${padding}" y="${padding}" width="${tileSize}" height="${tileSize}" class="tile-fg" />
        <g class="tile-fg">
             <circle cx="${padding}" cy="${padding}" r="${outerR}" />
             <circle cx="${padding + tileSize}" cy="${padding}" r="${outerR}" />
             <circle cx="${padding}" cy="${padding + tileSize}" r="${outerR}" />
             <circle cx="${padding + tileSize}" cy="${padding + tileSize}" r="${outerR}" />
        </g>
        <g class="tile-bg">
             <circle cx="${padding}" cy="${center}" r="${innerR}" />
             <circle cx="${padding + tileSize}" cy="${center}" r="${innerR}" />
             <circle cx="${center}" cy="${padding}" r="${innerR}" />
             <circle cx="${center}" cy="${padding + tileSize}" r="${innerR}" />
        </g>
    </symbol>

    <!-- Primitives -->
    <symbol id="slash" overflow="visible"><path class="tile-fg" d="${slashPath}"/></symbol>
    <symbol id="wedge" overflow="visible"><path class="tile-fg" d="${wedgePath}"/></symbol>
    <symbol id="bar" overflow="visible"><rect class="tile-fg" x="${padding}" y="${padding + outerR}" width="${tileSize}" height="${2 * innerR}" /></symbol>

    <symbol id="slash-inverted" overflow="visible"><path class="tile-bg" d="${slashPath}"/></symbol>
    <symbol id="wedge-inverted" overflow="visible"><path class="tile-bg" d="${wedgePath}"/></symbol>
    <symbol id="bar-inverted" overflow="visible"><rect class="tile-bg" x="${padding}" y="${padding + outerR}" width="${tileSize}" height="${2 * innerR}" /></symbol>

    <!-- Composite Tiles -->
    <symbol id="tile-four">
        <use href="#base" />
    </symbol>
    <symbol id="tile-t">
        <use href="#base" />
        <use href="#wedge" />
        <use href="#wedge" transform="rotate(90 ${center} ${center})" />
    </symbol>
    <symbol id="tile-line">
        <use href="#base" />
        <use href="#bar" />
    </symbol>
    <symbol id="tile-cross">
        <use href="#base" />
        <use href="#bar" />
        <use href="#bar" transform="rotate(90 ${center} ${center})" />
    </symbol>
    <symbol id="tile-curve">
        <use href="#base" />
        <use href="#slash" />
    </symbol>
    <symbol id="tile-frown">
        <use href="#base" />
        <use href="#wedge" />
        <use href="#wedge" transform="rotate(180 ${center} ${center})" />
    </symbol>
    <symbol id="tile-x">
        <use href="#base" />
        <use href="#wedge" />
        <use href="#wedge" transform="rotate(90 ${center} ${center})" />
        <use href="#wedge" transform="rotate(180 ${center} ${center})" />
        <use href="#wedge" transform="rotate(270 ${center} ${center})" />
    </symbol>

    <!-- Inverted Composite Tiles -->
    <symbol id="tile-four-inverted">
        <use href="#base-inverted" />
    </symbol>
    <symbol id="tile-t-inverted">
        <use href="#base-inverted" />
        <use href="#wedge-inverted" />
        <use href="#wedge-inverted" transform="rotate(90 ${center} ${center})" />
    </symbol>
    <symbol id="tile-line-inverted">
        <use href="#base-inverted" />
        <use href="#bar-inverted" />
    </symbol>
    <symbol id="tile-cross-inverted">
        <use href="#base-inverted" />
        <use href="#bar-inverted" />
        <use href="#bar-inverted" transform="rotate(90 ${center} ${center})" />
    </symbol>
    <symbol id="tile-curve-inverted">
        <use href="#base-inverted" />
        <use href="#slash-inverted" />
    </symbol>
    <symbol id="tile-frown-inverted">
        <use href="#base-inverted" />
        <use href="#wedge-inverted" />
        <use href="#wedge-inverted" transform="rotate(180 ${center} ${center})" />
    </symbol>
    <symbol id="tile-x-inverted">
        <use href="#base-inverted" />
        <use href="#wedge-inverted" />
        <use href="#wedge-inverted" transform="rotate(90 ${center} ${center})" />
        <use href="#wedge-inverted" transform="rotate(180 ${center} ${center})" />
        <use href="#wedge-inverted" transform="rotate(270 ${center} ${center})" />
    </symbol>
    `;
}

const TILE_TYPES = [
  "tile-four",
  "tile-t",
  "tile-line",
  "tile-cross",
  "tile-curve",
  "tile-frown",
  "tile-x",
];

/**
 * Recursive subdivision to determine tile positions
 */
function getTilePositions({
  columns,
  rows,
  tileSize,
  maxLayers,
  subdivideChance,
  seed,
}) {
  let tiles = [];

  // Layer 1
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) {
      tiles.push({
        x: i * tileSize,
        y: j * tileSize,
        layer: 1,
        subdivided: false,
      });
    }
  }

  // Layers 2..max
  for (let layer = 2; layer <= maxLayers; layer++) {
    let previousLayer = tiles.filter(
      (t) => t.layer === layer - 1 && !t.subdivided,
    );
    let layerTileSize = tileSize * 0.5 ** (layer - 1);

    previousLayer.forEach((tile) => {
      // Salt 1 for subdivision decision
      if (hash(tile.x, tile.y, layer, seed, 1) < subdivideChance) {
        tile.subdivided = true;

        tiles.push(
          { layer, x: tile.x, y: tile.y, subdivided: false },
          { layer, x: tile.x + layerTileSize, y: tile.y, subdivided: false },
          { layer, x: tile.x, y: tile.y + layerTileSize, subdivided: false },
          {
            layer,
            x: tile.x + layerTileSize,
            y: tile.y + layerTileSize,
            subdivided: false,
          },
        );
      }
    });
  }

  return tiles.filter((t) => !t.subdivided);
}

/**
 * Generate the SVG content for the tiles
 */
function generateTileSVG(tilePositions, seed) {
  const { padding, center } = CONFIG;
  let svgContent = [];

  tilePositions.forEach((c) => {
    // Salt 2 for tile type
    const typeRand = hash(c.x, c.y, c.layer, seed, 2);
    const typeIndex = Math.floor(typeRand * TILE_TYPES.length);
    const baseType = TILE_TYPES[typeIndex];

    // Invert on even layers (2, 4...)
    const isInverted = c.layer % 2 === 0;
    const tileName = isInverted ? baseType + "-inverted" : baseType;

    const scale = 0.5 ** (c.layer - 1);
    const adjustment = -padding * Math.pow(0.5, c.layer - 1);

    // Salt 3 for rotation
    const rotRand = hash(c.x, c.y, c.layer, seed, 3);
    const rotation = Math.floor(rotRand * 4) * 90;

    // Note: We use translate() instead of x/y attributes to ensure the
    // correct transform order: Translate -> Scale -> Rotate.
    // This prevents rotation from swinging the tile around the wrong origin.
    svgContent.push(`
            <use
                href="#${tileName}"
                transform="translate(${c.x + adjustment} ${c.y + adjustment}) scale(${scale}) rotate(${rotation} ${center} ${center})"
            />
        `);
  });

  return svgContent.join("");
}

const svgElement = document.getElementById("pattern-svg");

function render(newSeed = false) {
  if (newSeed) {
    state.seed = Math.floor(Math.random() * 2147483647);
    initRNG(state.seed);
  } else {
    // Reset RNG to same state
    initRNG(state.seed);
  }

  // Update Body BG
  document.body.style.backgroundColor = state.colors.bg;

  // Calculate Grid
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cols = Math.ceil(w / CONFIG.tileSize) + 1;
  const rows = Math.ceil(h / CONFIG.tileSize) + 1;

  // Logic
  const positions = getTilePositions({
    columns: cols,
    rows: rows,
    tileSize: CONFIG.tileSize,
    maxLayers: CONFIG.maxLayers,
    subdivideChance: CONFIG.subdivideChance,
    seed: state.seed,
  });

  // Content
  const defs = createDefs();
  const content = generateTileSVG(positions, state.seed);

  svgElement.innerHTML = `<defs>${defs}</defs>${content}`;
}

// Events
window.addEventListener("resize", () => {
  render(false);
});

document.getElementById("regenerate-btn").addEventListener("click", () => {
  render(true);
});

document.getElementById("download-btn").addEventListener("click", () => {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add xml declaration
  if (!source.match(/^<\?xml/)) {
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
  }

  // Convert to blob
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `truchet-pattern-${state.seed}.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
});

// Init
render(true);
