var titlePage = true;
var playAgain;
var isAlive;
var menu;

var bestTime = 0;
var timer;
var startTime;
var difficulty = 10;
var life;

var maxX = window.innerWidth;
var minX = 0;
var maxY = window.innerHeight;
var minY = 0;

var backgroundContext;
var actionContext;
var menuContext;

var ship;
var fireballs = [];
var asteroids = [];
var explosions = [];

var circle = Math.PI * 2;
var asteroidRotation = 0.02;
var currentKeyState;

function Vector(x, y) {
	this.x = x;
	this.y = y;
}

function Drawable(texture, position, scale) {
	this.texture = texture;
	this.position = position;
	this.width = texture.width;
	this.height = texture.height;

	if (scale) {
		this.scaleWidth = this.width * scale;
		this.scaleHeight = this.height * scale;
	}
}

Drawable.prototype.draw = function (context) {
	if (!this.scaleWidth) {
		context.drawImage(
			this.texture,
			Math.round(this.position.x - this.width / 2),
			Math.round(this.position.y - this.height / 2)
		);
	} else {
		context.drawImage(
			this.texture,
			0,
			0,
			this.width,
			this.height,
			Math.round(this.position.x - this.scaleWidth / 2),
			Math.round(this.position.y - this.scaleHeight / 2),
			this.scaleWidth,
			this.scaleHeight
		);
	}
};

function Moveable(texture, position, direction, angle) {
	Drawable.call(this, texture, position);
	this.direction = direction;
	this.angle = angle;
}

Moveable.prototype = Object.create(Drawable.prototype);

Moveable.prototype.draw = function (context) {
	context.translate(this.position.x, this.position.y);
	context.rotate(this.angle);
	context.drawImage(this.texture, -Math.round(this.width / 2), -Math.round(this.height / 2));
	context.rotate(-this.angle);
	context.translate(-this.position.x, -this.position.y);
};

Moveable.prototype.wrapBoundry = function () {
	var x = this.position.x;
	var y = this.position.y;
	var width = this.width / 2;
	var height = this.height / 2;

	if (x > maxX + width) {
		x = minX - width;
	} else if (x < minX - width) {
		x = maxX + width;
	} else if (y > maxY + height) {
		y = minY - height;
	} else if (y < minY - height) {
		y = maxY + height;
	}

	this.position = new Vector(x, y);
};

Moveable.prototype.intersects = function (drawable) {
	var leftX = this.position.x - this.width / 2;
	var topY = this.position.y - this.height / 2;
	var rightX = leftX + this.width;
	var bottomY = topY + this.height;

	var dLeftX = drawable.position.x - drawable.width / 2;
	var dTopY = drawable.position.y - drawable.height / 2;
	var dRightX = dLeftX + drawable.width;
	var dBottomY = dTopY + drawable.height;

	return rightX > dLeftX && leftX < dRightX && bottomY > dTopY && topY < dBottomY;
};

function Ship(position, angle) {
	Moveable.call(this, imageRepo.ship, position, new Vector(Math.cos(angle), Math.sin(angle)), angle);
	this.width = 69;
	this.speed = new Vector(0, 0);
	this.fireRate = 10;
	this.fireCounter = 0;
}

Ship.prototype = Object.create(Moveable.prototype);

Ship.prototype.draw = function (context) {
	context.translate(this.position.x, this.position.y);
	context.rotate(this.angle);
	var offset = KEY_STATUS.up && life > 0 ? this.width : 0;
	context.drawImage(
		this.texture,
		offset,
		0,
		this.width,
		this.height,
		-Math.round(this.width / 2),
		-Math.round(this.height / 2),
		this.width,
		this.height
	);
	context.rotate(-this.angle);
	context.translate(-this.position.x, -this.position.y);
};

