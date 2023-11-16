var titlePage = true;
var playAgain;
var isAlive;
var menu;

var bestTime = 0;
var timer;
var startTime;
var difficulty;
var life;
var pressed = false;

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

// Funkcija koja predstavlja objekt koji se može crtati (npr. slika, tekstura)
function Drawable(texture, position, scale) {
	// Spremi teksturu, poziciju, širinu i visinu objekta
	this.texture = texture;
	this.position = position;
	this.width = texture.width;
	this.height = texture.height;

	// Ako je definiran parametar skale, postavi širinu i visinu u skladu s tom skalom
	if (scale) {
		this.scaleWidth = this.width * scale;
		this.scaleHeight = this.height * scale;
	}
}

// Metoda za crtanje objekta na određenom kontekstu (canvas)
Drawable.prototype.draw = function (context) {
	// Ako nije definirana širina skaliranja, nacrtaj objekt bez skaliranja
	if (!this.scaleWidth) {
		context.drawImage(
			this.texture,
			Math.round(this.position.x - this.width / 2),
			Math.round(this.position.y - this.height / 2)
		);
	} else { // Inače, nacrtaj skalirani objekt
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

// Funkcija koja predstavlja objekt koji se može kretati (npr. igrač, projektil)
function Moveable(texture, position, direction, angle) {
	// Pozivamo konstruktor roditeljske klase (Drawable) s određenim parametrima
	Drawable.call(this, texture, position);

	// Spremamo smjer i kut kretanja objekta
	this.direction = direction;
	this.angle = angle;
}

// Postavljanje prototipa za Moveable kao podobjekta od Drawable
Moveable.prototype = Object.create(Drawable.prototype);

// Metoda za crtanje objekta Moveable na zadanom kontekstu
Moveable.prototype.draw = function (context) {
	// Postavi trenutnu poziciju kao središte transformacije
	context.translate(this.position.x, this.position.y);

	// Rotiraj objekt prema zadanim kutem
	context.rotate(this.angle);

	// Nacrtaj teksturu objekta na kontekstu
	context.drawImage(this.texture, -Math.round(this.width / 2), -Math.round(this.height / 2));

	// Ponovno postavi poziciju kao središte transformacije natrag na početnu
	context.rotate(-this.angle);
	context.translate(-this.position.x, -this.position.y);
};

// Metoda za omotavanje granica, osiguravajući da objekt ostane unutar ekrana
Moveable.prototype.wrapBoundry = function () {
	// Spremi trenutne koordinate objekta
	var x = this.position.x;
	var y = this.position.y;

	// Izračunaj polovicu širine i visine objekta
	var width = this.width / 2;
	var height = this.height / 2;

	// Provjeri uvjete za omotavanje granica po X i Y osima
	if (x > maxX + width) {
		// Ako je objekt izvan desne granice, postavi ga na lijevu stranu ekrana
		x = minX - width;
	} else if (x < minX - width) {
		// Ako je objekt izvan lijeve granice, postavi ga na desnu stranu ekrana
		x = maxX + width;
	} else if (y > maxY + height) {
		// Ako je objekt izvan donje granice, postavi ga na gornju stranu ekrana
		y = minY - height;
	} else if (y < minY - height) {
		// Ako je objekt izvan gornje granice, postavi ga na donju stranu ekrana
		y = maxY + height;
	}

	// Postavi nove koordinate objekta
	this.position = new Vector(x, y);
};

// Metoda za provjeru preklapanja objekta Moveable s drugim objektom Drawable
Moveable.prototype.intersects = function (drawable) {
	// Definiraj granice (lijevu, gornju, desnu i donju) trenutnog objekta
	var leftX = this.position.x - this.width / 2;
	var topY = this.position.y - this.height / 2;
	var rightX = leftX + this.width;
	var bottomY = topY + this.height;

	// Definiraj granice (lijevu, gornju, desnu i donju) drugog objekta (Drawable)
	var dLeftX = drawable.position.x - drawable.width / 2;
	var dTopY = drawable.position.y - drawable.height / 2;
	var dRightX = dLeftX + drawable.width;
	var dBottomY = dTopY + drawable.height;

	// Provjeri preklapanje po X i Y osima te vrati rezultat
	return rightX > dLeftX && leftX < dRightX && bottomY > dTopY && topY < dBottomY;
};

// Konstruktor za objekt Ship koji nasljeđuje od Moveable. Postavlja teksturu, poziciju, smjer i kut
function Ship(position, angle) {
	Moveable.call(this, imageRepo.ship, position, new Vector(Math.cos(angle), Math.sin(angle)), angle);
	this.width = 69; // Širina broda
	this.speed = new Vector(0, 0); // Brzina broda
	this.fireRate = 10; // Brzina ispaljivanja
	this.fireCounter = 0; // Brojač ispaljivanja
}

// Postavljanje prototipa za Ship kao podobjekta od Moveable
Ship.prototype = Object.create(Moveable.prototype);

// Metoda za crtanje broda na zadanom kontekstu
Ship.prototype.draw = function (context) {
	// Postavi poziciju i kut rotacije broda
	context.translate(this.position.x, this.position.y);
	context.rotate(this.angle);
	var offset = KEY_STATUS.up && life > 0 ? this.width : 0; // Odredi offset za animaciju broda ako je pritisnuta tipka "Gore" i igrač je živ

	// Nacrtaj brod na određenom kontekstu
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

	context.rotate(-this.angle);// Vrati kut rotacije na prethodnu vrijednost

	context.translate(-this.position.x, -this.position.y);// Vrati poziciju na prethodnu vrijednost
};

// Metoda za kretanje broda.
Ship.prototype.move = function () {
	if (!isAlive) return; // ako nije živ vrati odmah
	this.fireCounter++;
	this.position.x += this.speed.x;
	this.position.y += this.speed.y;
	this.wrapBoundry(); // Provjera i omotavanje granica broda

	for (var i = 0; i < asteroids.length; i++) { // Za svaki asteroid
		if (this.intersects(asteroids[i])) { // Ako se brod i asteroid sudare
			// Dodavanje eksplozije na sredinu između broda i asteroida
			explosions.push(new Explosion(new Vector((this.position.x + asteroids[i].position.x) / 2,
				(this.position.y + asteroids[i].position.y) / 2), true)); // Dodaj novu ekploziju
			soundRepo.play('bigExplosion'); // Zvuk eksplozije
			asteroids.splice(i, 1); // Uklanjanje asteroida
			isAlive = false;
			life--;
			var currentTime = new Date(); // Trenutno vrijeme
			if (currentTime - startTime > bestTime) { // Proteklo vrijeme je trenutno vrijeme - početno vrijeme
				bestTime = currentTime - startTime;
				localStorage.setItem('best_time', bestTime); // Ažuriranje najboljeg vremena u lokalnom pohranjivanju
			}
			break;
		}
	}
};

// Metoda za upravljanje brodom
Ship.prototype.control = function () {
	if (!isAlive) return;
	if (KEY_STATUS.right)
		this.angle += .08; // Rotacija udesno
	else if (KEY_STATUS.left)
		this.angle -= .08; // Rotacija ulijevo

	this.angle %= circle; // Osiguravanje da kut ostane u granicama kruga
	this.direction = new Vector(Math.cos(this.angle), Math.sin(this.angle));

	if (KEY_STATUS.up) {
		if (this.direction.x > 0 && this.speed.x < 10 ||
			this.direction.x < 0 && this.speed.x > -10)
			this.speed.x += this.direction.x * .1; // Povećanje brzine prema naprijed u x smjeru
		if (this.direction.y > 0 && this.speed.y < 10 ||
			this.direction.y < 0 && this.speed.y > -10)
			this.speed.y += this.direction.y * .1; // Povećanje brzine prema naprijed u y smjeru
	}
	else if (KEY_STATUS.down) {
		if (this.speed.x > .2 || this.speed.x < -.2 ||
			this.speed.y > .2 || this.speed.y < -.2) {
			this.speed.x *= .9; // Smanjenje brzine u x smjeru
			this.speed.y *= .9; // Smanjenje brzine u y smjeru
		}
		else
			this.speed = new Vector(0, 0); // Brzina 0 ako nema pritiska na tipku
	}
	if (KEY_STATUS.space && this.fireCounter > this.fireRate) {
		// Iscrtavanje i dodavanje novih vatrenih kugli
		var position = new Vector(this.position.x + this.direction.x * 30, this.position.y + this.direction.y * 30);
		fireballs.push(new Moveable(imageRepo.fireball, position, this.direction, this.angle)); // Stvori nove vatrene kugle
		soundRepo.play('fire'); // Zvuk ispaljivanja
		this.fireCounter = 0; // Resetiranje brojača ispaljivanja
	}
};

// Konstruktor za objekt Asteroid koji nasljeđuje od Moveable
function Asteroid(position, direction, angle, rotation, isBig) {
	Moveable.call(this, imageRepo[isBig ? 'asteroidBig' : 'asteroidSmall'], position, direction, angle);
	this.rotation = rotation; // Postavljanje rotacije asteroida
}

// Postavljanje prototipa za Asteroid kao podobjekta od Moveable
Asteroid.prototype = Object.create(Moveable.prototype);

// Konstruktor za objekt Explosion koji nasljeđuje od Drawable
function Explosion(position, isBig) {
	Drawable.call(this, imageRepo[isBig ? 'explosionBig' : 'explosionSmall'], position);
	this.width = isBig ? 100 : 64; // Postavljanje širine eksplozije.
	this.life = 0; // Inicijalizacija životnog vijeka eksplozije.
}

// Postavljanje prototipa za objekt Explosion kao podobjekta od Drawable
Explosion.prototype = Object.create(Drawable.prototype);

// Definicija metode draw za objekt Explosion.
Explosion.prototype.draw = function (context) {
	var spriteX = this.width * this.life; // Izračunavanje x-koordinate trenutnog okvira animacije

	// Crta eksploziju koristeći trenutni okvir animacije
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

	this.life++; // Povećava životni vijek eksplozije za idući okvir animacije
};

// Repozitorij slika
var imageRepo = (function () {
	var numImages = 10; // Ukupan broj slika koje se učitavaju
	var numLoaded = 0; // Broj trenutno učitanih slika

	// Funkcija koja se poziva kada se slika učita, povećava broj učitanih slika i inicijalizira prozor ako su sve slike učitane
	function imageLoaded() {
		numLoaded++;
		if (numLoaded === numImages) {
			window.init(); // Poziv inicijalizacijske funkcije kad su sve slike učitane
		}
	}

	// Objekt koji sadrži putanje do slika i funkciju za njihovo učitavanje
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

	// Funkcija koja kreira novi Image objekt, postavlja mu izvor slike, dodaje slušatelj za događaj učitavanja i vraća stvoreni objekt
	function loadImage(src) {
		var image = new Image();
		image.src = src;
		image.onload = imageLoaded; // Dodavanje slušatelja događaja učitavanja slike
		return image; // Vraćanje stvorenog Image objekta
	}
})();

// Repozitorij zvukova
var soundRepo = (function () {
	var size = 10; // Veličina zvučnog bazena, odnosno broj zvukova u bazenu

	// Stvaranje bazena zvukova za paljenje vatre
	var firePool = createSoundPool('audio/fire.mp3');
	// Stvaranje bazena zvukova za eksplozije
	var explosionPool = createSoundPool('audio/explosion.mp3');
	// Stvaranje bazena zvukova za velike eksplozije
	var bigExplosionPool = createSoundPool('audio/explosionbig.mp3');

	// Funkcija za stvaranje bazena zvukova
	function createSoundPool(src) {
		var pool = { current: 0, sounds: [] };
		for (var i = 0; i < size; i++) {
			var audio = new Audio(src); // Stvaranje novog Audio objekta za zvuk
			audio.load(); // Učitavanje zvuka
			pool.sounds.push(audio); // Dodavanje zvuka u bazen
		}
		return pool; // Vraćanje stvorenog bazena zvukova
	}

	// Funkcija za reprodukciju zvuka iz određenog bazena
	function play(sound) {
		// Odabir bazena zvukova na temelju naziva zvuka
		var soundPool = (sound === 'fire') ? firePool : (sound === 'explosion') ? explosionPool : bigExplosionPool;

		var currentSound = soundPool.sounds[soundPool.current];
		// Reprodukcija zvuka samo ako nije trenutno u reprodukciji
		if (currentSound.currentTime === 0 || currentSound.ended) {
			currentSound.play();
		}
		soundPool.current = (soundPool.current + 1) % size; // Pomicanje indeksa trenutnog zvuka u bazenu
	}

	// Objekt koji sadrži funkciju za reprodukciju zvuka
	return {
		play: play
	};
})();

// Funkcija za inicijalizaciju igre
function init() {
	// Postavljanje konteksta za platna
	setupCanvas('background', 'backgroundContext');
	setupCanvas('action', 'actionContext');
	setupCanvas('menu', 'menuContext');

	// Inicijalizacija najboljeg vremena i pamćenje starog
	bestTime = localStorage.getItem('best_time');
	localStorage.setItem('best_time', bestTime);

	// Crtanje pozadinske slike
	backgroundContext.drawImage(imageRepo.background, 0, 0);

	// Inicijalizacija broda
	ship = new Ship(new Vector(maxX / 2, maxY / 2), 0);

	// Prikaz naslova i upravljačkih opcija u izborniku
	displayMenu();
	animate();
}

// Funkcija za postavljanje konteksta za platno
function setupCanvas(canvasId, contextName) {
	window[contextName] = document.getElementById(canvasId).getContext('2d');
	window[contextName].canvas.width = maxX;
	window[contextName].canvas.height = maxY;
}

// Funkcija za postavljanje inicijalnog početnog ekrana
function displayMenu() {
	// Brišanje sadržaja iz meni konteksta
	menuContext.clearRect(0, 0, maxX, maxY);

	// Crta naslovnu sliku na sredini ekrana
	new Drawable(imageRepo.title, new Vector(maxX / 2, maxY / 3)).draw(menuContext);

	// Dodaj tekst za odabir težine igre
	drawString('Select difficulty:', menuContext, 20, new Vector(maxX / 2, maxY / 1.5));

	// Dodaj opcije za težinu igre
	drawString('Easy (Press "E")', menuContext, 18, new Vector(maxX / 2, maxY / 1.4));
	drawString('Medium (Press "M")', menuContext, 18, new Vector(maxX / 2, maxY / 1.35));
	drawString('Hard (Press "H")', menuContext, 18, new Vector(maxX / 2, maxY / 1.3));

	// Postavi težinu igre na osnovu pritiska tipki
	document.addEventListener('keydown', function (event) {
		switch (event.key.toUpperCase()) {
			case 'E':
				difficulty = 5; // Easy
				pressed = true;
				break;
			case 'M':
				difficulty = 10; // Medium
				pressed = true;
				break;
			case 'H':
				difficulty = 15; // Hard
				pressed = true;
				break;
		}
	});
}

function animate() {
	// Poziva funkciju za animaciju na sljedećem frame-u
	requestAnimFrame(animate);

	// Provjerava je li trenutna stranica naslovnica ili igra
	if (titlePage) {
		// Ako je trenutna stranica naslovnica, poziva funkciju za rukovanje naslovnicom
		handleTitlePage();
	} else {
		// Ako je trenutna stranica igre, poziva funkciju za rukovanje igrom
		handleGamePage();
	}
}

function handleTitlePage() {

	if (pressed) {
		setupCanvas('menu', 'menuContext');
		// Crta tekst "Press Enter to start game" ispod naslovne slike
		drawString('Press Enter to start game', menuContext, 25, new Vector(maxX / 2, maxY / 1.65));

		// Crta sliku kontrola na dnu ekrana
		new Drawable(imageRepo.controls, new Vector(maxX / 2, maxY - 70)).draw(menuContext);

		// Rukuje događajem na naslovnici (npr. pritisak tipke Enter za početak igre)
		if (KEY_STATUS.enter) {
			// Briše sadržaj iz meni konteksta
			menuContext.clearRect(0, 0, maxX, maxY);
	
			// Postavlja naslovnicu na "false"
			titlePage = false;
			// Pamti trenutno vrijeme za izračun najboljeg vremena
			startTime = new Date();
			// Pokretanje nove igre i početak animacije
			newGame();
		}
	}
}

function handleGamePage() {
	// Briše sadržaj iz akcijskog konteksta
	actionContext.clearRect(0, 0, maxX, maxY);

	// Crta brod ako je igrač živ
	if (isAlive) {
		ship.draw(actionContext);
	}

	// Pomicanje broda
	ship.move();

	// Crta meteore, vatrenke i eksplozije
	drawFireballs();
	drawAsteroids();
	drawExplosions();

	// Provjerava je li život igrača manji od 1 (igrač mrtav)
	if (life < 1) {
		// Rukuje događajem na kraju igre
		handleGameOver();
	} else {
		// Ako igra još traje, ažurira vrijeme i upravlja brodom
		var currentTime = new Date();
		timer = formatTime(currentTime - startTime);
		ship.control();
	}

	// Dohvaća najbolje vrijeme iz lokalne pohrane
	const best_time = localStorage.getItem('best_time');

	// Crta tekst s najboljim vremenom i trenutnim vremenom
	drawString('Best time: ' + formatTime(best_time), actionContext, 21, new Vector(1800, 25));
	drawString('Time: ' + timer, actionContext, 21, new Vector(1821, 52));
}

function handleGameOver() {
	// Postavlja teksturu za kraj igre
	gameOverTexture = imageRepo.gameOver;

	// Briše sadržaj iz meni konteksta
	menuContext.clearRect(0, 0, maxX, maxY);

	// Crta sliku za kraj igre na sredini ekrana
	new Drawable(gameOverTexture, new Vector(maxX / 2, maxY / 3)).draw(menuContext);

	// Crta poruku "Pritisnite Enter za ponovnu igru"
	drawString("Press Enter to play again", menuContext, 25, new Vector(maxX / 2, maxY / 1.5));

	// Rukuje događajem ponovnog pokretanja igre pritiskom na tipku Enter
	if (KEY_STATUS.enter) {
		// Briše sadržaj iz meni konteksta
		menuContext.clearRect(0, 0, maxX, maxY);

		// Pokreće novu igru
		newGame();
	}
}

// Funkcija za oblikovanje vremena u format sati:minute:sekunde
function formatTime(milliseconds) {
	// Pretvara milisekunde u sekunde, minute i sate
	var seconds = Math.floor(milliseconds / 1000);
	var minutes = Math.floor(seconds / 60);
	var hours = Math.floor(minutes / 60);

	// Preostale sekunde i minute nakon pretvorbe
	seconds %= 60;
	minutes %= 60;

	// Vraća formatirano vrijeme u obliku sati:minute:sekunde
	return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

// Funkcija za dodavanje vodećih nula broju manjem od 10
function pad(num) {
	return (num < 10 ? '0' : '') + num;
}

// Definiranje funkcije za animaciju prema standardu preglednika
var requestAnimFrame = (
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function (callback, element) {
		// Ako preglednik ne podržava requestAnimationFrame, koristi setTimeout
		window.setTimeout(callback, 1000 / 60);
	}
);

// Funkcija za pokretanje nove igre
function newGame() {
	// Postavljanje početnog vremena, života, i postavki igre
	startTime = new Date();
	life = 1;
	menu = false;
	isAlive = true;
	playAgain = true;

	// Resetiranje svih elemenata igre
	reset();
}

// Funkcija za resetiranje igre na početne postavke
function reset() {
	// Pražnjenje polja vatrenih kugli i asteroida
	fireballs = [];
	asteroids = [];

	// Postavljanje broda na sredinu ekrana
	ship.position = new Vector(maxX / 2, maxY / 2);
	ship.speed = new Vector(0, 0);
	ship.angle = 0;

	// Generiranje novih asteroida prema težini igre
	for (var i = 0; i < difficulty; i++) {
		var posX, posY;

		// Određivanje pozicije na temelju slučajnosti (gore ili lijevo)
		if (Math.random() < 0.5) { // Gore
			posX = Math.random() * (maxX + imageRepo.asteroidBig.width) - imageRepo.asteroidBig.width / 2;
			posY = minY - imageRepo.asteroidBig.height / 2;
		} else { // Lijevo
			posX = minX - imageRepo.asteroidBig.width / 2;
			posY = Math.random() * (maxY + imageRepo.asteroidBig.height) - imageRepo.asteroidBig.height / 2;
		}

		// Dodavanje novog asteroida
		randomAsteroid(posX, posY, true);
	}
}

// Funkcija za generiranje nasumičnog asteroida
function randomAsteroid(posX, posY, isBig) {
	// Generiranje nasumičnog kuta i brzine asteroida
	var asteroidAngle = Math.random() * circle;
	var speed = Math.random() * 3;

	// Izračun smjera kretanja asteroida
	var dirX = Math.cos(asteroidAngle) * speed;
	var dirY = Math.sin(asteroidAngle) * speed;

	// Dodavanje novog asteroida u polje
	asteroids.push(new Asteroid(new Vector(posX, posY), new Vector(dirX, dirY), 0, asteroidRotation, isBig));

	// Obrtanje rotacije za sljedeći asteroid
	asteroidRotation *= -1;
}

// Funkcija za crtanje vatrenih kugli
function drawFireballs() {
	// Dimenzije vatrene kugle
	const fireballWidth = imageRepo.fireball.width;
	const fireballHeight = imageRepo.fireball.height;

	// Granice za provjeru izlaska izvan ekrana
	const fireMaxX = maxX + fireballWidth / 2;
	const fireMinX = minX - fireballWidth / 2;
	const fireMaxY = maxY + fireballHeight / 2;
	const fireMinY = minY - fireballHeight / 2;

	// Iteriranje kroz vatrene kugle u obrnutom redoslijedu
	for (let i = fireballs.length - 1; i >= 0; i--) {
		const fireball = fireballs[i];

		// Pomak vatrene kugle prema trenutnom smjeru
		fireball.position.x += fireball.direction.x * 4;
		fireball.position.y += fireball.direction.y * 4;

		// Provjera izlaska izvan granica ekrana
		if (
			fireball.position.x < fireMinX ||
			fireball.position.x > fireMaxX ||
			fireball.position.y < fireMinY ||
			fireball.position.y > fireMaxY
		) {
			// Uklanjanje vatrene kugle iz polja
			fireballs.splice(i, 1);
		} else {
			// Crtanje vatrene kugle na ekranu
			fireball.draw(actionContext);

			// Provjera sudara vatrene kugle s asteroidima
			for (let x = asteroids.length - 1; x >= 0; x--) {
				if (fireball.intersects(asteroids[x])) {
					// Uklanjanje vatrene kugle
					fireballs.splice(i, 1);

					// Dodavanje eksplozije ovisno o veličini asteroida
					if (asteroids[x].texture === imageRepo.asteroidBig) {
						explosions.push(new Explosion(asteroids[x].position, true));
						soundRepo.play('bigExplosion');

						// Stvaranje četiri manja asteroida iz većeg koji je uništen
						for (let a = 0; a < 4; a++) {
							randomAsteroid(asteroids[x].position.x, asteroids[x].position.y, false);
						}
						// Dodavanje novog asteroida
						var posX, posY;

						// Određivanje pozicije na temelju slučajnosti (gore ili lijevo)
						if (Math.random() < 0.5) { // Gore
							posX = Math.random() * (maxX + imageRepo.asteroidBig.width) - imageRepo.asteroidBig.width / 2;
							posY = minY - imageRepo.asteroidBig.height / 2;
						} else { // Lijevo
							posX = minX - imageRepo.asteroidBig.width / 2;
							posY = Math.random() * (maxY + imageRepo.asteroidBig.height) - imageRepo.asteroidBig.height / 2;
						}

						// Dodavanje novog asteroida
						randomAsteroid(posX, posY, true);
					} else {
						// Stvara eksploziju
						explosions.push(new Explosion(asteroids[x].position, false));
						soundRepo.play('explosion');
					}

					// Uklanjanje asteroida iz polja
					asteroids.splice(x, 1);
					break;
				}
			}
		}
	}
}

// Funkcija za crtanje asteroida
function drawAsteroids() {
	for (var i = 0; i < asteroids.length; i++) {
		// Ažuriranje pozicije, rotacije i crtanje asteroida
		asteroids[i].position.x += asteroids[i].direction.x;
		asteroids[i].position.y += asteroids[i].direction.y;
		asteroids[i].angle += asteroids[i].rotation;
		asteroids[i].angle %= circle;
		asteroids[i].wrapBoundry();

		// Crtanje asteroida na ekranu
		asteroids[i].draw(actionContext);
	}
}

// Funkcija za crtanje eksplozija
function drawExplosions() {
	for (let i = explosions.length - 1; i >= 0; i--) {
		const explosion = explosions[i];
		// Crtanje eksplozije na ekranu
		explosion.draw(actionContext);

		// Provjera trajanja eksplozije i uklanjanje iz polja
		if (explosion.life === 16) {
			explosions.splice(i, 1);
		}
	}
}

// Funkcija za crtanje teksta na ekranu
function drawString(string, context, size, vector, color = 'white') {
	// Postavljanje boje i fonta teksta
	context.fillStyle = color;
	context.font = size + 'px arial';
	const metrics = context.measureText(string);
	// Crtanje teksta na ekranu
	context.fillText(string, Math.round(vector.x - metrics.width / 2), Math.round(vector.y));
}

// Mapiranje tipki na njihove odgovarajuće kodove
const KEY_CODES = {
	'Enter': 'enter',
	'Escape': 'escape',
	' ': 'space',
	'ArrowLeft': 'left',
	'ArrowUp': 'up',
	'ArrowRight': 'right',
	'ArrowDown': 'down',
};

// Objekt za praćenje statusa tipki
const KEY_STATUS = {};

// Postavljanje početnih vrijednosti statusa tipki
for (const code in KEY_CODES) {
	KEY_STATUS[KEY_CODES[code]] = false;
}

// Dodavanje događaja za pritisak tipke
document.addEventListener('keydown', function (e) {
	const key = e.key;

	// Provjera je li tipka definirana u KEY_CODES
	if (KEY_CODES[key]) {
		e.preventDefault();
		KEY_STATUS[KEY_CODES[key]] = true;
		currentKeyState = KEY_CODES[key];
	}
});

// Dodavanje događaja za otpuštanje tipke
document.addEventListener('keyup', function (e) {
	const key = e.key;

	// Provjera je li tipka definirana u KEY_CODES
	if (KEY_CODES[key]) {
		e.preventDefault();
		KEY_STATUS[KEY_CODES[key]] = false;
		currentKeyState = null;
	}
});
