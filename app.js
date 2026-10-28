const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const toolbar = document.querySelector('.toolbar');

let isDrawing = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let currentMode = 'pen';
let currentShape = 'line';
let currentColor = '#000000';
let currentLineWidth = 5;
let isDarkMode = false;
let currentPattern = 'none';
let snapshotData = null;

let history = [];
let historyStep = -1;
const MAX_HISTORY = 40;

const btnPen = document.getElementById('btnPen');
const btnHighlighter = document.getElementById('btnHighlighter');
const btnEraser = document.getElementById('btnEraser');
const btnBucket = document.getElementById('btnBucket');
const btnShapesToggle = document.getElementById('btnShapesToggle');
const shapesMenu = document.getElementById('shapesMenu');
const shapeOptBtns = document.querySelectorAll('.shape-opt-btn');
const currentShapeIcon = document.getElementById('currentShapeIcon');

const btnUndo = document.getElementById('btnUndo');
const btnRedo = document.getElementById('btnRedo');
const btnClear = document.getElementById('btnClear');
const btnTheme = document.getElementById('btnTheme');
const btnLines = document.getElementById('btnLines');
const btnGrid = document.getElementById('btnGrid');
const btnSave = document.getElementById('btnSave');
const slider = document.getElementById('lineWidth');
const dot = document.getElementById('thicknessDot');
const colorBtns = document.querySelectorAll('.color-btn');
const customColor = document.getElementById('customColor');
const customColorWrapper = document.querySelector('.custom-color-wrapper');
const customBgColor = document.getElementById('customBgColor');

const clearModal = document.getElementById('clearModal');
const btnCancelClear = document.getElementById('btnCancelClear');
const btnConfirmClear = document.getElementById('btnConfirmClear');

const aboutModal = document.getElementById('aboutModal');
const btnMenu = document.getElementById('btnMenu');
const btnCloseAbout = document.getElementById('btnCloseAbout');

function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return hex;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resizeCanvas() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    if (canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.scale(ratio, ratio);

    if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    }
}