Ship.prototype.move = function () {
	if (!isAlive) return;
	this.fireCounter++;
	this.position.x += this.speed.x;
	this.position.y += this.speed.y;
	this.wrapBoundry();

	for (var i = 0; i < asteroids.length; i++) {
		if (this.intersects(asteroids[i])) {
			explosions.push(new Explosion(new Vector((this.position.x + asteroids[i].position.x) / 2,
				(this.position.y + asteroids[i].position.y) / 2), true));
			soundRepo.play('bigExplosion');
			asteroids.splice(i, 1);
			isAlive = false;
			life--;
			var currentTime = new Date();
			if (currentTime - startTime > bestTime) {
				bestTime = currentTime - startTime;
				localStorage.setItem('best_time', bestTime);
			}
			break;
		}
	}
};

Ship.prototype.control = function () {
	if (!isAlive) return;
	if (KEY_STATUS.right)
		this.angle += .08;
	else if (KEY_STATUS.left)
		this.angle -= .08;

	this.angle %= circle;
	this.direction = new Vector(Math.cos(this.angle), Math.sin(this.angle));

	if (KEY_STATUS.up) {
		if (this.direction.x > 0 && this.speed.x < 10 ||
			this.direction.x < 0 && this.speed.x > -10)
			this.speed.x += this.direction.x * .1;
		if (this.direction.y > 0 && this.speed.y < 10 ||
			this.direction.y < 0 && this.speed.y > -10)
			this.speed.y += this.direction.y * .1;
	}
	else if (KEY_STATUS.down) {
		if (this.speed.x > .2 || this.speed.x < -.2 ||
			this.speed.y > .2 || this.speed.y < -.2) {
			this.speed.x *= .9;
			this.speed.y *= .9;
		}
		else
			this.speed = new Vector(0, 0);
	}
	if (KEY_STATUS.space && this.fireCounter > this.fireRate) {
		var position = new Vector(this.position.x + this.direction.x * 30, this.position.y + this.direction.y * 30);
		fireballs.push(new Moveable(imageRepo.fireball, position, this.direction, this.angle));
		soundRepo.play('fire');
		this.fireCounter = 0;
	}
};

function Asteroid(position, direction, angle, rotation, isBig) {
	Moveable.call(this, imageRepo[isBig ? 'asteroidBig' : 'asteroidSmall'], position, direction, angle);
	this.rotation = rotation;
}

Asteroid.prototype = Object.create(Moveable.prototype);

function Explosion(position, isBig) {
	Drawable.call(this, imageRepo[isBig ? 'explosionBig' : 'explosionSmall'], position);
	this.width = isBig ? 100 : 64;
	this.life = 0;
}

Explosion.prototype = Object.create(Drawable.prototype);

Explosion.prototype.draw = function (context) {
	var spriteX = this.width * this.life;

	context.drawImage(
		this.texture,
		spriteX,
		0,
		this.width,
		this.height,
		this.position.x - this.width / 2,
		this.position.y - this.height / 2,
		this.width,
		this.height
	);

	this.life++;
};

var imageRepo = (function () {
	var numImages = 10;
	var numLoaded = 0;

	function imageLoaded() {
		numLoaded++;
		if (numLoaded === numImages) {
			window.init();
		}
	}

	return {
		background: loadImage('img/background.png'),
		title: loadImage('img/title.png'),
		controls: loadImage('img/controls.png'),
		gameOver: loadImage('img/gameover.png'),
		ship: loadImage('img/ships.png'),
		asteroidBig: loadImage('img/asteroidbig.png'),
		asteroidSmall: loadImage('img/asteroidsmall.png'),
		fireball: loadImage('img/fireball.png'),
		explosionSmall: loadImage('img/explosionsmall.png'),
		explosionBig: loadImage('img/explosionbig.png'),
	};

	function loadImage(src) {
		var image = new Image();
		image.src = src;
		image.onload = imageLoaded;
		return image;
	}
})();

var soundRepo = (function () {
	var size = 10;

	var firePool = createSoundPool('audio/fire.mp3');
	var explosionPool = createSoundPool('audio/explosion.mp3');
	var bigExplosionPool = createSoundPool('audio/explosionbig.mp3');

	function createSoundPool(src) {
		var pool = { current: 0, sounds: [] };
		for (var i = 0; i < size; i++) {
			var audio = new Audio(src);
			audio.load();
			pool.sounds.push(audio);
		}
		return pool;
	}

	function play(sound) {
		var soundPool = (sound === 'fire') ? firePool : (sound === 'explosion') ? explosionPool : bigExplosionPool;

		var currentSound = soundPool.sounds[soundPool.current];
		if (currentSound.currentTime === 0 || currentSound.ended) {
			currentSound.play();
		}
		soundPool.current = (soundPool.current + 1) % size;
	}

	return {
		play: play
	};
})();

