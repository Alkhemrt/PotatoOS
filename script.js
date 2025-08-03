// Window management
let activeWindow = null;
let windows = {};
let zIndex = 10;
let konamiCode = [];
let idleTimer = null;
let screensaverActive = false;
let isPeeled = false;
let isFried = false;
let isMashed = false;
let selectedDesktopIcon = null;
let browserHistory = [];
let currentHistoryIndex = -1;

// Initialize the OS
function initOS() {
    // Set up event listeners
    document.getElementById('start-button').addEventListener('click', toggleStartMenu);
    document.addEventListener('click', closeStartMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('desktop').addEventListener('contextmenu', showContextMenu);
    document.addEventListener('click', closeContextMenu);
    document.addEventListener('mousemove', resetIdleTimer);
    
    // Initialize windows
    const windowElements = document.querySelectorAll('.window');
    windowElements.forEach(windowEl => {
        const windowId = windowEl.id;
        windows[windowId] = {
            element: windowEl,
            minimized: false,
            maximized: false,
            originalWidth: windowEl.offsetWidth,
            originalHeight: windowEl.offsetHeight,
            originalLeft: parseInt(windowEl.style.left),
            originalTop: parseInt(windowEl.style.top)
        };
        
        // Make window draggable
        const header = windowEl.querySelector('.window-header');
        header.addEventListener('mousedown', startDrag);
        
        // Make window resizable
        const resizeHandle = windowEl.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', startResize);
        }
    });
    
    // Initialize desktop icons
    const desktopIcons = document.querySelectorAll('.desktop-icon');
    desktopIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            // Store which icon was clicked for context menu
            selectedDesktopIcon = icon;
            
            // Single click selects the icon
            desktopIcons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
            
            // Double click opens the window
            if (e.detail === 2) {
                const windowId = icon.getAttribute('data-window');
                openWindow(windowId);
            }
        });
        
        icon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            selectedDesktopIcon = icon;
            showContextMenu(e);
        });
    });
    
    // Initialize start menu items
    const startMenuItems = document.querySelectorAll('.start-menu-item[data-window]');
    startMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const windowId = item.getAttribute('data-window');
            openWindow(windowId);
            toggleStartMenu();
        });
    });
    
    // Initialize terminal
    const terminalInput = document.getElementById('terminal-input');
    terminalInput.addEventListener('keydown', handleTerminalInput);
    
    // Initialize paint
    initPaint();
    
    // Initialize games
    initMinespudder();
    initSphere();
    
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Start idle timer
    resetIdleTimer();
    
    // Initialize browser history
    browserHistory.push('http://www.spudnet.spud/');
    currentHistoryIndex = 0;
}

// Start splash screen
function startSplash() {
    let progress = 0;
    const progressBar = document.getElementById('splash-progress');
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('splash-screen').style.display = 'none';
                initOS();
            }, 500);
        }
        progressBar.style.width = `${progress}%`;
    }, 100);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearInterval(interval);
            document.getElementById('splash-screen').style.display = 'none';
            initOS();
        }
    });
}

// Start the splash screen
startSplash();

// Window functions
function openWindow(windowId) {
    if (!windows[windowId]) return;
    
    const windowData = windows[windowId];
    const windowEl = windowData.element;
    
    if (windowData.minimized) {
        restoreWindow(windowId);
        return;
    }
    
    windowEl.style.display = 'flex';
    bringToFront(windowId);
    
    // Add to taskbar
    addToTaskbar(windowId);
    
    // Play sound
    playSound('click');
}

function closeWindow(windowId) {
    if (!windows[windowId]) return;
    
    const windowEl = windows[windowId].element;
    windowEl.style.display = 'none';
    
    // Remove from taskbar
    removeFromTaskbar(windowId);
    
    // Play sound
    playSound('click');
}

function minimizeWindow(windowId) {
    if (!windows[windowId]) return;
    
    const windowEl = windows[windowId].element;
    windowEl.style.display = 'none';
    windows[windowId].minimized = true;
    
    // Update taskbar button
    updateTaskbarButton(windowId);
    
    // Play sound
    playSound('click');
}

function restoreWindow(windowId) {
    if (!windows[windowId]) return;
    
    const windowEl = windows[windowId].element;
    windowEl.style.display = 'flex';
    windows[windowId].minimized = false;
    
    bringToFront(windowId);
    
    // Update taskbar button
    updateTaskbarButton(windowId);
    
    // Play sound
    playSound('click');
}

