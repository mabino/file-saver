(function(){
    function Controller(model, view){
        this.model = model;
        this.view = view;
        this.keys = model.keys;

        // color options and sync
        this.colorOptions = this.model.fileTypes.map(ft => ft.color);
        this.model.selectedColorIndex = this.model.selectedColorIndex || 0;
        this.model.player.selectedColor = this.colorOptions[this.model.selectedColorIndex];
        this.view.folderColorInput.value = this.model.player.selectedColor;

        this.view.folderColorInput.addEventListener('input', (e) => {
            this.model.player.selectedColor = e.target.value;
        });

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'KeyQ') { // previous color
                this.model.selectedColorIndex = (this.model.selectedColorIndex - 1 + this.colorOptions.length) % this.colorOptions.length;
                this.model.player.selectedColor = this.colorOptions[this.model.selectedColorIndex];
                this.view.folderColorInput.value = this.model.player.selectedColor;
            } else if (e.code === 'KeyE') { // next color
                this.model.selectedColorIndex = (this.model.selectedColorIndex + 1) % this.colorOptions.length;
                this.model.player.selectedColor = this.colorOptions[this.model.selectedColorIndex];
                this.view.folderColorInput.value = this.model.player.selectedColor;
            }
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);
        window.addEventListener('mousemove', e => this.model.player.x = e.clientX - this.model.player.width/2);

        // Splash start button will initiate the game instead of clicking anywhere
        var startBtn = document.getElementById('startBtn');
        var splash = document.getElementById('splash');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // apply chosen difficulty and initial folder color
                var diffEl = document.getElementById('difficulty');
                if (diffEl) this.model.applyDifficulty(diffEl.value);
                var colorInput = document.getElementById('folderColor');
                if (colorInput) {
                    this.model.player.selectedColor = colorInput.value;
                    this.view.folderColorInput.value = colorInput.value;
                }
                if (splash) splash.style.display = 'none';
                this.startGame();
            });
        }

        document.getElementById('rebootBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            // show splash again so player can adjust settings
            var splash = document.getElementById('splash');
            if (splash) splash.style.display = 'block';
            this.resetGame();
        });

        window.addEventListener('resize', () => {
            this.model.canvas.width = window.innerWidth;
            this.model.canvas.height = window.innerHeight;
        });

        this.view.showStartText();
    }

    // Web Audio loop playback for gapless looping of local file-saver.mp3
    Controller.prototype.playMusic = function(){
        var self = this;
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        try{ if (this.audioCtx.state === 'suspended') this.audioCtx.resume(); }catch(e){}
        var startSource = function(){
            if (self.bgSource) return;
            self.bgSource = self.audioCtx.createBufferSource();
            self.bgSource.buffer = self.audioBuffer;
            self.bgSource.loop = true;
            self.bgSource.connect(self.audioCtx.destination);
            try { self.bgSource.start(0); } catch(e) { /* ignore */ }
        };
        if (this.audioBuffer){
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            startSource();
            return;
        }
        fetch('file-saver.mp3').then(function(res){ return res.arrayBuffer(); }).then(function(ab){
            // decode with callback for broader support
            self.audioCtx.decodeAudioData(ab, function(decoded){
                self.audioBuffer = decoded;
                if (self.audioCtx.state === 'suspended') self.audioCtx.resume();
                startSource();
            }, function(){
                // fallback to DOM audio element using local file if available
                if (self.model && self.model.bgMusic){ try{ self.model.bgMusic.src = 'file-saver.mp3'; self.model.bgMusic.loop = true; self.model.bgMusic.play(); }catch(e){ try{ self.model.bgMusic.play(); }catch(e){} } }
            });
        }).catch(function(){ if (self.model && self.model.bgMusic){ try{ self.model.bgMusic.src = 'file-saver.mp3'; self.model.bgMusic.loop = true; self.model.bgMusic.play(); }catch(e){ try{ self.model.bgMusic.play(); }catch(e){} } } });
    };

    Controller.prototype.stopMusic = function(){
        if (this.bgSource){ try{ this.bgSource.stop(0); }catch(e){} try{ this.bgSource.disconnect(); }catch(e){} this.bgSource = null; }
        // also stop DOM audio fallback
        if (this.model && this.model.bgMusic && !this.audioBuffer){ try{ this.model.bgMusic.pause(); this.model.bgMusic.currentTime = 0; }catch(e){} }
    };

    // Play the local end-game.mp3 once
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
                    // fallback DOM
                    var a = new Audio(sadUrl); a.play();
                });
            }).catch(function(){ var a = new Audio(sadUrl); a.play(); });
        }catch(e){ var a = new Audio(sadUrl); a.play(); }
    };

    Controller.prototype.spawnLoop = function(){
        if (!this.model.gameActive) return;
        var cfg = this.model.fileTypes[Math.floor(Math.random() * this.model.fileTypes.length)];
        var file = {
            config: cfg,
            x: Math.random() * (this.model.canvas.width - 60) + 10,
            y: -60,
            speed: this.model.speedBase * this.model.speedMultiplier + (this.model.score / 15),
            trail: [],
            trailMax: 6,
            update: function(){ this.y += this.speed; }
        };
        this.model.files.push(file);

        if (Math.random() > 0.75) {
            this.model.player.targetType = this.model.fileTypes[Math.floor(Math.random() * this.model.fileTypes.length)];
        }

        var timeout = Math.max(this.model.minSpawn, this.model.spawnBase - (this.model.score * this.model.spawnReduction));
        this.model.spawnTimer = setTimeout(this.spawnLoop.bind(this), timeout);
    };

    Controller.prototype.startGame = function(){
        if (this.model.gameActive) return;
        // apply selected difficulty from UI
        var diffEl = document.getElementById('difficulty');
        if (diffEl) this.model.applyDifficulty(diffEl.value);
        this.model.gameActive = true;
        this.playMusic();
        this.spawnLoop();
        requestAnimationFrame(this.animate.bind(this));
    };

    Controller.prototype.resetGame = function(){
        clearTimeout(this.model.spawnTimer);
        this.model.score = 0;
        this.model.health = 100;
        this.model.files = [];
        this.view.updateUI();
        this.view.gameOverEl.style.display = 'none';
        // stop game and audio; wait for player to Start
        this.model.gameActive = false;
        this.stopMusic();
    };

    Controller.prototype.animate = function(){
        if (!this.model.gameActive) return;

        this.view.clear();

        // Movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.model.player.x -= this.model.player.speed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.model.player.x += this.model.player.speed;

        // Boundaries
        if (this.model.player.x < 0) this.model.player.x = 0;
        if (this.model.player.x > this.model.canvas.width - this.model.player.width) this.model.player.x = this.model.canvas.width - this.model.player.width;

        // Update files
        for (var i = this.model.files.length - 1; i >= 0; i--) {
            var file = this.model.files[i];
            file.update();
            // record trail (oldest-first)
            file.trail = file.trail || [];
            file.trail.push({ x: file.x, y: file.y });
            if (file.trail.length > (file.trailMax || 6)) file.trail.shift();

            // Collision with expanded hitbox
            var left = this.model.player.x - (this.model.player.hitboxPaddingX || 0);
            var right = this.model.player.x + this.model.player.width + (this.model.player.hitboxPaddingX || 0);
            var top = this.model.player.y - (this.model.player.hitboxPaddingY || 0);
            var bottom = this.model.player.y + 60 + (this.model.player.hitboxPaddingY || 0);
            if (file.y > top && file.y < bottom && file.x > left && file.x < right) {

                if (file.config.color.toLowerCase() === this.model.getFolderColor().toLowerCase()) {
                    this.model.score++;
                    // reward integrity for correct catches, capped at 100
                    this.model.health = Math.min(100, this.model.health + this.model.catchReward);
                } else {
                    this.model.health -= this.model.wrongPenalty;
                    this.view.screenShake();
                }
                this.model.files.splice(i, 1);
            } else if (file.y > this.model.canvas.height) {
                // Missed entirely: penalty depending on difficulty
                this.model.health -= this.model.missPenalty;
                this.model.files.splice(i, 1);
            }
        }

        this.view.drawFiles();
        this.view.drawPlayer();
        this.view.updateUI();

        if (this.model.health <= 0) {
            this.endGame();
        } else {
            requestAnimationFrame(this.animate.bind(this));
        }
    };

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

    window.Controller = Controller;
    window.controller = new Controller(window.model, window.view);
})();