function init() {
	// Set up canvas contexts
	setupCanvas('background', 'backgroundContext');
	setupCanvas('action', 'actionContext');
	setupCanvas('menu', 'menuContext');

	// Draw background image
	backgroundContext.drawImage(imageRepo.background, 0, 0);

	// Initialize ship
	ship = new Ship(new Vector(maxX / 2, maxY / 2), 0);

	// Display title and controls in the menu
	displayMenu();

	// Start a new game and begin animation
	newGame();
	animate();
}

function setupCanvas(canvasId, contextName) {
	window[contextName] = document.getElementById(canvasId).getContext('2d');
	window[contextName].canvas.width = maxX;
	window[contextName].canvas.height = maxY;
}

function displayMenu() {
	menuContext.clearRect(0, 0, maxX, maxY);
	new Drawable(imageRepo.title, new Vector(maxX / 2, maxY / 3)).draw(menuContext);
	drawString('Press Enter to start game', menuContext, 25, new Vector(maxX / 2, maxY / 1.65));
	new Drawable(imageRepo.controls, new Vector(maxX / 2, maxY - 70)).draw(menuContext);
}

function animate() {
	requestAnimFrame(animate);

	if (titlePage) {
		handleTitlePage();
	} else {
		handleGamePage();
	}
}

function handleTitlePage() {
	if (KEY_STATUS.enter) {
		menuContext.clearRect(0, 0, maxX, maxY);
		titlePage = false;
		startTime = new Date();
	}
}

function handleGamePage() {
	actionContext.clearRect(0, 0, maxX, maxY);

	if (isAlive) {
		ship.draw(actionContext);
	}
	ship.move();
	drawFireballs();
	drawAsteroids();
	drawExplosions();

	if (life < 1) {
		handleGameOver();
	} else {
		var currentTime = new Date();
		timer = formatTime(currentTime - startTime);
		ship.control();
	}
	const best_time = localStorage.getItem('best_time');
	drawString('Best time: ' + formatTime(best_time), actionContext, 21, new Vector(1800, 25));
	drawString('Time: ' + timer, actionContext, 21, new Vector(1821, 52));
}

function handleGameOver() {
	gameOverTexture = imageRepo.gameOver;
	menuContext.clearRect(0, 0, maxX, maxY);
	new Drawable(gameOverTexture, new Vector(maxX / 2, maxY / 3)).draw(menuContext);
	drawString("Press Enter to play again", menuContext, 25, new Vector(maxX / 2, maxY / 1.5));

	if (KEY_STATUS.enter) {
		menuContext.clearRect(0, 0, maxX, maxY);
		newGame();
	}
}