function maximizeWindow(windowId) {
    if (!windows[windowId]) return;
    
    const windowData = windows[windowId];
    const windowEl = windowData.element;
    
    if (windowData.maximized) {
        // Restore
        windowEl.style.width = `${windowData.originalWidth}px`;
        windowEl.style.height = `${windowData.originalHeight}px`;
        windowEl.style.left = `${windowData.originalLeft}px`;
        windowEl.style.top = `${windowData.originalTop}px`;
        windowData.maximized = false;
        
        // For Tuber Paint, reset canvas size
        if (windowId === 'tuber-paint') {
            const canvas = document.getElementById('paint-canvas');
            canvas.width = 464;
            canvas.height = 284;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        // Maximize
        windowData.originalWidth = windowEl.offsetWidth;
        windowData.originalHeight = windowEl.offsetHeight;
        windowData.originalLeft = parseInt(windowEl.style.left);
        windowData.originalTop = parseInt(windowEl.style.top);
        
        windowEl.style.width = 'calc(100% - 4px)';
        windowEl.style.height = 'calc(100% - 44px)';
        windowEl.style.left = '2px';
        windowEl.style.top = '2px';
        windowData.maximized = true;
        
        // For Tuber Paint, resize canvas
        if (windowId === 'tuber-paint') {
            const canvas = document.getElementById('paint-canvas');
            const container = document.getElementById('paint-canvas-container');
            canvas.width = container.offsetWidth - 10;
            canvas.height = container.offsetHeight - 40;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Play sound
    playSound('click');
}

function bringToFront(windowId) {
    if (!windows[windowId]) return;
    
    // Reset z-index of all windows
    Object.keys(windows).forEach(id => {
        windows[id].element.classList.remove('active');
        windows[id].element.style.zIndex = '10';
    });
    
    // Bring this window to front
    zIndex++;
    windows[windowId].element.style.zIndex = zIndex;
    windows[windowId].element.classList.add('active');
    activeWindow = windowId;
}

// Taskbar functions
function addToTaskbar(windowId) {
    if (!windows[windowId]) return;
    
    // Check if already in taskbar
    const existingButton = document.querySelector(`.taskbar-app[data-window="${windowId}"]`);
    if (existingButton) return;
    
    const windowData = windows[windowId];
    const title = windowData.element.querySelector('.window-title').textContent.trim();
    
    const button = document.createElement('button');
    button.className = 'taskbar-app';
    button.setAttribute('data-window', windowId);
    button.textContent = title;
    
    button.addEventListener('click', () => {
        if (windowData.minimized) {
            restoreWindow(windowId);
        } else {
            minimizeWindow(windowId);
        }
    });
    
    document.getElementById('taskbar-apps').appendChild(button);
}

function removeFromTaskbar(windowId) {
    const button = document.querySelector(`.taskbar-app[data-window="${windowId}"]`);
    if (button) {
        button.remove();
    }
}

function updateTaskbarButton(windowId) {
    const button = document.querySelector(`.taskbar-app[data-window="${windowId}"]`);
    if (!button) return;
    
    if (windows[windowId].minimized) {
        button.classList.remove('active');
    } else {
        button.classList.add('active');
    }
}

// Start menu functions
function toggleStartMenu() {
    const startMenu = document.getElementById('start-menu');
    if (startMenu.style.display === 'block') {
        startMenu.style.display = 'none';
    } else {
        startMenu.style.display = 'block';
        bringToFront('start-menu');
    }
    
    // Play sound
    playSound('start');
}

function closeStartMenu(e) {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    
    if (e.target !== startButton && !startButton.contains(e.target)) {
        startMenu.style.display = 'none';
    }
}

// Context menu functions
function showContextMenu(e) {
    e.preventDefault();
    
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'flex';
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    bringToFront('context-menu');
    
    // Play sound
    playSound('click');
}

function closeContextMenu(e) {
    const contextMenu = document.getElementById('context-menu');
    if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
    }
}

function openSelectedWindow() {
    if (selectedDesktopIcon) {
        const windowId = selectedDesktopIcon.getAttribute('data-window');
        if (windowId) {
            openWindow(windowId);
        }
    }
    closeContextMenu({target: null});
}

function exploreSelectedItem() {
    alert('Exploring item... (This is a demo)');
    closeContextMenu({target: null});
}

function createShortcut() {
    alert('Shortcut created! (This is a demo)');
    closeContextMenu({target: null});
}

function showProperties() {
    if (selectedDesktopIcon) {
        const windowId = selectedDesktopIcon.getAttribute('data-window');
        const name = selectedDesktopIcon.querySelector('span').textContent;
        
        alert(`Properties for ${name}\n\nType: ${windowId ? 'Application' : 'File'}\nSize: 42 KB\nCreated: Today\nModified: Today`);
    }
    closeContextMenu({target: null});
}

function potatizeWallpaper() {
    const desktop = document.getElementById('desktop');
    const potatoCount = 10 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < potatoCount; i++) {
        const potato = document.createElement('div');
        potato.className = 'desktop-icon';
        potato.style.left = `${Math.random() * 80}%`;
        potato.style.top = `${Math.random() * 80}%`;
        potato.innerHTML = `
            <img src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23000080"/><rect x="4" y="4" width="24" height="24" fill="%23ffcc00"/></svg>' alt="Potato">
            <span>Potato ${i + 1}</span>
        `;
        desktop.appendChild(potato);
    }
    
    closeContextMenu({target: null});
}

// Terminal functions
function handleTerminalInput(e) {
    if (e.key === 'Enter') {
        const input = e.target.value.trim();
        const output = document.getElementById('terminal-output');
        
        output.innerHTML += `${input}<br>`;
        
        // Process command
        processCommand(input);
        
        // Clear input
        e.target.value = '';
        
        // Scroll to bottom
        output.scrollTop = output.scrollHeight;
    }
}

function processCommand(command) {
    const output = document.getElementById('terminal-output');
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (cmd) {
        case 'help':
            output.innerHTML += `Available commands:<br>
- help: Show this help<br>
- peel: Peel a potato<br>
- fry: Fry a potato<br>
- mash: Mash a potato<br>
- clear: Clear the terminal<br>
- spud: Show SpudSoft info<br>
- history: Show command history<br>
- reboot: Reboot the system<br><br>`;
            break;
            
        case 'peel':
            if (isFried || isMashed) {
                output.innerHTML += `Cannot peel a potato that's already been cooked!<br>Use 'clear' to get a new potato.<br><br>`;
            } else {
                isPeeled = true;
                output.innerHTML += `Peeling potato...<br>Potato peeled! Ready for cooking.<br><br>`;
            }
            break;
            
        case 'fry':
            if (!isPeeled) {
                output.innerHTML += `You need to peel the potato first!<br>Use 'peel' command.<br><br>`;
            } else if (isMashed) {
                output.innerHTML += `Cannot fry an already mashed potato!<br>Use 'clear' to get a new potato.<br><br>`;
            } else {
                isFried = true;
                output.innerHTML += `Frying potato...<br>Potato fried! Now it's French fries.<br><br>`;
            }
            break;
            
        case 'mash':
            if (!isPeeled) {
                output.innerHTML += `You need to peel the potato first!<br>Use 'peel' command.<br><br>`;
            } else if (isFried) {
                output.innerHTML += `Cannot mash an already fried potato!<br>Use 'clear' to get a new potato.<br><br>`;
            } else {
                isMashed = true;
                output.innerHTML += `Mashing potato...<br>Potato mashed! Ready to eat.<br><br>`;
            }
            break;
            
        case 'clear':
            isPeeled = false;
            isFried = false;
            isMashed = false;
            output.innerHTML = `SpudDOS Terminal [Version 5.0.2195]<br>(c) 1998 SpudSoft Corp. All rights reserved.<br><br>C:\\> `;
            break;
            
        case 'spud':
            output.innerHTML += `SpudSoft PotatoOS<br>
Copyright © 1998 SpudSoft Corporation<br>
All rights reserved.<br><br>
SpudSoft was founded in 1982 by Sir Spuddington III, a visionary<br>
entrepreneur who believed that potatoes could power the computing revolution.<br><br>
Our mission: "To tuberfy the world one spud at a time."<br><br>`;
            break;
            
        case 'history':
            output.innerHTML += `Command history:<br>
1. help<br>
2. spud<br>
3. clear<br><br>`;
            break;
            
        case 'reboot':
            output.innerHTML += `Preparing to reboot system...<br>`;
            setTimeout(() => {
                document.getElementById('bsod').style.display = 'flex';
                setTimeout(() => {
                    document.getElementById('bsod').style.display = 'none';
                    output.innerHTML = `SpudDOS Terminal [Version 5.0.2195]<br>(c) 1998 SpudSoft Corp. All rights reserved.<br><br>C:\\> `;
                }, 3000);
            }, 1000);
            break;
            
        default:
            output.innerHTML += `'${cmd}' is not recognized as an internal or external command,<br>operable program or batch file.<br><br>`;
            break;
    }
}

// Paint functions
function initPaint() {
    const canvas = document.getElementById('paint-canvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pencil';
    let currentColor = '#000000';
    
    // Set canvas background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Tool selection
    const tools = document.querySelectorAll('.paint-tool');
    tools.forEach(tool => {
        tool.addEventListener('click', () => {
            tools.forEach(t => t.classList.remove('selected'));
            tool.classList.add('selected');
            currentTool = tool.getAttribute('data-tool');
        });
    });
    
    // Color picker
    const colorPicker = document.getElementById('paint-color-picker');
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
    });
    
    // Drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        ctx.strokeStyle = currentColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = currentTool === 'pencil' ? 1 : 3;
        
        if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            if (currentTool === 'eraser') {
                ctx.strokeStyle = 'white';
            }
            ctx.stroke();
            [lastX, lastY] = [currentX, currentY];
        } else if (currentTool === 'line') {
            // For line, we need to redraw the canvas each time
            redrawCanvas();
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        }
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    function redrawCanvas() {
        // This would be used to implement shapes that need preview
        // For now, just a placeholder
    }
}

