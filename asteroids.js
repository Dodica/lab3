var titlePage = true;
var playAgain;
var isAlive;
var intermission;
var newLevel;
var menu;
var options;
var musicOn = false;
var soundEffectsOn = false;

var maxLevel = 10;
var startLives = 5;
var menuSelection = 0;
// var optionsSelection;
var level;
var waitTime;
var difficulty;
var lives;

var maxX = 1000;
var minX = 0;
var maxY = 550;
var minY = 0;

var backgroundContext;
var actionContext;
var menuContext;

/* 
Song[] musicList = new Song[3];
int currentSong = 0;
SoundEffect fire;
SoundEffect thrust;
SoundEffectInstance thrustInstance;
SoundEffect boom;
SoundEffect boom2;
 */

var ship;
var fireballs  = [];
var asteroids  = [];
var explosions = [];

var circle = Math.PI * 2;
var asteroidRotation = 0.02;
var currentKeyState;
var lastKeyState;

function Vector(x, y) {
	this.x = x;
	this.y = y;
}

function Drawable(texture, position, scale) {
	this.texture  = texture;
	this.position = position;
	this.width  = texture.width;
	this.height = texture.height;
	if (scale) {
		this.scaleWidth  = this.width * scale;
		this.scaleHeight = this.height * scale;
	}
}
Drawable.prototype.draw = function(context) {
	if (!this.scaleWidth)
		context.drawImage(this.texture, Math.round(this.position.x - this.width / 2), Math.round(this.position.y - this.height / 2));
	else
		context.drawImage(this.texture, 0, 0, this.width, this.height,
						  Math.round(this.position.x - this.scaleWidth / 2), Math.round(this.position.y - this.scaleHeight / 2),
						  this.scaleWidth, this.scaleHeight);
}

function Moveable(texture, position, direction, angle) {
	Drawable.call(this, texture, position);
	this.direction = direction;
	this.angle = angle;
}
Moveable.prototype.draw = function(context) {
	context.translate(this.position.x, this.position.y);
	context.rotate(this.angle);
	context.drawImage(this.texture, -Math.round(this.width / 2), -Math.round(this.height / 2));
	context.rotate(-this.angle);
	context.translate(-this.position.x, -this.position.y);
}
Moveable.prototype.wrapBoundry = function() {
	var x = this.position.x;
	var y = this.position.y;
	var width  = this.width / 2;
	var height = this.height / 2;

	if (x > maxX + width)
		x = minX - width;
	else if (x < minX - width)
		x = maxX + width;
	else if (y > maxY + height)
		y = minY - height;
	else if (y < minY - height)
		y = maxY + height;

	this.position = new Vector(x, y);
}
Moveable.prototype.intersects = function(drawable) {
	var leftX   = this.position.x - this.width / 2;
	var topY    = this.position.y - this.height / 2;
	var rightX  = leftX + this.width;
	var bottomY = topY  + this.height;
	
	var dLeftX   = drawable.position.x - drawable.width / 2;
	var dTopY    = drawable.position.y - drawable.height / 2;
	var dRightX  = dLeftX + drawable.width;
	var dBottomY = dTopY  + drawable.height;
	
	return rightX > dLeftX && leftX < dRightX && bottomY > dTopY && topY < dBottomY;
}

function Ship(position, angle) {
	Moveable.call(this, imageRepo.ship, position, new Vector(Math.cos(angle), Math.sin(angle)), angle);
	this.width = 69;
	this.speed = new Vector(0, 0);
	this.fireRate = 10;
	this.fireCounter = 0;
}
Ship.prototype = Object.create(Moveable.prototype);

