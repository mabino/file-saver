/*
  controller.js
  Handles user input, game loops, spawning logic, audio playback (Web Audio),
  and the bridge between Model and View.
  Heavily commented to explain intent and edge cases.
  Generated/modified: 2025-12-30T01:02:23.273Z
*/

(function(){
    // Controller constructor: hooks up model/view and registers event handlers
    function Controller(model, view){
        this.model = model;
        this.view = view;
        this.keys = model.keys; // shared key state map used in animate()

        // Prepare list of color options (extracted from fileTypes) and sync UI
        this.colorOptions = this.model.fileTypes.map(ft => ft.color);
        this.model.selectedColorIndex = this.model.selectedColorIndex || 0;
        this.model.player.selectedColor = this.colorOptions[this.model.selectedColorIndex];
        this.view.folderColorInput.value = this.model.player.selectedColor;

        // Keep the color input in sync: when user edits it, update model immediately
        this.view.folderColorInput.addEventListener('input', (e) => {
            this.model.player.selectedColor = e.target.value;
        });

        // Keyboard handling: Q/E cycles color, other keys update pressed map
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            // Q/E provide quick color cycling convenience both on splash and in-game
            if (e.code === 'KeyQ') {
                this.model.selectedColorIndex = (this.model.selectedColorIndex - 1 + this.colorOptions.length) % this.colorOptions.length;
                this.model.player.selectedColor = this.colorOptions[this.model.selectedColorIndex];
                this.view.folderColorInput.value = this.model.player.selectedColor;
            } else if (e.code === 'KeyE') {
                this.model.selectedColorIndex = (this.model.selectedColorIndex + 1) % this.colorOptions.length;
                this.model.player.selectedColor = this.colorOptions[this.model.selectedColorIndex];
                this.view.folderColorInput.value = this.model.player.selectedColor;
            }
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        // Mouse moves the folder horizontally; we directly set model.player.x
        window.addEventListener('mousemove', e => this.model.player.x = e.clientX - this.model.player.width/2);

        // Splash start button will initiate the game instead of clicking anywhere
        var startBtn = document.getElementById('startBtn');
        var splash = document.getElementById('splash');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Apply chosen difficulty from splash UI and initial folder color
                var diffEl = document.getElementById('difficulty');
                if (diffEl) this.model.applyDifficulty(diffEl.value);
                var colorInput = document.getElementById('folderColor');
                if (colorInput) {
                    this.model.player.selectedColor = colorInput.value;
                    this.view.folderColorInput.value = colorInput.value;
                }
                // Hide splash and start the main game loop
                if (splash) splash.style.display = 'none';
                this.startGame();
            });
        }

        // Reboot button: show splash again and reset the game (stop loops and audio)
        document.getElementById('rebootBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            var splash = document.getElementById('splash');
            if (splash) splash.style.display = 'block';
            this.resetGame();
        });

        // Keep canvas sized to window
        window.addEventListener('resize', () => {
            this.model.canvas.width = window.innerWidth;
            this.model.canvas.height = window.innerHeight;
        });

        // Show initial canvas hint before the user starts the game
        this.view.showStartText();
    }

    /*
      playMusic(): attempts to play the local 'file-saver.mp3' via Web Audio for
      gapless looping. Falls back to the DOM <audio> element if decoding fails.
      - Caches decoded AudioBuffer on the controller instance (this.audioBuffer)
      - Creates a looping AudioBufferSourceNode (this.bgSource)
      - Respects suspended AudioContext state by resuming when needed
    */
    Controller.prototype.playMusic = function(){
        var self = this;
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        try{ if (this.audioCtx.state === 'suspended') this.audioCtx.resume(); }catch(e){}

        var startSource = function(){
            // Guard: if source already exists, do nothing (prevents duplicate playback)
            if (self.bgSource) return;
            self.bgSource = self.audioCtx.createBufferSource();
            self.bgSource.buffer = self.audioBuffer;
            self.bgSource.loop = true;
            self.bgSource.connect(self.audioCtx.destination);
            try { self.bgSource.start(0); } catch(e) { /* ignore start errors */ }
        };

        // If already decoded, just (re)start playback
        if (this.audioBuffer){
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            startSource();
            return;
        }

        // Fetch and decode audio; use decodeAudioData callback form for wider support
        fetch('file-saver.mp3').then(function(res){ return res.arrayBuffer(); }).then(function(ab){
            self.audioCtx.decodeAudioData(ab, function(decoded){
                self.audioBuffer = decoded;
                if (self.audioCtx.state === 'suspended') self.audioCtx.resume();
                startSource();
            }, function(){
                // If decodeAudioData failed, fallback to DOM audio and play a local file if present
                if (self.model && self.model.bgMusic){ try{ self.model.bgMusic.src = 'file-saver.mp3'; self.model.bgMusic.loop = true; self.model.bgMusic.play(); }catch(e){ try{ self.model.bgMusic.play(); }catch(e){} } }
            });
        }).catch(function(){
            // Network or fetch error -> try DOM audio fallback
            if (self.model && self.model.bgMusic){ try{ self.model.bgMusic.src = 'file-saver.mp3'; self.model.bgMusic.loop = true; self.model.bgMusic.play(); }catch(e){ try{ self.model.bgMusic.play(); }catch(e){} } }
        });
    };

    /*
      stopMusic(): stop any current Web Audio source and also pause the DOM audio
      fallback. This is safe to call even if playback isn't active.
    */
    Controller.prototype.stopMusic = function(){
        if (this.bgSource){ try{ this.bgSource.stop(0); }catch(e){} try{ this.bgSource.disconnect(); }catch(e){} this.bgSource = null; }
        // Also stop the DOM audio if present and the WebAudio buffer hasn't been used
        if (this.model && this.model.bgMusic && !this.audioBuffer){ try{ this.model.bgMusic.pause(); this.model.bgMusic.currentTime = 0; }catch(e){} }
    };

    /*
      playSadSound(): play a single short end-game audio to signal game over.
      Uses local 'end-game.mp3' with WebAudio decode when possible, falling back
      to a transient DOM Audio element.
    */
    Controller.prototype.playSadSound = function(){
        var self = this;
        var sadUrl = 'end-game.mp3';
        try{
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            fetch(sadUrl).then(function(res){ return res.arrayBuffer(); }).then(function(ab){
                self.audioCtx.decodeAudioData(ab, function(decoded){
                    var src = self.audioCtx.createBufferSource();
                    src.buffer = decoded;
                    src.connect(self.audioCtx.destination);
                    try{ src.start(0); }catch(e){}
                }, function(){
                    // decode failed -> simple DOM Audio playback
                    var a = new Audio(sadUrl); a.play();
                });
            }).catch(function(){ var a = new Audio(sadUrl); a.play(); });
        }catch(e){ var a = new Audio(sadUrl); a.play(); }
    };

    /*
      spawnLoop(): creates a new file object and schedules the next spawn.
      Files are simple objects with x,y,speed and an update function. The
      loop uses a timeout rather than an interval to allow dynamic adjustments
      of spawn timing based on the score/difficulty.
    */
    Controller.prototype.spawnLoop = function(){
        if (!this.model.gameActive) return;
        var cfg = this.model.fileTypes[Math.floor(Math.random() * this.model.fileTypes.length)];
        var file = {
            config: cfg,
            x: Math.random() * (this.model.canvas.width - 60) + 10,
            y: -60,
            // speed uses model speedBase and multiplier so difficulty affects velocity
            speed: this.model.speedBase * this.model.speedMultiplier + (this.model.score / 15),
            trail: [],
            trailMax: 6,
            update: function(){ this.y += this.speed; }
        };
        this.model.files.push(file);

        // Occasionally change the requested file type for variety
        if (Math.random() > 0.75) {
            this.model.player.targetType = this.model.fileTypes[Math.floor(Math.random() * this.model.fileTypes.length)];
        }

        // Spawn interval scales with score to increase difficulty over time
        var timeout = Math.max(this.model.minSpawn, this.model.spawnBase - (this.model.score * this.model.spawnReduction));
        this.model.spawnTimer = setTimeout(this.spawnLoop.bind(this), timeout);
    };

    /*
      startGame: sets gameActive and kicks off audio/spawn/animation. This is
      always invoked after a user gesture (start button) to satisfy autoplay
      restrictions in browsers.
    */
    Controller.prototype.startGame = function(){
        if (this.model.gameActive) return;
        var diffEl = document.getElementById('difficulty');
        if (diffEl) this.model.applyDifficulty(diffEl.value);
        this.model.gameActive = true;
        this.playMusic();
        this.spawnLoop();
        requestAnimationFrame(this.animate.bind(this));
    };

    /*
      resetGame: clears timers and state, stops audio, and places the game into
      a stopped state waiting for the player to press START again.
    */
    Controller.prototype.resetGame = function(){
        clearTimeout(this.model.spawnTimer);
        this.model.score = 0;
        this.model.health = 100;
        this.model.files = [];
        this.view.updateUI();
        this.view.gameOverEl.style.display = 'none';
        // Stop loops and audio; do not auto-restart - wait for Start gesture
        this.model.gameActive = false;
        this.stopMusic();
    };

    /*
      animate: the main per-frame update function. Responsible for:
      - reading input to move the player
      - updating file positions and trails
      - handling collisions and scoring/health changes
      - rendering via view.draw* helpers
      Uses requestAnimationFrame for smooth animation.
    */
    Controller.prototype.animate = function(){
        if (!this.model.gameActive) return;

        this.view.clear();

        // Keyboard movement is applied here (keys map updated by event handlers)
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.model.player.x -= this.model.player.speed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.model.player.x += this.model.player.speed;

        // Clamp player inside canvas horizontally
        if (this.model.player.x < 0) this.model.player.x = 0;
        if (this.model.player.x > this.model.canvas.width - this.model.player.width) this.model.player.x = this.model.canvas.width - this.model.player.width;

        // Update files backwards so we can splice safely while iterating
        for (var i = this.model.files.length - 1; i >= 0; i--) {
            var file = this.model.files[i];
            file.update();

            // Maintain a small trail of previous positions for subtle motion effect
            file.trail = file.trail || [];
            file.trail.push({ x: file.x, y: file.y });
            if (file.trail.length > (file.trailMax || 6)) file.trail.shift();

            // Collision detection uses an expanded rectangular hitbox for player
            var left = this.model.player.x - (this.model.player.hitboxPaddingX || 0);
            var right = this.model.player.x + this.model.player.width + (this.model.player.hitboxPaddingX || 0);
            var top = this.model.player.y - (this.model.player.hitboxPaddingY || 0);
            var bottom = this.model.player.y + 60 + (this.model.player.hitboxPaddingY || 0);

            // Check if file is within the player's hitbox area
            if (file.y > top && file.y < bottom && file.x > left && file.x < right) {

                // Compare by color (player selects a folder color to catch that color)
                if (file.config.color.toLowerCase() === this.model.getFolderColor().toLowerCase()) {
                    this.model.score++;
                    // Healing/reward for correct catches is bounded
                    this.model.health = Math.min(100, this.model.health + this.model.catchReward);
                } else {
                    // Wrong catch: apply penalty and feedback
                    this.model.health -= this.model.wrongPenalty;
                    this.view.screenShake();
                }
                // Remove the file after it's been handled
                this.model.files.splice(i, 1);
            } else if (file.y > this.model.canvas.height) {
                // File fell past bottom -> miss penalty
                this.model.health -= this.model.missPenalty;
                this.model.files.splice(i, 1);
            }
        }

        // Draw all visuals and update UI
        this.view.drawFiles();
        this.view.drawPlayer();
        this.view.updateUI();

        // Check for end condition and either end or request next frame
        if (this.model.health <= 0) {
            this.endGame();
        } else {
            requestAnimationFrame(this.animate.bind(this));
        }
    };

    /*
      endGame: stop the loop, show overlay, stop background music and play an
      end-game sound. Also persist high score.
    */
    Controller.prototype.endGame = function(){
        this.model.gameActive = false;
        this.view.showGameOver();
        this.stopMusic();
        this.playSadSound();
        if (this.model.score > this.model.highScore) {
            this.model.highScore = this.model.score;
            localStorage.setItem('fileSaverScore', this.model.highScore);
            this.view.highScoreEl.innerText = this.model.highScore;
        }
    };

    // Export controller and create the singleton instance used by the page
    window.Controller = Controller;
    window.controller = new Controller(window.model, window.view);
})();