window.addEventListener('resize', resizeCanvas);

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function floodFill(startX, startY, fillHex) {
    const W = canvas.width;
    const H = canvas.height;
    if (startX < 0 || startX >= W || startY < 0 || startY >= H) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    const startIdx = (startY * W + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    let c = fillHex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const fillR = parseInt(c.substring(0, 2), 16);
    const fillG = parseInt(c.substring(2, 4), 16);
    const fillB = parseInt(c.substring(4, 6), 16);
    const fillA = 255;

    if (Math.abs(startR - fillR) < 5 &&
        Math.abs(startG - fillG) < 5 &&
        Math.abs(startB - fillB) < 5 &&
        Math.abs(startA - fillA) < 5) {
        ctx.restore();
        return;
    }

    const tolerance = 40;
    const visited = new Uint8Array(W * H);
    const pixelStack = [[startX, startY]];

    function matchColor(i) {
        return Math.abs(data[i] - startR) <= tolerance &&
               Math.abs(data[i + 1] - startG) <= tolerance &&
               Math.abs(data[i + 2] - startB) <= tolerance &&
               Math.abs(data[i + 3] - startA) <= tolerance;
    }

    while (pixelStack.length > 0) {
        const [curX, curY] = pixelStack.pop();
        let y1 = curY;
        let idx = (y1 * W + curX) * 4;

        while (y1 >= 0 && !visited[y1 * W + curX] && matchColor(idx)) {
            y1--;
            idx -= W * 4;
        }

        y1++;
        idx += W * 4;

        let spanLeft = false;
        let spanRight = false;

        while (y1 < H && !visited[y1 * W + curX] && matchColor(idx)) {
            visited[y1 * W + curX] = 1;
            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = fillA;

            if (curX > 0) {
                const leftIdx = idx - 4;
                if (!visited[y1 * W + (curX - 1)] && matchColor(leftIdx)) {
                    if (!spanLeft) {
                        pixelStack.push([curX - 1, y1]);
                        spanLeft = true;
                    }
                } else if (spanLeft) {
                    spanLeft = false;
                }
            }

            if (curX < W - 1) {
                const rightIdx = idx + 4;
                if (!visited[y1 * W + (curX + 1)] && matchColor(rightIdx)) {
                    if (!spanRight) {
                        pixelStack.push([curX + 1, y1]);
                        spanRight = true;
                    }
                } else if (spanRight) {
                    spanRight = false;
                }
            }

            y1++;
            idx += W * 4;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    ctx.restore();
}

function drawDot(x, y) {
    ctx.save();
    ctx.beginPath();
    if (currentMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.arc(x, y, currentLineWidth, 0, Math.PI * 2);
        ctx.fill();
    } else if (currentMode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = hexToRgba(currentColor, 0.35);
        ctx.arc(x, y, (currentLineWidth * 2) / 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (currentMode === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = currentColor;
        ctx.arc(x, y, currentLineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawShape(fromX, fromY, toX, toY, shape, shiftKey) {
    ctx.save();
    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape) {
        case 'line': {
            let finalX = toX;
            let finalY = toY;
            if (shiftKey) {
                const dx = toX - fromX;
                const dy = toY - fromY;
                const angle = Math.atan2(dy, dx);
                const step = Math.PI / 4;
                const snapped = Math.round(angle / step) * step;
                const dist = Math.hypot(dx, dy);
                finalX = fromX + Math.cos(snapped) * dist;
                finalY = fromY + Math.sin(snapped) * dist;
            }
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(finalX, finalY);
            ctx.stroke();
            break;
        }

        case 'arrow': {
            let finalX = toX;
            let finalY = toY;
            if (shiftKey) {
                const dx = toX - fromX;
                const dy = toY - fromY;
                const angle = Math.atan2(dy, dx);
                const step = Math.PI / 4;
                const snapped = Math.round(angle / step) * step;
                const dist = Math.hypot(dx, dy);
                finalX = fromX + Math.cos(snapped) * dist;
                finalY = fromY + Math.sin(snapped) * dist;
            }
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(finalX, finalY);
            ctx.stroke();

            const angle = Math.atan2(finalY - fromY, finalX - fromX);
            const headlen = Math.max(16, currentLineWidth * 3.5);
            ctx.beginPath();
            ctx.fillStyle = currentColor;
            ctx.moveTo(finalX, finalY);
            ctx.lineTo(
                finalX - headlen * Math.cos(angle - Math.PI / 6),
                finalY - headlen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                finalX - headlen * Math.cos(angle + Math.PI / 6),
                finalY - headlen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
            break;
        }

        case 'rect': {
            let w = toX - fromX;
            let h = toY - fromY;
            if (shiftKey) {
                const size = Math.max(Math.abs(w), Math.abs(h));
                w = (w < 0 ? -1 : 1) * size;
                h = (h < 0 ? -1 : 1) * size;
            }
            ctx.strokeRect(fromX, fromY, w, h);
            break;
        }

        case 'circle': {
            const rx = Math.abs(toX - fromX) / 2;
            const ry = shiftKey ? rx : Math.abs(toY - fromY) / 2;
            const cx = fromX + (toX >= fromX ? rx : -rx);
            const cy = fromY + (toY >= fromY ? ry : -ry);

            ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }

        case 'triangle': {
            let topX = fromX + (toX - fromX) / 2;
            let topY = fromY;
            let bottomY = toY;
            let leftX = fromX;
            let rightX = toX;

            if (shiftKey) {
                const width = toX - fromX;
                const height = Math.abs(width) * 0.866;
                bottomY = fromY + (toY >= fromY ? height : -height);
            }

            ctx.moveTo(topX, topY);
            ctx.lineTo(rightX, bottomY);
            ctx.lineTo(leftX, bottomY);
            ctx.closePath();
            ctx.stroke();
            break;
        }

        case 'star': {
            const cx = fromX;
            const cy = fromY;
            const outerRadius = Math.hypot(toX - fromX, toY - fromY);
            const innerRadius = outerRadius / 2.2;
            const spikes = 5;
            let rot = (Math.PI / 2) * 3;
            const step = Math.PI / spikes;

            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                let x = cx + Math.cos(rot) * outerRadius;
                let y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
            ctx.stroke();
            break;
        }
    }

    ctx.restore();
}

function startDrawing(e) {
    if (e.button !== undefined && e.button !== 0) return;

    if (shapesMenu) shapesMenu.classList.remove('open');

    const coords = getCoordinates(e);

    if (currentMode === 'bucket') {
        const ratio = window.devicePixelRatio || 1;
        const px = Math.floor(coords.x * ratio);
        const py = Math.floor(coords.y * ratio);
        floodFill(px, py, currentColor);
        saveState();
        return;
    }

    isDrawing = true;
    startX = coords.x;
    startY = coords.y;
    lastX = coords.x;
    lastY = coords.y;

    try {
        canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (currentMode === 'shape') {
        snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
        drawDot(lastX, lastY);
    }

    toolbar.classList.add('drawing');
}

function draw(e) {
    if (!isDrawing) return;

    const coords = getCoordinates(e);

    if (currentMode === 'shape') {
        if (snapshotData) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.putImageData(snapshotData, 0, 0);
            ctx.restore();
        }
        drawShape(startX, startY, coords.x, coords.y, currentShape, e.shiftKey);
        return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = currentLineWidth * 2;
    } else if (currentMode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = hexToRgba(currentColor, 0.35);
        ctx.lineWidth = currentLineWidth * 2.5;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentLineWidth;
    }

    ctx.stroke();
    ctx.restore();

    lastX = coords.x;
    lastY = coords.y;
}

function stopDrawing(e) {
    if (isDrawing) {
        isDrawing = false;
        if (e && e.pointerId !== undefined) {
            try {
                if (canvas.hasPointerCapture(e.pointerId)) {
                    canvas.releasePointerCapture(e.pointerId);
                }
            } catch (_) {}
        }

        if (currentMode === 'shape') {
            const coords = getCoordinates(e);
            if (snapshotData) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.putImageData(snapshotData, 0, 0);
                ctx.restore();
                snapshotData = null;
            }
            drawShape(startX, startY, coords.x, coords.y, currentShape, e.shiftKey);
        }

        ctx.beginPath();
        saveState();
    }
    toolbar.classList.remove('drawing');
}

canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointercancel', stopDrawing);
window.addEventListener('blur', stopDrawing);

function resetActiveTools() {
    btnPen.classList.remove('active');
    if (btnHighlighter) btnHighlighter.classList.remove('active');
    btnEraser.classList.remove('active');
    if (btnBucket) btnBucket.classList.remove('active');
    if (btnShapesToggle) btnShapesToggle.classList.remove('active');
    if (shapesMenu) shapesMenu.classList.remove('open');
}

function selectPen() {
    resetActiveTools();
    currentMode = 'pen';
    btnPen.classList.add('active');
}

function selectHighlighter() {
    resetActiveTools();
    currentMode = 'highlighter';
    if (btnHighlighter) btnHighlighter.classList.add('active');
}

function selectEraser() {
    resetActiveTools();
    currentMode = 'eraser';
    btnEraser.classList.add('active');
}

function selectBucket() {
    resetActiveTools();
    currentMode = 'bucket';
    if (btnBucket) btnBucket.classList.add('active');
}

function selectShape(shapeName) {
    resetActiveTools();
    currentMode = 'shape';
    currentShape = shapeName;
    if (btnShapesToggle) btnShapesToggle.classList.add('active');

    shapeOptBtns.forEach(btn => {
        if (btn.dataset.shape === shapeName) {
            btn.classList.add('active');
            if (currentShapeIcon) {
                currentShapeIcon.innerHTML = btn.querySelector('svg').innerHTML;
            }
        } else {
            btn.classList.remove('active');
        }
    });
}

btnPen.addEventListener('click', selectPen);
if (btnHighlighter) btnHighlighter.addEventListener('click', selectHighlighter);
btnEraser.addEventListener('click', selectEraser);
if (btnBucket) btnBucket.addEventListener('click', selectBucket);

if (btnShapesToggle && shapesMenu) {
    btnShapesToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentMode !== 'shape') {
            selectShape(currentShape);
        } else {
            shapesMenu.classList.toggle('open');
        }
    });

    shapeOptBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const shape = btn.dataset.shape;
            selectShape(shape);
            shapesMenu.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!shapesMenu.contains(e.target) && e.target !== btnShapesToggle) {
            shapesMenu.classList.remove('open');
        }
    });
}

slider.addEventListener('input', (e) => {
    currentLineWidth = Number(e.target.value);
    dot.style.width = `${currentLineWidth}px`;
    dot.style.height = `${currentLineWidth}px`;
});

colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        if (customColorWrapper) customColorWrapper.classList.remove('active');
        btn.classList.add('active');
        currentColor = btn.dataset.color;

        if (currentMode === 'eraser') selectPen();
    });
});