Ship.prototype.draw = function(context) {
	context.translate(this.position.x, this.position.y);
	context.rotate(this.angle);
	var offset = KEY_STATUS.up && lives > 0 && level <= maxLevel && !intermission ? this.width : 0;
	context.drawImage(this.texture, offset, 0, this.width, this.height, 
					  -Math.round(this.width / 2), -Math.round(this.height / 2), this.width, this.height);
	context.rotate(-this.angle);
	context.translate(-this.position.x, -this.position.y);
}
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
			lives--;
			break;
		}
	}
}
Ship.prototype.control = function() {
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
		var position = new Vector(this.position.x + this.direction.x * 30, this.position.y + this.direction.y * 30)
		fireballs.push(new Moveable(imageRepo.fireball, position, this.direction, this.angle));
		soundRepo.play('fire');
		this.fireCounter = 0;
	}
}

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
Explosion.prototype.draw = function(context) {
	context.drawImage(this.texture, this.width * this.life, 0, this.width, this.height, 
					  this.position.x - this.width / 2, this.position.y - this.height / 2, this.width, this.height);
	this.life++;
}

var imageRepo = new function() {
	this.background 	= new Image();
	this.title 			= new Image();
	this.controls 		= new Image();
	this.lives 			= new Image();
	this.gameOver 		= new Image();
	this.youWin			= new Image();
	this.ship 			= new Image();
	this.ready 			= new Image();
	this.asteroidBig 	= new Image();
	this.asteroidSmall 	= new Image();
	this.fireball 		= new Image();
	this.explosionSmall	= new Image();
	this.explosionBig	= new Image();
	
	this.background.src		= 'img/background.jpg';
	this.title.src			= 'img/title.png';
	this.controls.src		= 'img/controls.png';
	this.lives.src			= 'img/lives.png';
	this.gameOver.src		= 'img/gameover.png';
	this.youWin.src			= 'img/youwin.png';
	this.ship.src		    = 'img/ship.png';
	this.ready.src		    = 'img/ready.png';
	this.asteroidBig.src    = 'img/asteroidbig.png';
	this.asteroidSmall.src	= 'img/asteroidsmall.png';
	this.fireball.src		= 'img/fireball.png';
	this.explosionSmall.src	= 'img/explosionsmall.png';
	this.explosionBig.src	= 'img/explosionbig.png';
	
	this.background.onload 	   = imageLoaded;
	this.title.onload 		   = imageLoaded;
	this.controls.onload 	   = imageLoaded;
	this.lives.onload 		   = imageLoaded;
	this.gameOver.onload 	   = imageLoaded;
	this.youWin.onload 		   = imageLoaded;
	this.ship.onload 		   = imageLoaded;
	this.ready.onload 		   = imageLoaded;
	this.asteroidBig.onload    = imageLoaded;
	this.asteroidSmall.onload  = imageLoaded;
	this.fireball.onload 	   = imageLoaded;
	this.explosionSmall.onload = imageLoaded;
	this.explosionBig.onload   = imageLoaded;
	
	for (var i = 1; i < 11; i++) {
		this['level'+i] 	   = new Image();
		this['level'+i].src    = 'img/level'+i+'.png';
		this['level'+i].onload = imageLoaded;
	}
	
	var numImages = 23;
	var numLoaded = 0;
	function imageLoaded() {
		numLoaded++;
		if (numLoaded === numImages)
			window.init();
	}	
}

var soundRepo = new function() {
	var firePool = {current:0, sounds: []};
	var explosionPool = {current:0, sounds: []};
	var bigExplosionPool = {current:0, sounds: []};
	var size = 10;
	
	for (var i = 0; i < size; i++) {
		var fire = new Audio('audio/fire.mp3');
		fire.load();
		firePool.sounds.push(fire);
		
		var explosion = new Audio('audio/explosion.mp3');
		explosion.load();
		explosionPool.sounds.push(explosion);
		
		var bigExplosion = new Audio('audio/explosionbig.mp3');
		bigExplosion.load();
		bigExplosionPool.sounds.push(bigExplosion);
	}
	
	this.play = function(sound) {
		var soundPool = sound === 'fire' ? firePool : sound === 'explosion' ? explosionPool : bigExplosionPool;
		
		if (soundPool.sounds[soundPool.current].currentTime == 0 || soundPool.sounds[soundPool.current].ended)
			soundPool.sounds[soundPool.current].play();
		soundPool.current = (soundPool.current + 1) % size;
	}
}

