window.onload = function () {
  console.log('Game initializing...');

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Create footer
  const footer = document.createElement('footer');
  footer.style.position = 'fixed';
  footer.style.bottom = '10px';
  footer.style.left = '0';
  footer.style.width = '100%';
  footer.style.textAlign = 'center';
  footer.style.padding = '10px';
  footer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  footer.style.color = 'white';
  footer.style.fontFamily = 'Arial, sans-serif';
  footer.style.zIndex = '1000';

  // Create social links
  const twitterLink = document.createElement('a');
  twitterLink.href = 'https://x.com/heyandras';
  twitterLink.textContent = 'Twitter/X';
  twitterLink.style.color = '#ffffff';
  twitterLink.style.textDecoration = 'none';
  twitterLink.style.margin = '0 10px';
  twitterLink.target = '_blank';

  const githubLink = document.createElement('a');
  githubLink.href = 'https://github.com/heyandras/bomberman';
  githubLink.textContent = 'GitHub';
  githubLink.style.color = '#ffffff';
  githubLink.style.textDecoration = 'none';
  githubLink.style.margin = '0 10px';
  githubLink.target = '_blank';

  // Add hover effect
  [twitterLink, githubLink].forEach(link => {
    link.addEventListener('mouseover', () => {
      link.style.color = '#ffff00';
    });
    link.addEventListener('mouseout', () => {
      link.style.color = '#ffffff';
    });
  });

  // Add links to footer
  footer.appendChild(twitterLink);
  footer.appendChild(document.createTextNode(' | '));
  footer.appendChild(githubLink);
  document.body.appendChild(footer);

  // Debug mode using localStorage
  const DEBUG = localStorage.getItem('DEBUG') === 'true';

  function debugLog(...args) {
    if (DEBUG) {
      console.log(...args);
    }
  }

  // Game constants
  const TILE_SIZE = 40;
  const GRID_WIDTH = 21;
  const GRID_HEIGHT = 21;
  const BASE_PLAYER_SPEED = 4; // pixels per frame
  const SPEED_INCREMENT = 0.5; // Speed increase per power-up
  const MAX_SPEED = BASE_PLAYER_SPEED * 2;
  const MAX_EXPLOSION_SIZE = 10;
  const BOMB_TIMER = 2000; // 2 seconds
  const EXPLOSION_DURATION = 500; // 0.5 seconds
  const EXPLOSION_SIZE = 1; // Number of tiles in each direction
  const PADDING = 60; // Padding around the game area
  const POWERUP_DROP_CHANCE = 0.2; // 10% chance to drop a power-up
  const PLAYER_MAX_HEALTH = 1;
  const GAME_OVER_DURATION = 4000; // 4 seconds for game over screen
  const ENEMY_SPEED = 2; // pixels per frame
  const ENEMY_SIZE = TILE_SIZE - 20; // Slightly smaller than player
  const ENEMY_MOVE_INTERVAL = 500; // Change direction every 1 second
  const NUM_ENEMIES = 5; // Number of enemies in the game
  const MIN_DISTANCE_FROM_PLAYER = 5;

  // Create stats canvas
  const statsCanvas = document.createElement('canvas');
  statsCanvas.style.position = 'fixed';
  statsCanvas.style.top = '10px';
  statsCanvas.style.right = '10px';
  statsCanvas.style.background = 'rgba(0, 0, 0, 0.85)';
  statsCanvas.style.border = '2px solid rgba(255, 255, 255, 0.3)';
  statsCanvas.style.borderRadius = '5px';
  statsCanvas.width = 200;
  statsCanvas.height = 290;
  const statsCtx = statsCanvas.getContext('2d');

  // Power-ups
  let powerUps = [];
  const POWERUP_TYPES = {
    SPEED: 'speed',
    EXPLOSION: 'explosion',
    BOMB: 'bomb'
  };

  // Game grid: 0 = empty, 1 = indestructible wall, 2 = destructible block, 3 = special block
  let gameGrid = [];

  // Enemy state
  let enemies = [];

  function updateCanvasSize() {
    // Calculate available space
    const maxWidth = window.innerWidth - (PADDING * 2);
    const maxHeight = window.innerHeight - (PADDING * 2);

    // Calculate the actual game area size
    const gameWidth = GRID_WIDTH * TILE_SIZE;
    const gameHeight = GRID_HEIGHT * TILE_SIZE;

    // Set canvas size to either the game size or 95% of available space, whichever is smaller
    canvas.width = Math.min(maxWidth, gameWidth);
    canvas.height = Math.min(maxHeight, gameHeight);

    // Calculate offset to center the game grid
    offsetX = Math.max(0, (canvas.width - gameWidth) / 2);
    offsetY = Math.max(0, (canvas.height - gameHeight) / 2);
  }

  // Initialize canvas size
  let offsetX, offsetY;
  updateCanvasSize();

  // Player stats
  const playerStats = {
    maxBombs: 1,
    currentBombs: 0,
    explosionSize: EXPLOSION_SIZE,
    speed: BASE_PLAYER_SPEED,
    health: PLAYER_MAX_HEALTH
  };

  console.log('Canvas dimensions:', {
    width: canvas.width,
    height: canvas.height
  });

  // Game state
  let bombs = [];
  let explosions = [];
  let gameOverTime = 0;
  let isGameOver = false;

  // Player state
  const player = {
    x: TILE_SIZE + TILE_SIZE / 2,
    y: TILE_SIZE + TILE_SIZE / 2,
    size: TILE_SIZE - 10,
    moving: {
      up: false,
      down: false,
      left: false,
      right: false
    },
    canPlaceBomb: true,
    bombsInContact: new Set() // Track bombs the player is in contact with
  };

  function resetGame() {
    // Reset game state
    isGameOver = false;
    gameOverTime = 0;

    // Reset player stats
    playerStats.maxBombs = 1;
    playerStats.currentBombs = 0;
    playerStats.explosionSize = EXPLOSION_SIZE;
    playerStats.speed = BASE_PLAYER_SPEED;
    playerStats.health = PLAYER_MAX_HEALTH;

    // Reset player position and state
    player.x = TILE_SIZE + TILE_SIZE / 2;
    player.y = TILE_SIZE + TILE_SIZE / 2;
    player.bombsInContact.clear();

    // Clear arrays
    bombs = [];
    explosions = [];
    powerUps = [];
    enemies = [];

    // Reinitialize grid
    initializeGrid();

    // Define safe distance from player (in tiles)

    // Add initial enemies in safe spots
    for (let i = 0; i < NUM_ENEMIES; i++) {
      let enemyX, enemyY, distanceFromPlayer;
      let attempts = 0;
      const MAX_ATTEMPTS = 100; // Prevent infinite loop

      do {
        enemyX = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
        enemyY = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
        attempts++;

        // Calculate distance from player's starting position (1,1)
        distanceFromPlayer = Math.sqrt(
          Math.pow(enemyX - 1, 2) + Math.pow(enemyY - 1, 2)
        );

      } while (
        (
          gameGrid[enemyY][enemyX] !== 0 || // Ensure spot is empty
          distanceFromPlayer < MIN_DISTANCE_FROM_PLAYER || // Not too close to player
          // Not too close to other enemies
          enemies.some(enemy =>
            Math.abs(Math.floor((enemy.x - offsetX) / TILE_SIZE) - enemyX) < 3 &&
            Math.abs(Math.floor((enemy.y - offsetY) / TILE_SIZE) - enemyY) < 3
          )
        ) && attempts < MAX_ATTEMPTS
      );

      // Only add enemy if we found a valid position
      if (attempts < MAX_ATTEMPTS) {
        enemies.push(createEnemy(enemyX, enemyY));
      }
    }
  }

  function checkPlayerDeath() {
    // Player collision parameters
    const playerRadius = player.size / 2;
    const playerCenterX = player.x;
    const playerCenterY = player.y;

    // Check for explosion collision
    for (const explosion of explosions) {
      // Calculate explosion center in pixel coordinates
      const explosionCenterX = explosion.gridX * TILE_SIZE + (TILE_SIZE / 2) + offsetX;
      const explosionCenterY = explosion.gridY * TILE_SIZE + (TILE_SIZE / 2) + offsetY;

      // Calculate distance between player and explosion centers
      const dx = playerCenterX - explosionCenterX;
      const dy = playerCenterY - explosionCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Use 80% of tile size for explosion collision
      const explosionRadius = TILE_SIZE * 0.4;

      if (distance < playerRadius + explosionRadius) {
        debugLog('Player died from explosion at:', explosion.gridX, explosion.gridY);
        isGameOver = true;
        gameOverTime = performance.now();
        return;
      }
    }

    // Check for enemy collision
    for (const enemy of enemies) {
      const enemyRadius = enemy.size / 2;

      // Calculate distance between player and enemy centers
      const dx = playerCenterX - enemy.x;
      const dy = playerCenterY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Use 80% of combined radii for more precise collision
      const collisionDistance = (playerRadius + enemyRadius) * 0.8;

      if (distance < collisionDistance) {
        debugLog('Player died from enemy collision at:', enemy.x, enemy.y);
        isGameOver = true;
        gameOverTime = performance.now();
        return;
      }
    }
  }

  function drawStats() {
    statsCtx.clearRect(0, 0, statsCanvas.width, statsCanvas.height);

    // Draw background
    statsCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    statsCtx.fillRect(0, 0, statsCanvas.width, statsCanvas.height);

    // Draw stats with improved contrast
    statsCtx.fillStyle = '#ffffff';
    statsCtx.font = 'bold 16px Arial';
    statsCtx.fillText(`Health: ${playerStats.health}/${PLAYER_MAX_HEALTH}`, 10, 25);
    statsCtx.fillText(`Bombs: ${playerStats.maxBombs - playerStats.currentBombs}/${playerStats.maxBombs}`, 10, 45);
    statsCtx.fillText(`Explosion Size: ${playerStats.explosionSize}`, 10, 65);
    statsCtx.fillText(`Speed: ${(playerStats.speed / BASE_PLAYER_SPEED).toFixed(1)}x`, 10, 85);

    // Draw legend title with improved visibility
    statsCtx.fillStyle = '#ffffff';
    statsCtx.font = 'bold 16px Arial';
    statsCtx.fillText('Power-ups:', 10, 115);

    // Helper function to draw power-up icon with improved visibility
    function drawPowerUpIcon(type, x, y, size) {
      switch (type) {
        case POWERUP_TYPES.SPEED:
          // Lightning bolt with improved contrast
          statsCtx.beginPath();
          statsCtx.moveTo(x + size * 0.6, y + size * 0.2);
          statsCtx.lineTo(x + size * 0.4, y + size * 0.5);
          statsCtx.lineTo(x + size * 0.6, y + size * 0.5);
          statsCtx.lineTo(x + size * 0.4, y + size * 0.8);
          statsCtx.fillStyle = '#ffff00';
          statsCtx.fill();
          statsCtx.strokeStyle = '#ffaa00';
          statsCtx.lineWidth = 2;
          statsCtx.stroke();
          break;

        case POWERUP_TYPES.EXPLOSION:
          // Fire icon with improved gradient
          statsCtx.beginPath();
          statsCtx.moveTo(x + size * 0.5, y + size * 0.2);
          statsCtx.quadraticCurveTo(x + size * 0.7, y + size * 0.4, x + size * 0.6, y + size * 0.7);
          statsCtx.quadraticCurveTo(x + size * 0.5, y + size * 0.6, x + size * 0.4, y + size * 0.7);
          statsCtx.quadraticCurveTo(x + size * 0.3, y + size * 0.4, x + size * 0.5, y + size * 0.2);

          const gradient = statsCtx.createLinearGradient(x + size * 0.5, y + size * 0.2, x + size * 0.5, y + size * 0.7);
          gradient.addColorStop(0, '#ffff00');
          gradient.addColorStop(0.5, '#ff6600');
          gradient.addColorStop(1, '#ff0000');

          statsCtx.fillStyle = gradient;
          statsCtx.fill();
          statsCtx.strokeStyle = '#ff9900';
          statsCtx.lineWidth = 2;
          statsCtx.stroke();
          break;

        case POWERUP_TYPES.BOMB:
          // Bomb icon with improved contrast
          statsCtx.beginPath();
          statsCtx.arc(x + size * 0.5, y + size * 0.6, size * 0.25, 0, Math.PI * 2);
          statsCtx.fillStyle = '#444444';
          statsCtx.fill();
          statsCtx.strokeStyle = '#ffffff';
          statsCtx.lineWidth = 2;
          statsCtx.stroke();

          // Fuse with improved visibility
          statsCtx.beginPath();
          statsCtx.moveTo(x + size * 0.5, y + size * 0.35);
          statsCtx.quadraticCurveTo(x + size * 0.6, y + size * 0.3, x + size * 0.65, y + size * 0.25);
          statsCtx.strokeStyle = '#ff9900';
          statsCtx.lineWidth = 2;
          statsCtx.stroke();

          // Brighter shine
          statsCtx.beginPath();
          statsCtx.arc(x + size * 0.4, y + size * 0.5, size * 0.05, 0, Math.PI * 2);
          statsCtx.fillStyle = '#ffffff';
          statsCtx.fill();
          break;
      }
    }

    // Draw each power-up and its description with improved spacing and contrast
    const iconSize = 30;
    const iconX = 20;
    let currentY = 130;
    const spacing = 25;

    // Speed power-up
    drawPowerUpIcon(POWERUP_TYPES.SPEED, iconX, currentY, iconSize);
    statsCtx.fillStyle = '#ffffff';
    statsCtx.font = '14px Arial';
    statsCtx.fillText('Speed +0.5x', iconX + iconSize + 10, currentY + iconSize / 2 + 5);
    currentY += iconSize + spacing;

    // Explosion power-up
    drawPowerUpIcon(POWERUP_TYPES.EXPLOSION, iconX, currentY, iconSize);
    statsCtx.fillStyle = '#ffffff';
    statsCtx.fillText('Explosion Size +1', iconX + iconSize + 10, currentY + iconSize / 2 + 5);
    currentY += iconSize + spacing;

    // Bomb power-up
    drawPowerUpIcon(POWERUP_TYPES.BOMB, iconX, currentY, iconSize);
    statsCtx.fillStyle = '#ffffff';
    statsCtx.fillText('Max Bombs +1', iconX + iconSize + 10, currentY + iconSize / 2 + 5);
  }

  // Menu state
  let selectedMenuItem = 0;
  const MENU_ITEMS = [
    { text: 'Single Player', enabled: true },
    { text: 'Multiplayer', enabled: false, disabledText: 'Multiplayer (Coming Soon)' }
  ];

  function drawMainMenu() {
    // Clear canvas and draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BOMBERMAN', canvas.width / 2, canvas.height / 3);

    // Draw menu options
    ctx.font = '24px Arial';
    const startY = canvas.height / 2;
    const itemSpacing = 50;

    MENU_ITEMS.forEach((item, index) => {
      const itemY = startY + (index * itemSpacing);
      const text = item.enabled ? item.text : (item.disabledText || item.text);
      const textWidth = ctx.measureText(text).width;

      // Draw selection indicator
      if (index === selectedMenuItem) {
        ctx.fillStyle = item.enabled ? '#ffff00' : '#888888';
        ctx.fillText('>', canvas.width / 2 - (textWidth / 2) - 20, itemY);

        // Draw a highlight box around the selected item
        ctx.strokeStyle = item.enabled ? '#ffff00' : '#888888';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          canvas.width / 2 - (textWidth / 2) - 10,
          itemY - 25,
          textWidth + 20,
          35
        );
      }

      // Draw menu item
      ctx.textAlign = 'center';
      if (!item.enabled) {
        // Draw disabled item
        ctx.fillStyle = '#666666';
        ctx.fillText(text, canvas.width / 2, itemY);
      } else if (index === selectedMenuItem) {
        // Draw selected enabled item
        ctx.fillStyle = '#ffff00';
        ctx.fillText(text, canvas.width / 2, itemY);
      } else {
        // Draw normal enabled item
        ctx.fillStyle = 'white';
        ctx.fillText(text, canvas.width / 2, itemY);
      }
    });

    // Draw controls hint
    ctx.fillStyle = '#888888';
    ctx.font = '16px Arial';
    ctx.fillText('Use ↑↓ to navigate, Enter to select', canvas.width / 2, canvas.height - 50);
  }

  // Modify input handling to support menu navigation
  window.addEventListener('keydown', (e) => {
    if (currentGameState === GAME_STATES.MENU) {
      switch (e.key) {
        case 'ArrowUp':
          selectedMenuItem = Math.max(0, selectedMenuItem - 1);
          break;
        case 'ArrowDown':
          selectedMenuItem = Math.min(MENU_ITEMS.length - 1, selectedMenuItem + 1);
          break;
        case 'Enter':
          if (MENU_ITEMS[selectedMenuItem].enabled) {
            if (selectedMenuItem === 0) { // Single Player
              selectedMode = GAME_MODES.SINGLE_PLAYER;
              currentGameState = GAME_STATES.PLAYING;
              resetGame();
            }
          }
          break;
      }
      return;
    }

    if (currentGameState === GAME_STATES.WIN && e.key === ' ') {
      currentGameState = GAME_STATES.MENU;
      return;
    }

    if (currentGameState !== GAME_STATES.PLAYING) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        player.moving.up = true;
        break;
      case 'ArrowDown':
      case 's':
        player.moving.down = true;
        break;
      case 'ArrowLeft':
      case 'a':
        player.moving.left = true;
        break;
      case 'ArrowRight':
      case 'd':
        player.moving.right = true;
        break;
      case ' ':
        if (player.canPlaceBomb && playerStats.currentBombs < playerStats.maxBombs) placeBomb();
        break;
    }
  });

  // Modify menu click handler to work with new menu system
  canvas.addEventListener('click', (e) => {
    if (currentGameState !== GAME_STATES.MENU) return;

    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    // Calculate which menu item was clicked
    const startY = canvas.height / 2;
    const itemSpacing = 50;
    const clickedItem = Math.floor((clickY - (startY - 20)) / itemSpacing);

    if (clickedItem >= 0 && clickedItem < MENU_ITEMS.length) {
      if (MENU_ITEMS[clickedItem].enabled) {
        if (clickedItem === 0) { // Single Player
          selectedMode = GAME_MODES.SINGLE_PLAYER;
          currentGameState = GAME_STATES.PLAYING;
          resetGame();
        }
      }
    }
  });

  // Modify mousemove handler to work with new menu system
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (currentGameState === GAME_STATES.MENU) {
      const startY = canvas.height / 2;
      const itemSpacing = 50;
      const hoveredItem = Math.floor((mouseY - (startY - 20)) / itemSpacing);

      if (hoveredItem >= 0 && hoveredItem < MENU_ITEMS.length) {
        selectedMenuItem = hoveredItem;
      }
    }
  });

  // Add back the keyup event handler
  window.addEventListener('keyup', (e) => {
    if (currentGameState !== GAME_STATES.PLAYING) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        player.moving.up = false;
        break;
      case 'ArrowDown':
      case 's':
        player.moving.down = false;
        break;
      case 'ArrowLeft':
      case 'a':
        player.moving.left = false;
        break;
      case 'ArrowRight':
      case 'd':
        player.moving.right = false;
        break;
    }
  });

  function placeBomb() {
    const gridX = Math.floor((player.x - offsetX) / TILE_SIZE);
    const gridY = Math.floor((player.y - offsetY) / TILE_SIZE);

    // Check if there's already a bomb at this position
    if (bombs.some(bomb => bomb.gridX === gridX && bomb.gridY === gridY)) {
      debugLog('Cannot place bomb: position occupied');
      return;
    }

    // Only check if we have bombs available
    if (playerStats.currentBombs >= playerStats.maxBombs) {
      debugLog('Cannot place bomb: maximum bombs reached');
      return;
    }

    playerStats.currentBombs++;

    const bomb = {
      gridX,
      gridY,
      timer: BOMB_TIMER,
      planted: performance.now(),
      explosionSize: playerStats.explosionSize
    };

    // Add this bomb to player's contact list since they're standing on it
    player.bombsInContact.add(`${bomb.gridX},${bomb.gridY}`);

    bombs.push(bomb);
    debugLog('Bomb placed at:', gridX, gridY);
  }

  function createPowerUp(x, y, type) {
    powerUps.push({
      x,
      y,
      type
    });
  }

  function checkPowerUpCollection() {
    const playerGridX = Math.floor((player.x - offsetX) / TILE_SIZE);
    const playerGridY = Math.floor((player.y - offsetY) / TILE_SIZE);

    powerUps = powerUps.filter(powerUp => {
      if (powerUp.x === playerGridX && powerUp.y === playerGridY) {
        // Apply power-up effect
        if (powerUp.type === POWERUP_TYPES.SPEED) {
          playerStats.speed = Math.min(playerStats.speed + SPEED_INCREMENT, MAX_SPEED);
        } else if (powerUp.type === POWERUP_TYPES.EXPLOSION) {
          playerStats.explosionSize = Math.min(playerStats.explosionSize + 1, MAX_EXPLOSION_SIZE);
        } else if (powerUp.type === POWERUP_TYPES.BOMB) {
          playerStats.maxBombs++;
        }
        return false;
      }
      return true;
    });
  }

  function drawPowerUps() {
    powerUps.forEach(powerUp => {
      // Only draw power-ups if in debug mode OR if the block has been destroyed
      if (DEBUG || gameGrid[powerUp.y][powerUp.x] === 0) {
        const x = powerUp.x * TILE_SIZE + offsetX;
        const y = powerUp.y * TILE_SIZE + offsetY;
        const size = TILE_SIZE;

        switch (powerUp.type) {
          case POWERUP_TYPES.SPEED:
            // Lightning bolt
            ctx.beginPath();
            ctx.moveTo(x + size * 0.6, y + size * 0.2);  // Top point
            ctx.lineTo(x + size * 0.4, y + size * 0.5);  // Middle left
            ctx.lineTo(x + size * 0.6, y + size * 0.5);  // Middle right
            ctx.lineTo(x + size * 0.4, y + size * 0.8);  // Bottom point
            ctx.fillStyle = '#ffff00';
            ctx.fill();
            ctx.strokeStyle = '#cc9900';
            ctx.lineWidth = 2;
            ctx.stroke();
            break;

          case POWERUP_TYPES.EXPLOSION:
            // Fire icon
            ctx.beginPath();
            // Outer flame
            ctx.moveTo(x + size * 0.5, y + size * 0.2);  // Top point
            ctx.quadraticCurveTo(x + size * 0.7, y + size * 0.4, x + size * 0.6, y + size * 0.7); // Right curve
            ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.6, x + size * 0.4, y + size * 0.7); // Bottom curve
            ctx.quadraticCurveTo(x + size * 0.3, y + size * 0.4, x + size * 0.5, y + size * 0.2); // Left curve

            // Middle flame
            ctx.moveTo(x + size * 0.5, y + size * 0.25);
            ctx.quadraticCurveTo(x + size * 0.65, y + size * 0.45, x + size * 0.55, y + size * 0.65);
            ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.55, x + size * 0.45, y + size * 0.65);
            ctx.quadraticCurveTo(x + size * 0.35, y + size * 0.45, x + size * 0.5, y + size * 0.25);

            // Inner flame
            ctx.moveTo(x + size * 0.5, y + size * 0.3);
            ctx.quadraticCurveTo(x + size * 0.6, y + size * 0.45, x + size * 0.5, y + size * 0.6);
            ctx.quadraticCurveTo(x + size * 0.4, y + size * 0.45, x + size * 0.5, y + size * 0.3);

            // Create gradient for more realistic fire look
            const gradient = ctx.createLinearGradient(x + size * 0.5, y + size * 0.2, x + size * 0.5, y + size * 0.7);
            gradient.addColorStop(0, '#ffff00');   // Yellow at top
            gradient.addColorStop(0.5, '#ff4400'); // Orange in middle
            gradient.addColorStop(1, '#ff0000');   // Red at bottom

            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#cc2200';
            ctx.lineWidth = 1;
            ctx.stroke();
            break;

          case POWERUP_TYPES.BOMB:
            // Bomb icon
            // Main bomb body
            ctx.beginPath();
            ctx.arc(x + size * 0.5, y + size * 0.6, size * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = '#333333';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Fuse
            ctx.beginPath();
            ctx.moveTo(x + size * 0.5, y + size * 0.35);
            ctx.quadraticCurveTo(x + size * 0.6, y + size * 0.3, x + size * 0.65, y + size * 0.25);
            ctx.strokeStyle = '#663300';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Shine
            ctx.beginPath();
            ctx.arc(x + size * 0.4, y + size * 0.5, size * 0.05, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            break;
        }
      }
    });
  }

  function isPositionInExplosionRange(x1, y1, x2, y2) {
    // Check if position (x1,y1) is within explosion range of position (x2,y2)
    if (x1 === x2 && y1 === y2) return true;

    // Check horizontal range
    if (y1 === y2) {
      const start = Math.min(x1, x2);
      const end = Math.max(x1, x2);
      // Check each position between start and end (inclusive)
      for (let x = start; x <= end; x++) {
        if (gameGrid[y1][x] > 0) {
          // If we hit a block/wall, only trigger if it's the target position
          return x === x1;
        }
      }
      // If no blocks and within range, trigger
      return Math.abs(x1 - x2) <= EXPLOSION_SIZE;
    }

    // Check vertical range
    if (x1 === x2) {
      const start = Math.min(y1, y2);
      const end = Math.max(y1, y2);
      // Check each position between start and end (inclusive)
      for (let y = start; y <= end; y++) {
        if (gameGrid[y][x1] > 0) {
          // If we hit a block/wall, only trigger if it's the target position
          return y === y1;
        }
      }
      // If no blocks and within range, trigger
      return Math.abs(y1 - y2) <= EXPLOSION_SIZE;
    }

    return false;
  }

  function createExplosion(gridX, gridY, explosionSize) {
    // Add center explosion
    const explosion = {
      gridX,
      gridY,
      timer: EXPLOSION_DURATION,
      created: performance.now()
    };
    explosions.push(explosion);

    // Decrease current bomb count when a bomb explodes
    playerStats.currentBombs = Math.max(0, playerStats.currentBombs - 1);

    // Process the center explosion tile
    processExplosionTile(gridX, gridY);

    // Check for chain explosions (only for bombs in direct contact)
    bombs.forEach(bomb => {
      if ((bomb.gridX === gridX && Math.abs(bomb.gridY - gridY) === 1) ||
        (bomb.gridY === gridY && Math.abs(bomb.gridX - gridX) === 1) ||
        (bomb.gridX === gridX && bomb.gridY === gridY)) {
        bomb.timer = 0;
        bomb.planted = 0;
      }
    });

    // Directional explosions
    const directions = [
      { dx: 1, dy: 0 },  // right
      { dx: -1, dy: 0 }, // left
      { dx: 0, dy: 1 },  // down
      { dx: 0, dy: -1 }  // up
    ];

    directions.forEach(dir => {
      for (let i = 1; i <= explosionSize; i++) {
        const checkX = gridX + (dir.dx * i);
        const checkY = gridY + (dir.dy * i);

        if (checkX < 0 || checkX >= GRID_WIDTH || checkY < 0 || checkY >= GRID_HEIGHT) {
          break;
        }

        // Add explosion and process the tile
        explosions.push({
          gridX: checkX,
          gridY: checkY,
          timer: EXPLOSION_DURATION,
          created: performance.now()
        });

        // If we hit a block, process it and stop in this direction
        if (gameGrid[checkY][checkX] > 0) {
          processExplosionTile(checkX, checkY);
          break;
        }

        // Check for bombs in direct contact
        bombs.forEach(bomb => {
          if (bomb.gridX === checkX && bomb.gridY === checkY) {
            bomb.timer = 0;
            bomb.planted = 0;
          }
        });
      }
    });
  }

  function processExplosionTile(x, y) {
    // First clear the block if it's destructible
    if (gameGrid[y][x] === 2 || gameGrid[y][x] === 3) {
      // Store if it was a special block before clearing
      const wasSpecialBlock = (gameGrid[y][x] === 3);
      // Clear the block
      gameGrid[y][x] = 0;

      // Generate power-up only for special blocks
      if (wasSpecialBlock) {
        // Remove any existing power-ups at this location
        powerUps = powerUps.filter(powerUp => !(powerUp.x === x && powerUp.y === y));

        // Create new power-up
        const powerUpType = Math.random();
        if (powerUpType < 0.3) {
          createPowerUp(x, y, POWERUP_TYPES.SPEED);
        } else if (powerUpType < 0.6) {
          createPowerUp(x, y, POWERUP_TYPES.EXPLOSION);
        } else {
          createPowerUp(x, y, POWERUP_TYPES.BOMB);
        }
      }
    }
  }

  function updateBombsAndExplosions(currentTime) {
    // Update bombs
    bombs = bombs.filter(bomb => {
      if (currentTime - bomb.planted >= bomb.timer) {
        createExplosion(bomb.gridX, bomb.gridY, bomb.explosionSize);
        return false;
      }
      return true;
    });

    // Update explosions
    explosions = explosions.filter(explosion => {
      return currentTime - explosion.created < explosion.timer;
    });
  }

  function drawBombsAndExplosions() {
    // Draw bombs
    bombs.forEach(bomb => {
      ctx.fillStyle = '#000000';
      const x = bomb.gridX * TILE_SIZE + TILE_SIZE / 2 + offsetX;
      const y = bomb.gridY * TILE_SIZE + TILE_SIZE / 2 + offsetY;
      ctx.beginPath();
      ctx.arc(x, y, TILE_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw explosions only on empty spaces
    explosions.forEach(explosion => {
      // Only draw explosion if the tile is empty (0)
      if (gameGrid[explosion.gridY][explosion.gridX] === 0) {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
        ctx.fillRect(
          explosion.gridX * TILE_SIZE + offsetX,
          explosion.gridY * TILE_SIZE + offsetY,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    });
  }

  function initializeGrid() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      gameGrid[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
          gameGrid[y][x] = 1; // Border walls (indestructible)
        } else if (x % 2 === 0 && y % 2 === 0) {
          gameGrid[y][x] = 1; // Indestructible walls
        } else if (Math.random() < 0.7 && !(x === 1 && y === 1)) {
          if (Math.random() < POWERUP_DROP_CHANCE) { // Use POWERUP_DROP_CHANCE for special blocks
            gameGrid[y][x] = 3; // Special block
          } else {
            gameGrid[y][x] = 2; // Normal destructible block
          }
        } else {
          gameGrid[y][x] = 0; // Empty space
        }
      }
    }
    // Ensure starting position is clear
    gameGrid[1][1] = 0;
    gameGrid[1][2] = 0;
    gameGrid[2][1] = 0;
  }

  function drawGrid() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tileX = x * TILE_SIZE + offsetX;
        const tileY = y * TILE_SIZE + offsetY;

        // Draw background
        ctx.fillStyle = '#88cc88';
        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

        if (gameGrid[y][x] === 1) {
          // Indestructible wall
          ctx.fillStyle = '#444444';
          ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#666666';
          ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        } else if (gameGrid[y][x] === 2 || gameGrid[y][x] === 3) {
          // Both normal and special blocks look the same unless in debug mode
          ctx.fillStyle = '#bb9977';
          ctx.fillRect(tileX + 2, tileY + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          // In debug mode, show special blocks differently
          if (DEBUG && gameGrid[y][x] === 3) {
            ctx.fillStyle = '#dd88dd';
            ctx.fillRect(tileX + 2, tileY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            // Add sparkle effect
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(tileX + TILE_SIZE / 2, tileY + TILE_SIZE / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  function drawPlayer() {
    ctx.fillStyle = '#3333ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function updatePlayer() {
    let newX = player.x;
    let newY = player.y;

    if (player.moving.up) newY -= playerStats.speed;
    if (player.moving.down) newY += playerStats.speed;
    if (player.moving.left) newX -= playerStats.speed;
    if (player.moving.right) newX += playerStats.speed;

    // Check collision with grid
    const radius = player.size / 2;
    const cornerOffset = radius * 0.7; // Reduce corner check radius by 30% for smoother movement

    // Check surrounding tiles for collision with reduced corner radius
    const checkPoints = [
      { x: newX - cornerOffset, y: newY - cornerOffset }, // Top-left
      { x: newX + cornerOffset, y: newY - cornerOffset }, // Top-right
      { x: newX - cornerOffset, y: newY + cornerOffset }, // Bottom-left
      { x: newX + cornerOffset, y: newY + cornerOffset }  // Bottom-right
    ];

    let canMove = true;

    // Check collisions with walls and blocks
    for (const point of checkPoints) {
      const checkX = Math.floor((point.x - offsetX) / TILE_SIZE);
      const checkY = Math.floor((point.y - offsetY) / TILE_SIZE);
      if (gameGrid[checkY]?.[checkX] > 0) {
        debugLog('Wall collision at:', checkX, checkY);
        canMove = false;
        break;
      }
    }

    // Check collisions with bombs
    if (canMove) {
      const newBombContacts = new Set();

      for (const bomb of bombs) {
        // Check if any corner of the player overlaps with the bomb tile
        const bombPoints = checkPoints.some(point => {
          const pointGridX = Math.floor((point.x - offsetX) / TILE_SIZE);
          const pointGridY = Math.floor((point.y - offsetY) / TILE_SIZE);
          return pointGridX === bomb.gridX && pointGridY === bomb.gridY;
        });

        if (bombPoints) {
          const bombKey = `${bomb.gridX},${bomb.gridY}`;
          newBombContacts.add(bombKey);

          // If we're not already in contact with this bomb, block movement
          if (!player.bombsInContact.has(bombKey)) {
            debugLog('New bomb collision at:', bomb.gridX, bomb.gridY);
            canMove = false;
            break;
          }
        }
      }

      // Update the list of bombs we're in contact with
      if (canMove) {
        player.bombsInContact = newBombContacts;
      }
    }

    if (canMove) {
      debugLog('Player moved to:', Math.floor((newX - offsetX) / TILE_SIZE), Math.floor((newY - offsetY) / TILE_SIZE));
      player.x = newX;
      player.y = newY;
      checkPowerUpCollection();
    }
  }

  function drawGameOver() {
    const timeLeft = Math.ceil((GAME_OVER_DURATION - (performance.now() - gameOverTime)) / 1000);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);

    ctx.font = '24px Arial';
    ctx.fillText(`Returning to menu in ${timeLeft}...`, canvas.width / 2, canvas.height / 2 + 40);
  }

  function createEnemy(x, y) {
    return {
      x: x * TILE_SIZE + TILE_SIZE / 2,
      y: y * TILE_SIZE + TILE_SIZE / 2,
      size: ENEMY_SIZE,
      direction: {
        dx: 0,
        dy: 0
      },
      lastDirectionChange: 0
    };
  }

  function updateEnemies(currentTime) {
    enemies = enemies.filter(enemy => {
      // Check if enemy is in explosion
      const enemyGridX = Math.floor((enemy.x - offsetX) / TILE_SIZE);
      const enemyGridY = Math.floor((enemy.y - offsetY) / TILE_SIZE);

      for (const explosion of explosions) {
        if (explosion.gridX === enemyGridX && explosion.gridY === enemyGridY) {
          return false; // Enemy dies
        }
      }

      // Change direction randomly but intelligently
      if (currentTime - enemy.lastDirectionChange > ENEMY_MOVE_INTERVAL) {
        const directions = [
          { dx: 0, dy: -1 },  // up
          { dx: 0, dy: 1 },   // down
          { dx: -1, dy: 0 },  // left
          { dx: 1, dy: 0 },   // right
          { dx: 0, dy: 0 }    // stay still
        ];

        // Check which directions are available (not blocked by walls or bombs)
        const availableDirections = directions.filter(dir => {
          const checkX = Math.floor((enemy.x - offsetX) / TILE_SIZE) + dir.dx;
          const checkY = Math.floor((enemy.y - offsetY) / TILE_SIZE) + dir.dy;

          // Check if the direction leads to a wall or outside the grid
          if (checkX < 0 || checkX >= GRID_WIDTH || checkY < 0 || checkY >= GRID_HEIGHT) {
            return false;
          }

          // Check if there's a bomb in the way
          if (bombs.some(bomb => bomb.gridX === checkX && bomb.gridY === checkY)) {
            return false;
          }

          return gameGrid[checkY][checkX] === 0;
        });

        // If there are available directions, choose one randomly
        // If no directions are available, stay still
        const randomDir = availableDirections.length > 0
          ? availableDirections[Math.floor(Math.random() * availableDirections.length)]
          : { dx: 0, dy: 0 };

        enemy.direction = randomDir;
        enemy.lastDirectionChange = currentTime;
      }

      // Calculate new position
      let newX = enemy.x + enemy.direction.dx * ENEMY_SPEED;
      let newY = enemy.y + enemy.direction.dy * ENEMY_SPEED;

      // Check collision with walls and bombs
      const radius = enemy.size / 2;
      const checkPoints = [
        { x: newX - radius, y: newY - radius }, // Top-left
        { x: newX + radius, y: newY - radius }, // Top-right
        { x: newX - radius, y: newY + radius }, // Bottom-left
        { x: newX + radius, y: newY + radius }  // Bottom-right
      ];

      let canMove = true;

      // Check wall collisions
      for (const point of checkPoints) {
        const checkX = Math.floor((point.x - offsetX) / TILE_SIZE);
        const checkY = Math.floor((point.y - offsetY) / TILE_SIZE);
        if (gameGrid[checkY]?.[checkX] > 0) {
          canMove = false;
          break;
        }
      }

      // Check bomb collisions
      if (canMove) {
        const enemyNewGridX = Math.floor((newX - offsetX) / TILE_SIZE);
        const enemyNewGridY = Math.floor((newY - offsetY) / TILE_SIZE);
        if (bombs.some(bomb => bomb.gridX === enemyNewGridX && bomb.gridY === enemyNewGridY)) {
          canMove = false;
        }
      }

      if (canMove) {
        enemy.x = newX;
        enemy.y = newY;
      } else {
        // If we hit a wall or bomb, force direction change next update
        enemy.lastDirectionChange = 0;
      }

      return true; // Keep enemy alive
    });
  }

  function drawEnemies() {
    enemies.forEach(enemy => {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Add eyes to make it look more enemy-like
      ctx.fillStyle = '#ffffff';
      const eyeRadius = enemy.size / 8;
      ctx.beginPath();
      ctx.arc(enemy.x - eyeRadius * 2, enemy.y - eyeRadius, eyeRadius, 0, Math.PI * 2);
      ctx.arc(enemy.x + eyeRadius * 2, enemy.y - eyeRadius, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  let frameCount = 0;
  let lastTime = performance.now();

  // Initialize the game grid
  debugLog('Starting game with grid size:', GRID_WIDTH, 'x', GRID_HEIGHT);
  initializeGrid();

  // Game states
  const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    WIN: 'win'
  };

  let currentGameState = GAME_STATES.MENU;
  let selectedMode = null;
  const GAME_MODES = {
    SINGLE_PLAYER: 'single_player',
    MULTIPLAYER: 'multiplayer'
  };

  function drawWinScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffff00';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('All enemies defeated!', canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('Press SPACE to play again', canvas.width / 2, canvas.height / 2 + 80);
  }

  // Modify gameLoop to handle different states
  function gameLoop(currentTime) {
    // Calculate FPS
    const deltaTime = currentTime - lastTime;
    const fps = 1000 / deltaTime;

    if (frameCount % 60 === 0) {
      debugLog('FPS:', Math.round(fps));
      debugLog('Frame:', frameCount);
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (currentGameState) {
      case GAME_STATES.MENU:
        drawMainMenu();
        break;

      case GAME_STATES.PLAYING:
        document.body.appendChild(statsCanvas);

        // Update game state
        updatePlayer();
        updateBombsAndExplosions(currentTime);
        updateEnemies(currentTime);
        checkPlayerDeath();

        // Check if player died
        if (isGameOver) {
          currentGameState = GAME_STATES.GAME_OVER;
          break;
        }

        // Check win condition in single player mode
        if (selectedMode === GAME_MODES.SINGLE_PLAYER && enemies.length === 0) {
          currentGameState = GAME_STATES.WIN;
          break;
        }

        // Draw the game
        drawGrid();
        drawPowerUps();
        drawBombsAndExplosions();
        drawEnemies();
        drawPlayer();
        drawStats();
        break;

      case GAME_STATES.GAME_OVER:
        // Draw the game state
        drawGrid();
        drawPowerUps();
        drawBombsAndExplosions();
        drawEnemies();
        drawPlayer();
        drawStats();
        drawGameOver();

        // Check if game over timer is complete
        if (currentTime - gameOverTime >= GAME_OVER_DURATION) {
          debugLog('Game over timer complete, returning to menu');
          currentGameState = GAME_STATES.MENU;
        }
        break;

      case GAME_STATES.WIN:
        // Draw the game state
        drawGrid();
        drawPowerUps();
        drawBombsAndExplosions();
        drawPlayer();
        drawStats();
        drawWinScreen();
        break;
    }

    // Update timing variables
    lastTime = currentTime;
    frameCount++;

    // Request the next frame
    requestAnimationFrame(gameLoop);
  }

  // Handle window resizing
  window.addEventListener('resize', () => {
    updateCanvasSize();
  });

  console.log('Starting game loop...');
  // Start with the menu instead of immediately starting the game
  gameLoop(performance.now());
};