// Minespudder game
function initMinespudder() {
    const grid = document.getElementById('minespudder-grid');
    const face = document.getElementById('minespudder-face');
    const counter = document.getElementById('minespudder-counter');
    
    // Create a 9x9 grid
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'minespudder-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', () => revealCell(cell));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                flagCell(cell);
            });
            grid.appendChild(cell);
        }
    }
    
    // Place mines randomly
    const cells = document.querySelectorAll('.minespudder-cell');
    const mineCount = 10;
    let minesPlaced = 0;
    
    while (minesPlaced < mineCount) {
        const randomIndex = Math.floor(Math.random() * cells.length);
        if (!cells[randomIndex].classList.contains('mine')) {
            cells[randomIndex].classList.add('mine');
            minesPlaced++;
        }
    }
    
    // Calculate adjacent mines for each cell
    cells.forEach(cell => {
        if (!cell.classList.contains('mine')) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            let adjacentMines = 0;
            
            // Check all 8 surrounding cells
            for (let i = Math.max(0, row - 1); i <= Math.min(8, row + 1); i++) {
                for (let j = Math.max(0, col - 1); j <= Math.min(8, col + 1); j++) {
                    if (i === row && j === col) continue;
                    const neighbor = document.querySelector(`.minespudder-cell[data-row="${i}"][data-col="${j}"]`);
                    if (neighbor.classList.contains('mine')) {
                        adjacentMines++;
                    }
                }
            }
            
            if (adjacentMines > 0) {
                cell.dataset.mines = adjacentMines;
            }
        }
    });
    
    // Set counter
    counter.textContent = mineCount.toString().padStart(3, '0');
}

function revealCell(cell) {
    if (cell.classList.contains('revealed') || cell.classList.contains('flagged')) return;
    
    cell.classList.add('revealed');
    
    if (cell.classList.contains('mine')) {
        // Game over
        cell.textContent = '💣';
        document.querySelectorAll('.minespudder-cell.mine').forEach(mine => {
            mine.classList.add('revealed');
            mine.textContent = '💣';
        });
        document.getElementById('minespudder-face').textContent = '😵';
    } else {
        const adjacentMines = cell.dataset.mines;
        if (adjacentMines) {
            cell.textContent = adjacentMines;
        } else {
            // Reveal adjacent cells (flood fill)
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            for (let i = Math.max(0, row - 1); i <= Math.min(8, row + 1); i++) {
                for (let j = Math.max(0, col - 1); j <= Math.min(8, col + 1); j++) {
                    if (i === row && j === col) continue;
                    const neighbor = document.querySelector(`.minespudder-cell[data-row="${i}"][data-col="${j}"]`);
                    revealCell(neighbor);
                }
            }
        }
    }
}

function flagCell(cell) {
    if (cell.classList.contains('revealed')) return;
    
    if (cell.classList.contains('flagged')) {
        cell.classList.remove('flagged');
        cell.textContent = '';
    } else {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
    }
}