function init() {
	backgroundContext = document.getElementById('background').getContext('2d');
	backgroundContext.drawImage(imageRepo.background, 0, 0);
	actionContext = document.getElementById('action').getContext('2d');
	menuContext = document.getElementById('menu').getContext('2d');
	
    ship = new Ship(new Vector(maxX / 2, maxY / 2), 0);
	
	// Draw Title Page
	menuContext.clearRect(0, 0, maxX, maxY);
	new Drawable(imageRepo.title, new Vector(maxX / 2, maxY / 3)).draw(menuContext);
	drawString('Press Enter to start game', menuContext, 25, new Vector(maxX / 2, maxY / 1.65));
	new Drawable(imageRepo.controls, new Vector(maxX / 2, maxY - 70)).draw(menuContext);
	newGame();
	animate();
}

function animate() {
	requestAnimFrame(animate);
		
	if (titlePage) {
		if (KEY_STATUS.enter) {
			menuContext.clearRect(0, 0, maxX, maxY);
			titlePage = false;
		}
	}
	else {
		actionContext.clearRect(0, 0, maxX, maxY);
		if (menu) {
			menuContext.clearRect(0, 0, maxX, maxY);
			new Drawable(imageRepo.title, new Vector(maxX / 2, maxY / 3)).draw(menuContext);
			new Drawable(imageRepo['level'+level], new Vector(maxX - imageRepo['level'+level].width / 3.65, 25), 0.5).draw(menuContext);
			drawString("Continue", menuContext, 25, new Vector(maxX / 2, maxY / 1.7), menuSelection === 0 ? 'white' : 'grey');
			drawString("New Game", menuContext, 25, new Vector(maxX / 2, maxY / 1.5), menuSelection === 1 ? 'white' : 'grey');
			if (KEY_STATUS.down)
				menuSelection = 1;
			else if (KEY_STATUS.up)
				menuSelection = 0;
			else if (KEY_STATUS.enter) {
				menuContext.clearRect(0, 0, maxX, maxY);
				if (menuSelection === 0) {
					menu = false;
					menuSelection = 0;
				}
				else {					
					newGame();
					menuSelection = 0;
				}
			}
		}
		else {
			if (isAlive)
				ship.draw(actionContext);
			if (intermission) {
				waitTime++;
				if (waitTime > 150) {
					intermission = false;
					waitTime = 0;
				}
				if (newLevel)
					new Drawable(imageRepo['level'+level], new Vector(maxX / 2, maxY / 2)).draw(actionContext);
				else
					new Drawable(imageRepo.ready, new Vector(maxX / 2, maxY / 2)).draw(actionContext);
			}
			else {
				ship.move();
				drawFireballs();
				drawAsteroids();
				drawExplosions();
                if ((lives < 1 || level > maxLevel)) {
					if (lives < 1)
						gameOverTexture = imageRepo.gameOver;
					else
						gameOverTexture = imageRepo.youWin;

					menuContext.clearRect(0, 0, maxX, maxY);
					new Drawable(gameOverTexture, new Vector(maxX / 2, maxY / 3)).draw(menuContext);
					drawString("Press Enter to play again", menuContext, 25, new Vector(maxX / 2, maxY / 1.5));
					
					if (KEY_STATUS.enter && lastKeyState !== 'enter') {
						menuContext.clearRect(0, 0, maxX, maxY);
						newGame();
					}
				}
				else {
					ship.control();
					if ((asteroids.length < 1 && isAlive) || !isAlive) {
						if (isAlive && waitTime === 0)
							level++;

						waitTime++;
						if (waitTime > 150) {
							if (isAlive) {
								difficulty += 4;
								newLevel = true;
								levelTexture = imageRepo['level'+level];
							}
							else {
								asteroids = [];
								isAlive = true;
								newLevel = false;
							}
							intermission = true;
							reset();
							waitTime = 0;
						}
					}
				}
			}
		}
		if (KEY_STATUS.escape && lastKeyState !== 'escape') {
			if (menu) {
				menu = false;
				menuSelection = 0;
				menuContext.clearRect(0, 0, maxX, maxY);
			}
			else
				menu = true;
		}
		drawString('Lives:', actionContext, 21, new Vector(37, 25));
		var lifePos = 86;
		for (var i = 0; i < lives; i++) {
			new Drawable(imageRepo.lives, new Vector(lifePos, 19)).draw(actionContext);
			lifePos += 40;
		}
	}
	lastKeyState = currentKeyState;
}