function applyCustomColor(colorVal) {
    colorBtns.forEach(b => b.classList.remove('active'));
    if (customColorWrapper) customColorWrapper.classList.add('active');
    currentColor = colorVal;
    if (currentMode === 'eraser') selectPen();
}

customColor.addEventListener('input', (e) => applyCustomColor(e.target.value));
customColor.addEventListener('change', (e) => applyCustomColor(e.target.value));

function updateUndoRedoButtons() {
    btnUndo.disabled = historyStep <= 0;
    btnRedo.disabled = historyStep >= history.length - 1;
}

function saveState() {
    historyStep++;
    if (historyStep < history.length) {
        history.length = historyStep;
    }
    history.push(canvas.toDataURL());

    if (history.length > MAX_HISTORY) {
        history.shift();
        historyStep--;
    }

    updateUndoRedoButtons();
}

function restoreState(dataUrl) {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };
    img.src = dataUrl;
}

function clearCanvas() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

btnUndo.addEventListener('click', () => {
    if (historyStep > 0) {
        historyStep--;
        restoreState(history[historyStep]);
        updateUndoRedoButtons();
    }
});

btnRedo.addEventListener('click', () => {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreState(history[historyStep]);
        updateUndoRedoButtons();
    }
});

btnClear.addEventListener('click', () => {
    clearModal.classList.add('show');
});