function resetMinespudder() {
    const cells = document.querySelectorAll('.minespudder-cell');
    cells.forEach(cell => {
        cell.className = 'minespudder-cell';
        cell.textContent = '';
        cell.removeAttribute('data-mines');
    });
    
    // Place new mines
    const mineCount = 10;
    let minesPlaced = 0;
    
    while (minesPlaced < mineCount) {
        const randomIndex = Math.floor(Math.random() * cells.length);
        if (!cells[randomIndex].classList.contains('mine')) {
            cells[randomIndex].classList.add('mine');
            minesPlaced++;
        }
    }
    
    // Calculate adjacent mines for each cell
    cells.forEach(cell => {
        if (!cell.classList.contains('mine')) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            let adjacentMines = 0;
            
            // Check all 8 surrounding cells
            for (let i = Math.max(0, row - 1); i <= Math.min(8, row + 1); i++) {
                for (let j = Math.max(0, col - 1); j <= Math.min(8, col + 1); j++) {
                    if (i === row && j === col) continue;
                    const neighbor = document.querySelector(`.minespudder-cell[data-row="${i}"][data-col="${j}"]`);
                    if (neighbor.classList.contains('mine')) {
                        adjacentMines++;
                    }
                }
            }
            
            if (adjacentMines > 0) {
                cell.dataset.mines = adjacentMines;
            }
        }
    });
    
    document.getElementById('minespudder-face').textContent = '😊';
}

// Sphere 3D visualization
function initSphere() {
    const canvas = document.getElementById('sphere-canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    let angle = 0;
    
    function drawSphere() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw sphere
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 100;
        
        // Create gradient for 3D effect
        const gradient = ctx.createRadialGradient(
            centerX - radius * 0.3 * Math.cos(angle),
            centerY - radius * 0.3 * Math.sin(angle),
            radius * 0.1,
            centerX,
            centerY,
            radius
        );
        
        gradient.addColorStop(0, '#a0a000');
        gradient.addColorStop(1, '#606000');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(
            centerX + radius * 0.3 * Math.cos(angle + Math.PI / 4),
            centerY + radius * 0.3 * Math.sin(angle + Math.PI / 4),
            radius * 0.2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        angle += 0.01;
        requestAnimationFrame(drawSphere);
    }
    
    drawSphere();
}

// DOOM implementation (simplified walking simulator)
function initDOOM() {
    const canvas = document.getElementById('doom-canvas');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    
    // Simple raycasting demo
    const player = {
        x: 100,
        y: 100,
        angle: 0,
        fov: Math.PI / 3
    };
    
    // Simple map (1 = wall, 0 = empty)
    const map = [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
    ];
    
    const cellSize = 64;
    const colors = {
        wall: '#a0a000',
        floor: '#808080',
        ceiling: '#404040'
    };
    
    // Controls
    const keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        ArrowLeft: false,
        ArrowRight: false
    };
    
    document.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = false;
        }
    });
    
    // Game loop
    function gameLoop() {
        // Handle input
        const moveSpeed = 2;
        const rotSpeed = 0.05;
        
        if (keys.w) {
            player.x += Math.cos(player.angle) * moveSpeed;
            player.y += Math.sin(player.angle) * moveSpeed;
        }
        if (keys.s) {
            player.x -= Math.cos(player.angle) * moveSpeed;
            player.y -= Math.sin(player.angle) * moveSpeed;
        }
        if (keys.a) {
            player.angle -= rotSpeed;
        }
        if (keys.d) {
            player.angle += rotSpeed;
        }
        if (keys.ArrowLeft) {
            player.angle -= rotSpeed;
        }
        if (keys.ArrowRight) {
            player.angle += rotSpeed;
        }
        
        // Simple collision detection
        const playerCellX = Math.floor(player.x / cellSize);
        const playerCellY = Math.floor(player.y / cellSize);
        
        if (map[playerCellY] && map[playerCellY][playerCellX] === 1) {
            // Move player back
            player.x -= Math.cos(player.angle) * moveSpeed;
            player.y -= Math.sin(player.angle) * moveSpeed;
        }
        
        // Render
        render();
        requestAnimationFrame(gameLoop);
    }
    
    function render() {
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw ceiling
        ctx.fillStyle = colors.ceiling;
        ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
        
        // Draw floor
        ctx.fillStyle = colors.floor;
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        
        // Raycasting
        const numRays = canvas.width;
        const rayAngleStep = player.fov / numRays;
        
        for (let i = 0; i < numRays; i++) {
            const rayAngle = player.angle - player.fov / 2 + i * rayAngleStep;
            castRay(rayAngle, i);
        }
    }
    
    function castRay(angle, column) {
        // Simplified raycasting
        const maxDistance = 1000;
        const rayStep = 1;
        
        let rayX = player.x;
        let rayY = player.y;
        let distance = 0;
        let hitWall = false;
        
        const rayDirX = Math.cos(angle);
        const rayDirY = Math.sin(angle);
        
        while (!hitWall && distance < maxDistance) {
            rayX += rayDirX * rayStep;
            rayY += rayDirY * rayStep;
            distance += rayStep;
            
            const cellX = Math.floor(rayX / cellSize);
            const cellY = Math.floor(rayY / cellSize);
            
            if (cellX < 0 || cellX >= map[0].length || cellY < 0 || cellY >= map.length) {
                hitWall = true;
            } else if (map[cellY][cellX] === 1) {
                hitWall = true;
            }
        }
        
        if (hitWall) {
            // Calculate wall height
            const correctedDistance = distance * Math.cos(angle - player.angle);
            const wallHeight = Math.min((cellSize * canvas.height) / correctedDistance, canvas.height);
            
            // Draw wall slice
            const wallX = column;
            const wallY = (canvas.height - wallHeight) / 2;
            
            // Calculate color based on distance
            const shade = Math.max(0, 255 - distance / 2);
            ctx.fillStyle = `rgb(${shade}, ${shade}, 0)`;
            ctx.fillRect(wallX, wallY, 1, wallHeight);
        }
    }
    
    // Start game
    gameLoop();
}