function formatTime(milliseconds) {
	var seconds = Math.floor(milliseconds / 1000);
	var minutes = Math.floor(seconds / 60);
	var hours = Math.floor(minutes / 60);

	seconds %= 60;
	minutes %= 60;

	return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

function pad(num) {
	return (num < 10 ? '0' : '') + num;
}

var requestAnimFrame = (
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function (callback, element) {
		window.setTimeout(callback, 1000 / 60);
	}
);

function newGame() {
	startTime = new Date();
	life = 1;
	menu = false;
	isAlive = true;
	playAgain = true;
	reset();
}

function reset() {
	fireballs = [];
	asteroids = [];

	ship.position = new Vector(maxX / 2, maxY / 2);
	ship.speed = new Vector(0, 0);
	ship.angle = 0;

	for (var i = 0; i < difficulty; i++) {
		var posX, posY;

		if (Math.random() < 0.5) { // Top
			posX = Math.random() * (maxX + imageRepo.asteroidBig.width) - imageRepo.asteroidBig.width / 2;
			posY = minY - imageRepo.asteroidBig.height / 2;
		} else { // Left
			posX = minX - imageRepo.asteroidBig.width / 2;
			posY = Math.random() * (maxY + imageRepo.asteroidBig.height) - imageRepo.asteroidBig.height / 2;
		}

		randomAsteroid(posX, posY, true);
	}
}

function randomAsteroid(posX, posY, isBig) {
	var asteroidAngle = Math.random() * circle;

	var dirX = Math.cos(asteroidAngle);
	var dirY = Math.sin(asteroidAngle);

	asteroids.push(new Asteroid(new Vector(posX, posY), new Vector(dirX, dirY), 0, asteroidRotation, isBig));
	asteroidRotation *= -1;
}

function drawFireballs() {
	const fireballWidth = imageRepo.fireball.width;
	const fireballHeight = imageRepo.fireball.height;
	const fireMaxX = maxX + fireballWidth / 2;
	const fireMinX = minX - fireballWidth / 2;
	const fireMaxY = maxY + fireballHeight / 2;
	const fireMinY = minY - fireballHeight / 2;

	for (let i = fireballs.length - 1; i >= 0; i--) {
		const fireball = fireballs[i];

		fireball.position.x += fireball.direction.x * 4;
		fireball.position.y += fireball.direction.y * 4;

		if (
			fireball.position.x < fireMinX ||
			fireball.position.x > fireMaxX ||
			fireball.position.y < fireMinY ||
			fireball.position.y > fireMaxY
		) {
			fireballs.splice(i, 1);
		} else {
			fireball.draw(actionContext);

			for (let x = asteroids.length - 1; x >= 0; x--) {
				if (fireball.intersects(asteroids[x])) {
					fireballs.splice(i, 1);

					if (asteroids[x].texture === imageRepo.asteroidBig) {
						explosions.push(new Explosion(asteroids[x].position, true));
						soundRepo.play('bigExplosion');
						for (let a = 0; a < 4; a++) {
							randomAsteroid(asteroids[x].position.x, asteroids[x].position.y, false);
						}
					} else {
						explosions.push(new Explosion(asteroids[x].position, false));
						soundRepo.play('explosion');
					}

					asteroids.splice(x, 1);
					break;
				}
			}
		}
	}
}


function drawAsteroids() {
	for (var i = 0; i < asteroids.length; i++) {
		asteroids[i].position.x += asteroids[i].direction.x;
		asteroids[i].position.y += asteroids[i].direction.y;
		asteroids[i].angle += asteroids[i].rotation;
		asteroids[i].angle %= circle;
		asteroids[i].wrapBoundry();

		asteroids[i].draw(actionContext);
	}
}

function drawExplosions() {
	for (let i = explosions.length - 1; i >= 0; i--) {
		const explosion = explosions[i];
		explosion.draw(actionContext);

		if (explosion.life === 16) {
			explosions.splice(i, 1);
		}
	}
}

function drawString(string, context, size, vector, color = 'white') {
	context.fillStyle = color;
	context.font = size + 'px arial';
	const metrics = context.measureText(string);
	context.fillText(string, Math.round(vector.x - metrics.width / 2), Math.round(vector.y));
  }

  const KEY_CODES = {
	'Enter': 'enter',
	'Escape': 'escape',
	' ': 'space',
	'ArrowLeft': 'left',
	'ArrowUp': 'up',
	'ArrowRight': 'right',
	'ArrowDown': 'down',
  };
  
  const KEY_STATUS = {};
  
  for (const code in KEY_CODES) {
	KEY_STATUS[KEY_CODES[code]] = false;
  }
  
  document.addEventListener('keydown', function (e) {
	const key = e.key;
  
	if (KEY_CODES[key]) {
	  e.preventDefault();
	  KEY_STATUS[KEY_CODES[key]] = true;
	  currentKeyState = KEY_CODES[key];
	}
  });
  
  document.addEventListener('keyup', function (e) {
	const key = e.key;
  
	if (KEY_CODES[key]) {
	  e.preventDefault();
	  KEY_STATUS[KEY_CODES[key]] = false;
	  currentKeyState = null;
	}
  });