btnCancelClear.addEventListener('click', () => {
    clearModal.classList.remove('show');
});

btnConfirmClear.addEventListener('click', () => {
    clearCanvas();
    saveState();
    clearModal.classList.remove('show');
});

clearModal.addEventListener('click', (e) => {
    if (e.target === clearModal) clearModal.classList.remove('show');
});

if (btnMenu && aboutModal && btnCloseAbout) {
    btnMenu.addEventListener('click', () => aboutModal.classList.add('show'));
    btnCloseAbout.addEventListener('click', () => aboutModal.classList.remove('show'));
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) aboutModal.classList.remove('show');
    });
}

btnTheme.addEventListener('click', () => {
    document.documentElement.style.removeProperty('--primary-bg');
    isDarkMode = !isDarkMode;

    if (isDarkMode) {
        document.body.classList.add('theme-dark');
        if (currentColor === '#000000') {
            const whiteBtn = document.querySelector('[data-color="#ffffff"]');
            if (whiteBtn) whiteBtn.click();
        }
    } else {
        document.body.classList.remove('theme-dark');
        if (currentColor === '#ffffff') {
            const blackBtn = document.querySelector('[data-color="#000000"]');
            if (blackBtn) blackBtn.click();
        }
    }
});

customBgColor.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--primary-bg', e.target.value);
});

btnLines.addEventListener('click', () => {
    if (currentPattern === 'lines') {
        currentPattern = 'none';
        document.body.classList.remove('bg-lines');
    } else {
        currentPattern = 'lines';
        document.body.classList.remove('bg-grid');
        document.body.classList.add('bg-lines');
    }
});

btnGrid.addEventListener('click', () => {
    if (currentPattern === 'grid') {
        currentPattern = 'none';
        document.body.classList.remove('bg-grid');
    } else {
        currentPattern = 'grid';
        document.body.classList.remove('bg-lines');
        document.body.classList.add('bg-grid');
    }
});

function saveBoardImage() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    const bgColor = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
    tempCtx.fillStyle = bgColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    if (currentPattern !== 'none') {
        const ratio = window.devicePixelRatio || 1;
        const step = 40 * ratio;

        tempCtx.lineWidth = Math.max(1, ratio);
        tempCtx.strokeStyle = isDarkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(0, 0, 0, 0.1)';

        const crispOffset = tempCtx.lineWidth % 2 === 1 ? 0.5 : 0;

        tempCtx.beginPath();
        for (let y = 39 * ratio; y < tempCanvas.height; y += step) {
            const posY = Math.floor(y) + crispOffset;
            tempCtx.moveTo(0, posY);
            tempCtx.lineTo(tempCanvas.width, posY);
        }

        if (currentPattern === 'grid') {
            for (let x = 39 * ratio; x < tempCanvas.width; x += step) {
                const posX = Math.floor(x) + crispOffset;
                tempCtx.moveTo(posX, 0);
                tempCtx.lineTo(posX, tempCanvas.height);
            }
        }
        tempCtx.stroke();
    }

    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `TKALEM-Tahta-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

btnSave.addEventListener('click', saveBoardImage);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        clearModal.classList.remove('show');
        aboutModal.classList.remove('show');
        if (shapesMenu) shapesMenu.classList.remove('open');
        return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        btnUndo.click();
        return;
    }

    if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        btnRedo.click();
        return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        btnSave.click();
        return;
    }

    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'k' || key === 'p') {
            selectPen();
        } else if (key === 'h') {
            selectHighlighter();
        } else if (key === 's' || key === 'e') {
            selectEraser();
        } else if (key === 'b') {
            selectBucket();
        } else if (key === 'l') {
            selectShape('line');
        } else if (key === 'a') {
            selectShape('arrow');
        } else if (key === 'r') {
            selectShape('rect');
        } else if (key === 'c') {
            selectShape('circle');
        } else if (key === 't') {
            selectShape('triangle');
        } else if (e.key === 'Delete') {
            btnClear.click();
        }
    }
});

resizeCanvas();
saveState();
selectPen();