// Browser functions
function navigateBrowser() {
    const address = document.getElementById('browser-address').value;
    navigateTo(address);
}

function navigateTo(url) {
    const content = document.getElementById('browser-content');
    
    // Add to history
    if (url !== browserHistory[currentHistoryIndex]) {
        browserHistory = browserHistory.slice(0, currentHistoryIndex + 1);
        browserHistory.push(url);
        currentHistoryIndex = browserHistory.length - 1;
    }
    
    // Simple navigation simulation
    if (url.includes('spudnet.spud')) {
        if (url.includes('wiki')) {
            content.innerHTML = `
                <h1>Spudpedia - The Potato Encyclopedia</h1>
                <h2>Potato (Solanum tuberosum)</h2>
                <p>The potato is a starchy tuber of the plant Solanum tuberosum and is a root vegetable native to the Americas. The plant is a perennial in the nightshade family Solanaceae.</p>
                
                <h3>History</h3>
                <p>Potatoes were domesticated approximately 7,000-10,000 years ago in what is now modern-day Peru and Bolivia. The Spanish introduced potatoes to Europe in the second half of the 16th century.</p>
                
                <h3>SpudSoft Connection</h3>
                <p>SpudSoft founder Sir Spuddington III is a direct descendant of the Inca potato farmers who first cultivated this noble tuber. His family's secret potato-growing techniques are said to be the foundation of SpudSoft's technological innovations.</p>
                
                <p>Did you know? The world's largest potato weighed 10 pounds 14 ounces (4.98 kilograms) and was grown in England in 1795.</p>
                
                <p>SpudSoft has pioneered potato-based computing technology since 1982, creating revolutionary systems that harness the natural power of tubers for all computing needs.</p>

                <p>Potatoes are not just food but the foundation of all technology. The first computers were powered by potato batteries, and the internet (SpudNet) runs on potato-based quantum entanglement.</p>
            `;
        } else if (url.includes('tube')) {
            content.innerHTML = `
                <h1>SpudTube</h1>
                <p>Watch potato-related videos</p>
                <div style="background: #000; width: 320px; height: 240px; display: flex; align-items: center; justify-content: center; color: white; margin: 10px 0;">
                    [Video Player] Now playing: "How to Grow Giant Potatoes"
                </div>
                <h3>Recommended Videos:</h3>
                <ul>
                    <li>Potato Chip Factory Tour</li>
                    <li>Mashed Potato Sculpture Contest 1923</li>
                    <li>The Secret Life of Potatoes (Documentary)</li>
                    <li>SpudSoft Founder Interview: "Why Potatoes?"</li>
                </ul>
            `;
        } else if (url.includes('shop')) {
            content.innerHTML = `
                <h1>SpudMart - Your Potato Superstore</h1>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="border: 1px solid #ccc; padding: 10px;">
                        <h3>SpudSoft PotatoOS 5.0</h3>
                        <p>The latest version of our potato-powered OS</p>
                        <p>$99.99</p>
                        <button>Add to Cart</button>
                    </div>
                    <div style="border: 1px solid #ccc; padding: 10px;">
                        <h3>Potato Laptop</h3>
                        <p>Runs for 6 months on a single potato</p>
                        <p>$499.99</p>
                        <button>Add to Cart</button>
                    </div>
                    <div style="border: 1px solid #ccc; padding: 10px;">
                        <h3>Potato Phone</h3>
                        <p>Make calls, send texts, and when hungry - eat it!</p>
                        <p>$199.99</p>
                        <button>Add to Cart</button>
                    </div>
                </div>
            `;
        } else if (url.includes('news')) {
            content.innerHTML = `
                <h1>SpudNews - Latest Potato Headlines</h1>
                <div style="border-bottom: 1px solid #ccc; padding: 10px 0;">
                    <h2>SpudSoft Announces PotatoOS 6.0</h2>
                    <p>Coming next year: The most tuberific operating system yet, now with 20% more starch!</p>
                </div>
                <div style="border-bottom: 1px solid #ccc; padding: 10px 0;">
                    <h2>World Potato Production Hits Record High</h2>
                    <p>Experts credit SpudSoft's innovative farming techniques for the 15% increase.</p>
                </div>
                <div style="border-bottom: 1px solid #ccc; padding: 10px 0;">
                    <h2>Potato-Based Battery Breakthrough</h2>
                    <p>Scientists at SpudSoft Labs have created a potato battery that lasts 10 years.</p>
                </div>
            `;
        } else if (url.includes('facts')) {
            content.innerHTML = `
                <h1>SpudFacts - Random Potato Knowledge</h1>
                <div id="potato-fact-container" style="min-height: 100px; padding: 20px; border: 2px dashed #ccc; margin: 20px 0;">
                    <p>Click the button below to get a random potato fact!</p>
                </div>
                <button onclick="displayRandomPotatoFact()" style="padding: 10px 20px; font-size: 16px;">
                    Generate Potato Fact
                </button>
                <p>Did you know? There are over 4,000 varieties of potatoes worldwide!</p>
            `;
        } else {
            // Main SpudNet page
            content.innerHTML = `
                <h1>Welcome to SpudNet</h1>
                <p>The potato-powered search engine</p>
                <input type="text" style="width: 300px; padding: 5px; margin: 10px 0;">
                <button style="padding: 5px;">Spud Search</button>
                <p>Try searching for: potato recipes, spudsoft history, or tuber tech</p>
                
                <h2>Today's Featured Potato:</h2>
                <p>The Russet Burbank - SpudSoft's official mascot potato since 1985.</p>
                
                <h2>New Site:</h2>
                <p>Check out our new <a href="#" onclick="navigateTo('http://facts.spudnet.spud')">Potato Facts</a> website!</p>
            `;
        }
    } else if (url.includes('potato')) {
        // Easter egg for any URL containing "potato"
        content.innerHTML = `
            <h1>Potato Overload!</h1>
            <p>You've discovered SpudSoft's secret potato database!</p>
            ${Array(20).fill().map((_, i) => `
                <h3>Potato Fact #${i+1}</h3>
                <p>${getRandomPotatoFact()}</p>
            `).join('')}
        `;
    } else {
        content.innerHTML = `
            <h1>Page Not Found</h1>
            <p>Could not load ${url}</p>
            <p>Try one of these SpudNet sites instead (or try searching for potatos!):</p>
            <ul>
                <li><a href="#" onclick="navigateTo('http://www.spudnet.spud/')">SpudNet Home</a></li>
                <li><a href="#" onclick="navigateTo('http://wiki.spudnet.spud/')">Spudpedia</a></li>
                <li><a href="#" onclick="navigateTo('http://tube.spudnet.spud/')">SpudTube</a></li>
                <li><a href="#" onclick="navigateTo('http://facts.spudnet.spud/')">SpudFacts</a></li>
            </ul>
        `;
    }
    
    document.getElementById('browser-address').value = url;
    document.querySelector('.window-statusbar').textContent = 'Done';
}