var requestAnimFrame = window.requestAnimationFrame       ||
					   window.webkitRequestAnimationFrame ||
					   window.mozRequestAnimationFrame    ||
					   window.oRequestAnimationFrame      ||
					   window.msRequestAnimationFrame     ||
					   function(callback, element) {
					       window.setTimeout(callback, 1000 / 60);
					   };

function newGame() {
	waitTime = 0;
	level = 1;
	lives = startLives;
	difficulty = 4;
	menu = false;
	intermission = true;
	newLevel = true;
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
		var topOrLeft = Math.random() < .5;
		var posX = minX - imageRepo.asteroidBig.width / 2;
		var posY = minY - imageRepo.asteroidBig.height / 2;

		if (topOrLeft) // Top
			posX = Math.random() * (maxX + imageRepo.asteroidBig.width / 2 - posX) + posX;
		else // Left
			posY = Math.random() * (maxY + imageRepo.asteroidBig.height / 2 - posY) + posY;

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
	var fireMaxX = maxX + imageRepo.fireball.width / 2;
	var fireMinX = minX - imageRepo.fireball.width / 2;
	var fireMaxY = maxY + imageRepo.fireball.height / 2;
	var fireMinY = minY - imageRepo.fireball.height / 2;
	
	for (var i = 0; i < fireballs.length; i++) {
		fireballs[i].position.x += fireballs[i].direction.x * 4;
		fireballs[i].position.y += fireballs[i].direction.y * 4;
		if (fireballs[i].position.x < fireMinX || fireballs[i].position.x > fireMaxX || 
			fireballs[i].position.y < fireMinY || fireballs[i].position.y > fireMaxY) {
			fireballs.splice(i, 1);
			i--;
		}
		else {
			fireballs[i].draw(actionContext);
			
			for (var x = 0; x < asteroids.length; x++) {
				if (fireballs[i].intersects(asteroids[x])) {
					fireballs.splice(i, 1);
					i--;
					if (asteroids[x].texture === imageRepo.asteroidBig) {
						explosions.push(new Explosion(asteroids[x].position, true));
						soundRepo.play('bigExplosion');
						for (var a = 0; a < 4; a++)
							randomAsteroid(asteroids[x].position.x, asteroids[x].position.y, false);
					}
					else {
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
	for (var i = 0; i < explosions.length; i++) {
		explosions[i].draw(actionContext);
		if (explosions[i].life === 16) {
			explosions.splice(i, 1);
			i--;
		}
	}
}

function drawString(string, context, size, vector, color) {
	color = color || 'white';
	context.fillStyle = color;
	context.font = size+'px arial';
	var metrics = context.measureText(string);
	context.fillText(string, Math.round(vector.x - metrics.width / 2), Math.round(vector.y));
}
					   
KEY_CODES = {
  13: 'enter',
  27: 'escape',
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
};

KEY_STATUS = {};
for (code in KEY_CODES) {
  KEY_STATUS[KEY_CODES[code]] = false;
}

document.onkeydown = function(e) {
  // Firefox and opera use charCode instead of keyCode to return which key was pressed.
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[keyCode]] = true;
	currentKeyState = KEY_CODES[keyCode];
  }
}

document.onkeyup = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[keyCode]] = false;
	currentKeyState = null;
  }
}
