const canvas = document.getElementById("pixel-canvas");
const ctx = canvas.getContext('2d');
ctx.font = '24px StarCrush';

let gridSize = 16;
let cellSize = 0;
let grid = [];
let zoomLevel = 1.0; // NEW: Added zoom state

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

// --- Step 1-a: Initialize the grid and canvas ---

function init() {
    grid = Array.from({ length: gridSize }, () =>
        Array(gridSize).fill('#ffffff'),
    );
    updateSize(); // NEW: Call centralized size updater
}

// NEW: Helper function to handle zoom/size changes
function updateSize() {
    cellSize = Math.floor((480 / gridSize) * zoomLevel);
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    render();
}

// --- Step 1-b: Render the grid onto the canvas ---

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear before redrawing

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillStyle = grid[row][col];
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

            ctx.strokeStyle = "#3d2b52"; // Matches your futuristic purple theme
            ctx.lineWidth = 0.5;
            ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
    }

    if (hoveredCell && !isDrawing) {
        const { row, col } = hoveredCell;
        const previewColor = currentTool === "eraser" ? "#ffffff" : currentColor;
        ctx.fillStyle = previewColor;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        ctx.globalAlpha = 1.0;
    }
}

// --- Step 2-a: Map mouse position to grid cell ---

function getCellFromMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize); 

    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        return { row, col };
    } 
    return null;
}

// --- Step 2-b: Paint a single cell ---

function paintCell(row, col) {
    if (currentTool === "pen") {
        grid[row][col] = currentColor;
    } else if (currentTool === "eraser") {
        grid[row][col] = "#ffffff";
    }
    render();
}

// --- Step 2-c: Mouse event handlers ---

canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    const cell = getCellFromMouse(e);

    if (cell) {
        if (currentTool === "fill") {
            floodFill(cell.row, cell.col, currentColor);
        } else {
            paintCell(cell.row, cell.col); // FIXED: was printCell
        }
    }
});

canvas.addEventListener("mousemove", (e) => {
    const cell = getCellFromMouse(e);
    hoveredCell = cell;

    // FIXED: Corrected quotes in the if statement
    if (isDrawing && currentTool !== "fill" && cell) {
        paintCell(cell.row, cell.col);
    } else {
        render();
    }
});

canvas.addEventListener("mouseup", () => {
    isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
    isDrawing = false;
    hoveredCell = null;
    render();
});

// --- Step 3: Flood fill algorithm ---

function floodFill(row, col, newColor) {
    const targetColor = grid[row][col];
    if (targetColor === newColor) return;

    const stack = [[row, col]];
    while (stack.length > 0) {
        const [r, c] = stack.pop();

        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        if (grid[r][c] !== targetColor) continue;

        grid[r][c] = newColor;

        stack.push([r - 1, c]);
        stack.push([r + 1, c]);
        stack.push([r, c - 1]);
        stack.push([r, c + 1]);
    }
    render();
}

// --- Step 4-a: Build the color palette ---

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

// --- Step 4-b: Custom color picker ---

document.getElementById("custom-color").addEventListener("input", (e) => {
    currentColor = e.target.value;
    document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
});

// --- Step 4-c: Tool button switching ---

document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        // Only switch tool if it's not one of the action buttons
        if (btn.dataset.tool) {
            currentTool = btn.dataset.tool;
            document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
        }
    });
});

// --- NEW Feature Handlers ---

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

// --- Step 5: Grid size switching ---

document.getElementById("grid-size").addEventListener("change", (e) => {
    const confirmed = confirm("Changing grid size will clear your canvas. Continue?");
    if (confirmed) {
        gridSize = parseInt(e.target.value);
        zoomLevel = 1.0; // Reset zoom on size change
        init();
    } else {
        e.target.value = gridSize;
    }
});

// --- Step 6: PNG export ---

document.getElementById("export-btn").addEventListener("click", () => {
    const exportCanvas = document.createElement("canvas");
    const exportCtx = exportCanvas.getContext("2d");
    const exportCellSize = 32; 
    exportCanvas.width = gridSize * exportCellSize;
    exportCanvas.height = gridSize * exportCellSize;

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            exportCtx.fillStyle = grid[row][col];
            exportCtx.fillRect(col * exportCellSize, row * exportCellSize, exportCellSize, exportCellSize);
        }
    }

    const link = document.createElement("a");
    link.download = "pixel-art.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
});

buildPalette();
init();