function getRandomPotatoFact() {
    const facts = [
        "Potatoes are composed of about 80% water and 20% solids.",
        "Potatoes are a great source of vitamin C, potassium, and vitamin B6.",
        "A medium-sized potato contains no fat, no cholesterol, and is naturally gluten-free.",
        "Potatoes are members of the nightshade family, along with tomatoes, peppers, and eggplants.",
        "Sweet potatoes are not true potatoes and belong to a different plant family entirely.",
        "The leaves and stems of potato plants contain solanine, a toxic compound that should not be eaten.",
        "Potatoes are one of the most energy-efficient food crops in terms of calories produced per unit of land and input.",
        "There are thousands of varieties of potatoes, ranging in size, color, texture, and flavor.",
        "Potatoes are a cool-season crop and grow best in loose, well-drained soil.",
        "Potatoes are tubers — swollen underground stems that store nutrients for the plant.",
        "Potatoes can be propagated from 'seed potatoes,' which are just pieces of potato with at least one eye (bud).",
        "Potatoes develop green skin when exposed to light, which indicates the presence of solanine.",
        "Potatoes are one of the most widely grown food crops in the world.",
        "Cooking methods can affect the nutritional content of potatoes — boiling with skin preserves more nutrients.",
        "Starch is the main carbohydrate found in potatoes, providing a quick source of energy.",
        "Potatoes are among the first crops to be grown in controlled environments like greenhouses and hydroponic systems.",
        "Potato plants flower and can produce small green fruits that resemble tomatoes, but these are not edible.",
        "Potatoes can be used to produce ethanol and biodegradable plastics in some industrial processes.",
        "Freezing or refrigerating raw potatoes can alter their texture and taste due to changes in starch composition.",
        "Potatoes contain antioxidants, including compounds like flavonoids and carotenoids."
    ];
    return facts[Math.floor(Math.random() * facts.length)];
}

function displayRandomPotatoFact() {
    const container = document.getElementById('potato-fact-container');
    container.innerHTML = `
        <h3>Did you know?</h3>
        <p>${getRandomPotatoFact()}</p>
    `;
}

function browserBack() {
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        navigateTo(browserHistory[currentHistoryIndex]);
    }
}

function browserForward() {
    if (currentHistoryIndex < browserHistory.length - 1) {
        currentHistoryIndex++;
        navigateTo(browserHistory[currentHistoryIndex]);
    }
}

function browserStop() {
    document.querySelector('.window-statusbar').textContent = 'Stopped';
}

function browserRefresh() {
    navigateTo(browserHistory[currentHistoryIndex]);
}

function browserHome() {
    navigateTo('http://www.spudnet.spud/');
}

