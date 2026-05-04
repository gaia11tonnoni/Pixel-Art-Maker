const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext('2d');

// --- Configurazione Iniziale ---
let cols = 16;
let rows = 16;
let cellSize = 0;
let grid = [];
let zoomLevel = 1.0;

let currentColor = "#000000";
let currentTool = "pen";
let isDrawing = false;
let hoveredCell = null;

const PRESET_COLORS = [
    "#000000", "#ffffff", "#ff0000", "#ff7300",
    "#ffcc00", "#88ff66", "#219a00", "#00ffff",
    "#4000ff", "#ae00ff", "#ff00d4", "#ff0088",
    "#888888", "#553322",
];

// --- Step 1: Inizializzazione e Rendering ---

function init() {
    // Crea la griglia basata su rows e cols
    grid = Array.from({ length: rows }, () =>
        Array(cols).fill('#ffffff'),
    );
    updateSize();
}

function updateSize() {
    // Calcola la dimensione cella basata sulla larghezza (480px di riferimento)
    cellSize = Math.floor((480 / cols) * zoomLevel);
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    render();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillStyle = grid[r][c];
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);

            ctx.strokeStyle = "#3d2b52"; 
            ctx.lineWidth = 0.5;
            ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
    }

    // Anteprima hover
    if (hoveredCell && !isDrawing) {
        const { r, c } = hoveredCell;
        const previewColor = currentTool === "eraser" ? "#ffffff" : currentColor;
        ctx.fillStyle = previewColor;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        ctx.globalAlpha = 1.0;
    }
}

// --- Step 2: Interazione Mouse & Touch ---

function getCellFromInput(e) {
    const rect = canvas.getBoundingClientRect();
    // Gestisce sia MouseEvent che TouchEvent
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize); 

    if (r >= 0 && r < rows && c >= 0 && c < cols) {
        return { r, c };
    } 
    return null;
}

function paintCell(r, c) {
    if (currentTool === "pen") {
        grid[r][c] = currentColor;
    } else if (currentTool === "eraser") {
        grid[r][c] = "#ffffff";
    }
    render();
}

// Event Listeners
const startDrawing = (e) => {
    if (e.type === "touchstart") e.preventDefault();
    isDrawing = true;
    const cell = getCellFromInput(e);
    if (cell) {
        if (currentTool === "fill") {
            floodFill(cell.r, cell.c, currentColor);
        } else {
            paintCell(cell.r, cell.c);
        }
    }
};

const moveDrawing = (e) => {
    if (e.type === "touchmove") e.preventDefault();
    const cell = getCellFromInput(e);
    hoveredCell = cell;

    if (isDrawing && currentTool !== "fill" && cell) {
        paintCell(cell.r, cell.c);
    } else {
        render();
    }
};

const stopDrawing = () => {
    isDrawing = false;
};

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", moveDrawing);
window.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", moveDrawing, { passive: false });
canvas.addEventListener("touchend", stopDrawing);

canvas.addEventListener("mouseleave", () => {
    hoveredCell = null;
    render();
});

// --- Step 3: Algoritmo Flood Fill ---

function floodFill(startR, startC, newColor) {
    const targetColor = grid[startR][startC];
    if (targetColor === newColor) return;

    const stack = [[startR, startC]];
    while (stack.length > 0) {
        const [r, c] = stack.pop();

        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        if (grid[r][c] !== targetColor) continue;

        grid[r][c] = newColor;

        stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
    render();
}

// --- Step 4: Palette e Strumenti ---

function buildPalette() {
    const palette = document.getElementById("color-palette");
    PRESET_COLORS.forEach((color) => {
        const swatch = document.createElement("div");
        swatch.classList.add("color-swatch");
        if (color === currentColor) swatch.classList.add("active");
        swatch.style.background = color;

        swatch.addEventListener("click", () => {
            currentColor = color;
            document.getElementById("custom-color").value = color;
            document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
            swatch.classList.add("active");
        });
        palette.appendChild(swatch);
    });
}

document.getElementById("custom-color").addEventListener("input", (e) => {
    currentColor = e.target.value;
    document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
});

document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        if (btn.dataset.tool) {
            currentTool = btn.dataset.tool;
            document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
        }
    });
});

// --- Step 5: Controlli Extra (Zoom, Clear, Grid Size) ---

document.getElementById("clear-btn").addEventListener("click", () => {
    if (confirm("Clear entire canvas?")) {
        grid.forEach(row => row.fill("#ffffff"));
        render();
    }
});

document.getElementById("zoom-in").addEventListener("click", () => {
    zoomLevel += 0.2;
    updateSize();
});

document.getElementById("zoom-out").addEventListener("click", () => {
    if (zoomLevel > 0.4) {
        zoomLevel -= 0.2;
        updateSize();
    }
});

document.getElementById("grid-size").addEventListener("change", (e) => {
    if (confirm("Changing grid size will clear your canvas. Continue?")) {
        const val = e.target.value;
        if (val.includes('x')) {
            const parts = val.split('x');
            cols = parseInt(parts[0]);
            rows = parseInt(parts[1]);
        } else {
            cols = rows = parseInt(val);
        }
        zoomLevel = 1.0;
        init();
    } else {
        e.target.value = cols === rows ? cols : `${cols}x${rows}`;
    }
});

// --- Step 6: Export PNG ---

document.getElementById("export-btn").addEventListener("click", () => {
    const exportCanvas = document.createElement("canvas");
    const exportCtx = exportCanvas.getContext("2d");
    const exportCellSize = 32; 
    
    exportCanvas.width = cols * exportCellSize;
    exportCanvas.height = rows * exportCellSize;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            exportCtx.fillStyle = grid[r][c];
            exportCtx.fillRect(c * exportCellSize, r * exportCellSize, exportCellSize, exportCellSize);
        }
    }

    const link = document.createElement("a");
    link.download = `pixel-art-${cols}x${rows}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
});

// Avvio
buildPalette();
init();