// System functions
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    document.getElementById('taskbar-clock').textContent = 
        `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function showError(message) {
    playSound('error');
    alert(`Error: ${message}`);
}

function shutdown() {
    document.getElementById('bsod').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('bsod').style.display = 'none';
        // Close all windows
        Object.keys(windows).forEach(windowId => {
            closeWindow(windowId);
        });
    }, 3000);
}

function showTaskManager() {
    openWindow('task-manager');
    toggleStartMenu();
}

function switchTaskManagerTab(tab) {
    const tabs = document.querySelectorAll('.task-manager-tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'applications') {
        tabs[0].classList.add('active');
        document.querySelector('.task-manager-list').style.display = 'table';
    } else if (tab === 'processes') {
        tabs[1].classList.add('active');
        document.querySelector('.task-manager-list').style.display = 'none';
        document.getElementById('task-manager-content').innerHTML = `
            <p style="padding: 10px;">System processes would be listed here.</p>
        `;
    } else if (tab === 'performance') {
        tabs[2].classList.add('active');
        document.querySelector('.task-manager-list').style.display = 'none';
        document.getElementById('task-manager-content').innerHTML = `
            <div style="padding: 10px;">
                <h3>System Performance</h3>
                <p>CPU Usage: ${Math.floor(Math.random() * 100)}%</p>
                <p>Memory Usage: ${Math.floor(Math.random() * 100)}%</p>
                <p>Potato Power: 100%</p>
            </div>
        `;
    }
}

function showMenu(menuId, element) {
    // Simple menu implementation
    const menuItems = {
        'file-menu': ['New', 'Open', 'Save', 'Exit'],
        'edit-menu': ['Undo', 'Cut', 'Copy', 'Paste'],
        'view-menu': ['Zoom In', 'Zoom Out', 'Full Screen'],
        'help-menu': ['Help Topics', 'About'],
        'favorites-menu': ['Add to Favorites', 'Organize Favorites'],
        'spud-menu': ['Peel', 'Fry', 'Mash'],
        'terminal-menu': ['Clear', 'Settings'],
        'game-menu': ['New Game', 'Difficulty', 'High Scores'],
        'options-menu': ['Settings', 'Preferences'],
        'format-menu': ['Font', 'Word Wrap', 'Background Color']
    };
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'absolute';
    menu.style.left = `${element.offsetLeft}px`;
    menu.style.top = `${element.offsetTop + element.offsetHeight}px`;
    menu.style.backgroundColor = '#c0c0c0';
    menu.style.border = '2px solid #ffffff';
    menu.style.borderRightColor = '#808080';
    menu.style.borderBottomColor = '#808080';
    menu.style.zIndex = '1000';
    
    if (menuItems[menuId]) {
        menuItems[menuId].forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item;
            menuItem.style.padding = '5px 20px';
            menuItem.style.cursor = 'pointer';
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#000080';
                menuItem.style.color = 'white';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = '';
                menuItem.style.color = '';
            });
            menuItem.addEventListener('click', () => {
                document.body.removeChild(menu);
                showError(`${item} function is not implemented in this demo.`);
            });
            menu.appendChild(menuItem);
        });
    }
    
    // Remove any existing menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
    }
    
    document.body.appendChild(menu);
    
    // Close menu when clicking elsewhere
    const closeMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== element) {
            document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

// File explorer functions
function openFolder(folderId) {
    alert(`Opening folder: ${folderId}`);
}

function openSystemInfo() {
    const windowId = 'system-info';
    if (!windows[windowId]) {
        createWindow({
            id: windowId,
            title: 'System Information',
            content: `
                <h2>SpudSoft PotatoOS System Information</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <h3>System</h3>
                        <p><strong>OS:</strong> PotatoOS 5.0</p>
                        <p><strong>Version:</strong> 5.0.2195</p>
                        <p><strong>Build:</strong> 2195.spud.010101</p>
                    </div>
                    <div>
                        <h3>Hardware</h3>
                        <p><strong>Processor:</strong> Potato 486DX-100</p>
                        <p><strong>Memory:</strong> 16MB RAM</p>
                        <p><strong>Storage:</strong> 1.2GB Spud Drive</p>
                    </div>
                </div>
                <h3>SpudSoft Information</h3>
                <p>SpudSoft Corporation was founded in 1982 by Sir Spuddington III.</p>
                <p>All systems are powered by proprietary potato-based technology.</p>
                <p>© 1998 SpudSoft Corporation. All rights reserved.</p>
            `,
            width: 500,
            height: 400
        });
    }
    openWindow(windowId);
}

function openDriveInfo() {
    const windowId = 'drive-info';
    if (!windows[windowId]) {
        createWindow({
            id: windowId,
            title: 'Spud Drive (C:) Properties',
            content: `
                <h2>Spud Drive (C:)</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                    <div>
                        <h3>Drive Information</h3>
                        <p><strong>Type:</strong> Fixed Disk</p>
                        <p><strong>File System:</strong> SPUDFS</p>
                        <p><strong>Capacity:</strong> 1.2GB</p>
                        <p><strong>Used Space:</strong> 357MB</p>
                        <p><strong>Free Space:</strong> 843MB</p>
                    </div>
                    <div>
                        <div style="width: 150px; height: 150px; background: conic-gradient(#a0a000 0% 30%, #c0c0c0 30% 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                            <div style="background: white; width: 100px; height: 100px; border-radius: 50%;"></div>
                        </div>
                    </div>
                </div>
                <h3>Contents</h3>
                <ul>
                    <li>PotatoOS System Files</li>
                    <li>SpudSoft Applications</li>
                    <li>User Documents</li>
                    <li>Potato Cache</li>
                    <li>Temporary Files</li>
                </ul>
            `,
            width: 500,
            height: 400
        });
    }
    openWindow(windowId);
}

function createWindow(options) {
    const windowEl = document.createElement('div');
    windowEl.className = 'window';
    windowEl.id = options.id;
    windowEl.style.width = `${options.width}px`;
    windowEl.style.height = `${options.height}px`;
    windowEl.style.display = 'none';
    windowEl.style.position = 'absolute';
    windowEl.style.left = '100px';
    windowEl.style.top = '100px';
    
    windowEl.innerHTML = `
        <div class="window-header">
            <div class="window-title">
                <img src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23000080"/><path d="M8,3 L14,3 L14,13 L2,13 L2,7 Z" fill="%23a0a000"/><path d="M2,7 L8,7 L8,3" fill="%23808000"/></svg>' alt="${options.title}">
                ${options.title}
            </div>
            <div class="window-controls">
                <div class="window-control" onclick="minimizeWindow('${options.id}')">_</div>
                <div class="window-control" onclick="maximizeWindow('${options.id}')">□</div>
                <div class="window-control" onclick="closeWindow('${options.id}')">X</div>
            </div>
        </div>
        <div class="window-content">
            ${options.content}
        </div>
        <div class="window-statusbar">
            <span>Ready</span>
        </div>
        <div class="resize-handle resize-handle-bottom-right"></div>
    `;
    
    document.getElementById('desktop').appendChild(windowEl);
    
    // Make window draggable
    const header = windowEl.querySelector('.window-header');
    header.addEventListener('mousedown', startDrag);
    
    // Make window resizable
    const resizeHandle = windowEl.querySelector('.resize-handle');
    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', startResize);
    }
    
    // Add to windows object
    windows[options.id] = {
        element: windowEl,
        minimized: false,
        maximized: false,
        originalWidth: options.width,
        originalHeight: options.height,
        originalLeft: 100,
        originalTop: 100
    };
}

// Drag and resize functions
function startDrag(e) {
    if (e.button !== 0) return; // Only left mouse button
    
    const windowEl = e.target.closest('.window');
    if (!windowEl) return;
    
    const windowId = windowEl.id;
    const windowData = windows[windowId];
    
    if (windowData.maximized) return;
    
    bringToFront(windowId);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = parseInt(windowEl.style.left);
    const startTop = parseInt(windowEl.style.top);
    
    function moveWindow(e) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        windowEl.style.left = `${startLeft + dx}px`;
        windowEl.style.top = `${startTop + dy}px`;
    }
    
    function stopDrag() {
        document.removeEventListener('mousemove', moveWindow);
        document.removeEventListener('mouseup', stopDrag);
    }
    
    document.addEventListener('mousemove', moveWindow);
    document.addEventListener('mouseup', stopDrag);
}

function startResize(e) {
    if (e.button !== 0) return; // Only left mouse button
    
    const windowEl = e.target.closest('.window');
    if (!windowEl) return;
    
    const windowId = windowEl.id;
    const windowData = windows[windowId];
    
    if (windowData.maximized) return;
    
    bringToFront(windowId);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = windowEl.offsetWidth;
    const startHeight = windowEl.offsetHeight;
    
    function resizeWindow(e) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const newWidth = Math.max(300, startWidth + dx);
        const newHeight = Math.max(200, startHeight + dy);
        
        windowEl.style.width = `${newWidth}px`;
        windowEl.style.height = `${newHeight}px`;
        
        // For Tuber Paint, resize canvas
        if (windowId === 'tuber-paint') {
            const canvas = document.getElementById('paint-canvas');
            const container = document.getElementById('paint-canvas-container');
            canvas.width = container.offsetWidth - 10;
            canvas.height = container.offsetHeight - 40;
        }
    }
    
    function stopResize() {
        document.removeEventListener('mousemove', resizeWindow);
        document.removeEventListener('mouseup', stopResize);
    }
    
    document.addEventListener('mousemove', resizeWindow);
    document.addEventListener('mouseup', stopResize);
}

// Keyboard shortcuts
function handleKeyDown(e) {
    // CTRL+ALT+DEL
    if (e.ctrlKey && e.altKey && e.key === 'Delete') {
        showTaskManager();
        e.preventDefault();
        return;
    }
    
    // Screensaver toggle (Ctrl+Alt+S)
    if (e.ctrlKey && e.altKey && e.key === 'S') {
        if (screensaverActive) {
            hideScreensaver();
        } else {
            showScreensaver();
        }
        e.preventDefault();
        return;
    }
    
    // Konami code
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    konamiCode.push(e.key);
    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        activateKonamiCode();
        konamiCode = [];
    }
    
    // Close active window with ALT+F4
    if (e.altKey && e.key === 'F4' && activeWindow) {
        closeWindow(activeWindow);
        e.preventDefault();
    }
    
    // Prevent F5 refresh
    if (e.key === 'F5') {
        e.preventDefault();
        showError('Use the Refresh button in TaterNet Explorer instead');
    }
    
    // Any key to close BSOD
    if (document.getElementById('bsod').style.display === 'flex') {
        document.getElementById('bsod').style.display = 'none';
    }
}

function activateKonamiCode() {
    const icons = document.querySelectorAll('.desktop-icon img');
    icons.forEach(icon => {
        icon.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23000080"/><ellipse cx="16" cy="16" rx="12" ry="8" fill="%23a0a000"/><circle cx="10" cy="14" r="2" fill="%23808000"/><circle cx="22" cy="14" r="2" fill="%23808000"/><path d="M10,20 Q16,24 22,20" stroke="%23808000" stroke-width="2" fill="none"/></svg>';
    });
    
    // Show notification
    alert('Konami code activated!!');
}

// Idle timer and screensaver
function resetIdleTimer() {
    if (screensaverActive) {
        hideScreensaver();
    }
    
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showScreensaver, 5 * 60 * 1000); // 5 minutes
}

function showScreensaver() {
    screensaverActive = true;
    const screensaver = document.getElementById('screensaver');
    screensaver.style.display = 'block';
    
    // Create flying potatoes
    for (let i = 0; i < 5; i++) {
        createFlyingPotato();
    }
}

function hideScreensaver() {
    screensaverActive = false;
    const screensaver = document.getElementById('screensaver');
    screensaver.style.display = 'none';
    screensaver.innerHTML = '';
}

function createFlyingPotato() {
    const potato = document.createElement('div');
    potato.className = 'flying-potato';
    potato.style.left = `${Math.random() * 80}%`;
    potato.style.top = `${Math.random() * 80}%`;
    potato.style.animationDuration = `${5 + Math.random() * 10}s`;
    document.getElementById('screensaver').appendChild(potato);
}

// Sound effects
function playSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Different sounds for different actions
        switch(type) {
            case 'start':
                oscillator.frequency.value = 440;
                break;
            case 'error':
                oscillator.frequency.value = 220;
                break;
            case 'click':
                oscillator.frequency.value = 880;
                break;
            case 'open':
                oscillator.frequency.value = 523.25; // C
                break;
            case 'close':
                oscillator.frequency.value = 392.00; // G
                break;
            case 'notify':
                oscillator.frequency.value = 659.25; // E
                break;
            case 'success':
                // Play a little melody
                const now = audioCtx.currentTime;
                oscillator.frequency.setValueAtTime(659.25, now); // E
                oscillator.frequency.setValueAtTime(783.99, now + 0.1); // G
                oscillator.frequency.setValueAtTime(1046.50, now + 0.2); // C
                break;
            default:
                oscillator.frequency.value = 660;
        }
        
        gainNode.gain.value = 0.1;
        oscillator.start();
        
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.log('Audio playback error:', e);
    }
}

// Initialize DOOM when the window is opened
document.getElementById('potato-exe').addEventListener('click', function initDOOMOnce() {
    initDOOM();
    this.removeEventListener('click', initDOOMOnce);
});