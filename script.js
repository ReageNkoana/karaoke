// ==================== SONG DATABASE ====================
const SONGS = {
    "little-things-manana": {
        name: "Little Things - Manana",
        folder: "little-things-manana",
        mp3: "assets/little-things-manana/little-things-manana.mp3",
        displayName: "🌸 Little Things - Manana",
        coverEmoji: "🌸",
        lyricsCache: null
    },
    "isililo-sothando": {
        name: "Isililo soThando - Manana ft. Thando Zide",
        folder: "isililo-soThando-Manana",
        mp3: "assets/isililo-soThando-Manana/isililo-soThando-Manana.mp3",
        displayName: "🕯️ Isililo soThando",
        coverEmoji: "🕯️",
        lyricsCache: null
    },
    "raindance-dave-tems": {
        name: "Raindance - Dave & Tems",
        folder: "raindance-dave and tems",
        mp3: "assets/raindance-dave and tems/Dave-Raindance-ft-Tems.mp3",
        displayName: "🌧️ Raindance - Dave & Tems",
        coverEmoji: "🌧️",
        lyricsCache: null
    },
    "me-and-u-tems": {
        name: "Me & U - Tems",
        folder: "me-and-you-tems",
        mp3: "assets/me-and-you-tems/me-and-u.mp3",
        displayName: "💙 Me & U - Tems",
        coverEmoji: "💙",
        lyricsCache: null
    },
    "damn-kanye": {
        name: "Damn - Kanye West",
        folder: "damn-kanye",
        mp3: "assets/damn-kanye/damn-kanye.mp3",
        displayName: "🎧 Damn - Kanye West",
        coverEmoji: "🔥",
        lyricsCache: null
    }
};

const songIds = ["little-things-manana", "isililo-sothando", "raindance-dave-tems", "me-and-u-tems", "damn-kanye"];
let currentIndex = 0;
let currentSongId = songIds[0];
let audio = null;
let lyricsLoop = null;
let isKaraokePlaying = false;
let currentLyricIdx = 0;
let activeLyricsArray = [];
let progressUpdateInterval = null;
let isDraggingProgress = false;

// DOM elements
const carouselContainer = document.getElementById('carouselContainer');
const pickerStage = document.getElementById('pickerStage');
const transitionOverlay = document.getElementById('transitionOverlay');
const karaokeScreen = document.getElementById('karaokeScreen');
const karaokeSongTitleSpan = document.getElementById('karaokeSongTitle');
const currentLyricSlide = document.getElementById('currentLyricSlide');
const lyric1Slide = document.getElementById('lyric1Slide');
const lyric2Slide = document.getElementById('lyric2Slide');
const lyric3Slide = document.getElementById('lyric3Slide');
const playPauseBtn = document.getElementById('playPauseBtn');
const exitKaraokeBtn = document.getElementById('exitKaraokeBtn');
const bgVideo = document.getElementById('bgVideo');
const videoThemeSelect = document.getElementById('videoThemeSelect');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const durationDisplay = document.getElementById('durationDisplay');

// ==================== VIDEO BACKGROUND CONTROL ====================
videoThemeSelect.addEventListener('change', function() {
    const selectedVideo = this.value;
    if (bgVideo) {
        const wasPlaying = isKaraokePlaying;
        bgVideo.pause();
        bgVideo.src = selectedVideo;
        bgVideo.load();
        if (wasPlaying && isKaraokePlaying) {
            bgVideo.play().catch(e => console.log("Video autoplay prevented:", e));
        } else {
            bgVideo.muted = true;
            bgVideo.play().catch(e => console.log("Video muted autoplay:", e));
        }
    }
});

// Sync video pause with audio pause
function syncVideoWithAudio() {
    if (audio) {
        if (audio.paused || !isKaraokePlaying) {
            bgVideo.pause();
        } else {
            bgVideo.play().catch(e => console.log("Video play error:", e));
        }
    }
}

// ==================== PROGRESS BAR AND TIMESTAMP ====================
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateProgressAndTime() {
    if (audio && audio.src && !isNaN(audio.duration) && audio.duration !== Infinity && !isDraggingProgress) {
        const currentTime = audio.currentTime;
        const duration = audio.duration;
        const percent = (currentTime / duration) * 100;
        progressBar.style.width = `${percent}%`;
        currentTimeDisplay.innerText = formatTime(currentTime);
        durationDisplay.innerText = formatTime(duration);
    } else if (audio && audio.src) {
        currentTimeDisplay.innerText = formatTime(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration)) {
            durationDisplay.innerText = formatTime(audio.duration);
        }
    }
}

function startProgressUpdates() {
    if (progressUpdateInterval) clearInterval(progressUpdateInterval);
    progressUpdateInterval = setInterval(() => {
        if (audio && !isDraggingProgress) {
            updateProgressAndTime();
        }
    }, 100);
}

function stopProgressUpdates() {
    if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
        progressUpdateInterval = null;
    }
}

// Progress bar seek functionality
function setupProgressSeek() {
    if (!progressContainer) return;
    
    const handleSeek = (e) => {
        if (!audio || !audio.duration || isNaN(audio.duration)) return;
        
        const rect = progressContainer.getBoundingClientRect();
        let clientX;
        
        if (e.type === 'mousemove' || e.type === 'mouseup') {
            clientX = e.clientX;
        } else if (e.type === 'touchmove' || e.type === 'touchend') {
            clientX = e.touches[0].clientX;
        } else if (e.type === 'click') {
            clientX = e.clientX;
        } else {
            return;
        }
        
        let clickX = clientX - rect.left;
        clickX = Math.max(0, Math.min(clickX, rect.width));
        const percent = clickX / rect.width;
        const seekTime = percent * audio.duration;
        
        audio.currentTime = seekTime;
        updateProgressAndTime();
        
        // Update lyrics immediately based on new time
        if (activeLyricsArray && activeLyricsArray.length) {
            let newIdx = 0;
            for (let i = activeLyricsArray.length - 1; i >= 0; i--) {
                if (seekTime >= activeLyricsArray[i].time) { newIdx = i; break; }
            }
            if (newIdx !== currentLyricIdx) {
                currentLyricIdx = newIdx;
                updateFourLyricsSlide(currentLyricIdx);
            }
        }
    };
    
    const onMouseDown = (e) => {
        isDraggingProgress = true;
        handleSeek(e);
        
        const onMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            handleSeek(moveEvent);
        };
        
        const onMouseUp = () => {
            isDraggingProgress = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    const onTouchStart = (e) => {
        isDraggingProgress = true;
        handleSeek(e);
        
        const onTouchMove = (moveEvent) => {
            moveEvent.preventDefault();
            handleSeek(moveEvent);
        };
        
        const onTouchEnd = () => {
            isDraggingProgress = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    };
    
    progressContainer.addEventListener('click', handleSeek);
    progressContainer.addEventListener('mousedown', onMouseDown);
    progressContainer.addEventListener('touchstart', onTouchStart);
}

// ==================== LOAD LYRICS FROM JSON ====================
async function loadLyricsFromJSON(songId) {
    const song = SONGS[songId];
    if (!song) return null;
    if (song.lyricsCache) return song.lyricsCache;
    
    const jsonPath = `assets/${song.folder}/lyrics.json`;
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        let lyricsArray = data.lyrics || data;
        if (!Array.isArray(lyricsArray)) throw new Error("Invalid format");
        
        const formatted = lyricsArray.map(line => ({
            time: line.time || 0,
            text: line.text || "♪"
        }));
        song.lyricsCache = formatted;
        return formatted;
    } catch(error) {
        console.error("Error loading lyrics:", error);
        const fallback = [
            { time: 0, text: "🎤 " + song.displayName },
            { time: 5, text: "♪ Could not load lyrics" },
            { time: 10, text: "🎶 But you can still sing!" }
        ];
        song.lyricsCache = fallback;
        return fallback;
    }
}

// ==================== UPDATE 4 LYRICS WITH SMOOTH SLIDE ====================
function updateFourLyricsSlide(currentIdx) {
    if (!activeLyricsArray || !activeLyricsArray.length) {
        currentLyricSlide.innerText = "✨ No lyrics loaded ✨";
        lyric1Slide.innerText = "🎤 tap play";
        lyric2Slide.innerText = "🎶 enjoy";
        lyric3Slide.innerText = "✨";
        return;
    }
    
    const current = activeLyricsArray[currentIdx];
    const next1 = activeLyricsArray[currentIdx + 1];
    const next2 = activeLyricsArray[currentIdx + 2];
    const next3 = activeLyricsArray[currentIdx + 3];
    
    const updateWithSlide = (element, newText) => {
        if (element.innerText !== newText) {
            element.classList.add('slide-out');
            setTimeout(() => {
                element.innerText = newText;
                element.classList.remove('slide-out');
                element.classList.add('slide-in');
                setTimeout(() => {
                    element.classList.remove('slide-in');
                }, 550);
            }, 200);
        }
    };
    
    if (current) updateWithSlide(currentLyricSlide, current.text);
    if (next1) updateWithSlide(lyric1Slide, next1.text);
    else updateWithSlide(lyric1Slide, "🎶 🎶 🎶");
    
    if (next2) updateWithSlide(lyric2Slide, next2.text);
    else updateWithSlide(lyric2Slide, "✨ 🎵 ✨");
    
    if (next3) updateWithSlide(lyric3Slide, next3.text);
    else updateWithSlide(lyric3Slide, "🎤 keep singing");
}

// ==================== BUILD CARDS WITH MOUSE DRAG SUPPORT ====================
function buildCards() {
    carouselContainer.innerHTML = '';
    songIds.forEach((sid, idx) => {
        const song = SONGS[sid];
        const card = document.createElement('div');
        card.className = 'song-card';
        if (idx === currentIndex) card.classList.add('active-center');
        else if (idx === currentIndex - 1) card.classList.add('prev-card');
        else if (idx === currentIndex + 1) card.classList.add('next-card');
        else card.style.display = 'none';
        card.setAttribute('data-idx', idx);
        card.setAttribute('data-songid', sid);
        card.innerHTML = `
            <div class="song-cover">${song.coverEmoji}</div>
            <div class="song-title">${song.displayName.length > 28 ? song.displayName.substring(0,25)+'..' : song.displayName}</div>
            <div class="song-artist">${song.name.split('-')[0] || 'Artist'}</div>
            <div class="swipe-hint" style="font-size:0.7rem;">🎤 tap to sing 🎤</div>
        `;
        card.addEventListener('click', async (e) => {
            e.stopPropagation();
            createRipple(e, card);
            currentSongId = card.getAttribute('data-songid');
            await launchKaraokeWithSong(currentSongId);
        });
        carouselContainer.appendChild(card);
    });
    attachDragListeners();
}

function createRipple(event, element) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    ripple.style.width = ripple.style.height = `${size}px`;
    let clientX, clientY;
    if (event.touches) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    const x = clientX - rect.left - size/2;
    const y = clientY - rect.top - size/2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.position = 'absolute';
    element.style.position = 'relative';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function updateCardsPosition() {
    const cards = document.querySelectorAll('.song-card');
    cards.forEach((card) => {
        const cardIdx = parseInt(card.getAttribute('data-idx'));
        card.classList.remove('active-center', 'prev-card', 'next-card');
        card.style.display = 'flex';
        if (cardIdx === currentIndex) card.classList.add('active-center');
        else if (cardIdx === currentIndex - 1) card.classList.add('prev-card');
        else if (cardIdx === currentIndex + 1) card.classList.add('next-card');
        else card.style.display = 'none';
    });
}

// Drag/Swipe for both mobile and desktop
let dragStartX = 0;
let isDragging = false;

function attachDragListeners() {
    const container = carouselContainer;
    
    const onDragStart = (e) => {
        if (e.type === 'mousedown') {
            dragStartX = e.clientX;
            isDragging = true;
            container.style.cursor = 'grabbing';
            e.preventDefault();
        } else if (e.type === 'touchstart') {
            dragStartX = e.touches[0].clientX;
            isDragging = true;
        }
    };
    
    const onDragMove = (e) => {
        if (!isDragging) return;
        let currentX;
        if (e.type === 'mousemove') {
            currentX = e.clientX;
        } else if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
        } else {
            return;
        }
        
        const diff = currentX - dragStartX;
        const activeCard = document.querySelector('.song-card.active-center');
        if (activeCard && Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex > 0) {
                currentIndex--;
                updateCardsPosition();
                isDragging = false;
            } else if (diff < 0 && currentIndex < songIds.length - 1) {
                currentIndex++;
                updateCardsPosition();
                isDragging = false;
            }
            dragStartX = currentX;
        }
    };
    
    const onDragEnd = () => {
        isDragging = false;
        container.style.cursor = 'grab';
    };
    
    container.style.cursor = 'grab';
    container.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    container.addEventListener('touchstart', onDragStart);
    window.addEventListener('touchmove', onDragMove);
    window.addEventListener('touchend', onDragEnd);
}

// ==================== KARAOKE LAUNCH ====================
async function launchKaraokeWithSong(songId) {
    const song = SONGS[songId];
    if (!song) return;
    
    currentLyricSlide.innerText = "📖 Loading lyrics...";
    lyric1Slide.innerText = "Please wait";
    lyric2Slide.innerText = "✨";
    lyric3Slide.innerText = "🎵";
    
    activeLyricsArray = await loadLyricsFromJSON(songId);
    if (!activeLyricsArray.length) activeLyricsArray = [{ time: 0, text: "🎤 Sing!" }];
    
    if (audio) { 
        audio.pause(); 
        audio.src = ''; 
        if (lyricsLoop) cancelAnimationFrame(lyricsLoop); 
    }
    stopProgressUpdates();
    
    transitionOverlay.style.opacity = '1';
    setTimeout(() => {
        pickerStage.style.transition = 'opacity 0.5s';
        pickerStage.style.opacity = '0';
        setTimeout(() => {
            pickerStage.style.display = 'none';
            karaokeScreen.classList.add('active');
            karaokeSongTitleSpan.innerText = song.displayName;
            
            audio = new Audio();
            audio.src = song.mp3;
            audio.loop = false;
            audio.volume = 0.7;
            
            audio.addEventListener('pause', syncVideoWithAudio);
            audio.addEventListener('play', syncVideoWithAudio);
            audio.addEventListener('ended', () => {
                isKaraokePlaying = false;
                playPauseBtn.innerHTML = '▶';
                if (progressUpdateInterval) clearInterval(progressUpdateInterval);
            });
            
            currentLyricIdx = 0;
            isKaraokePlaying = false;
            playPauseBtn.innerHTML = '▶';
            if (lyricsLoop) cancelAnimationFrame(lyricsLoop);
            updateFourLyricsSlide(0);
            
            audio.addEventListener('loadedmetadata', () => {
                durationDisplay.innerText = formatTime(audio.duration);
                progressBar.style.width = '0%';
                currentTimeDisplay.innerText = '0:00';
            });
            
            transitionOverlay.style.opacity = '0';
            
            const currentTheme = videoThemeSelect.value;
            bgVideo.src = currentTheme;
            bgVideo.load();
            bgVideo.muted = true;
            bgVideo.play().catch(e => console.log("Video autoplay:", e));
            
            startProgressUpdates();
            setupProgressSeek();
        }, 450);
    }, 80);
    transitionOverlay.style.opacity = '1';
    setTimeout(() => { transitionOverlay.style.opacity = '0'; }, 1000);
}

function startLyricsTimer() {
    if (!activeLyricsArray.length) return;
    if (lyricsLoop) cancelAnimationFrame(lyricsLoop);
    
    function updateLyricsByTime() {
        if (!isKaraokePlaying) {
            lyricsLoop = requestAnimationFrame(updateLyricsByTime);
            return;
        }
        
        let currentTime = 0;
        if (audio && audio.src && !audio.paused && !isNaN(audio.currentTime)) {
            currentTime = audio.currentTime;
        } else {
            lyricsLoop = requestAnimationFrame(updateLyricsByTime);
            return;
        }
        
        let newIdx = 0;
        for (let i = activeLyricsArray.length - 1; i >= 0; i--) {
            if (currentTime >= activeLyricsArray[i].time) { newIdx = i; break; }
        }
        
        if (newIdx !== currentLyricIdx) {
            currentLyricIdx = newIdx;
            updateFourLyricsSlide(currentLyricIdx);
            currentLyricSlide.style.transform = 'scale(1.02)';
            setTimeout(() => { if(currentLyricSlide) currentLyricSlide.style.transform = ''; }, 250);
        }
        lyricsLoop = requestAnimationFrame(updateLyricsByTime);
    }
    lyricsLoop = requestAnimationFrame(updateLyricsByTime);
}

function stopKaraokeAndExit() {
    if (audio) { 
        audio.pause(); 
        audio.currentTime = 0;
        audio.removeEventListener('pause', syncVideoWithAudio);
        audio.removeEventListener('play', syncVideoWithAudio);
    }
    if (lyricsLoop) cancelAnimationFrame(lyricsLoop);
    isKaraokePlaying = false;
    lyricsLoop = null; 
    stopProgressUpdates();
    
    if (bgVideo) {
        bgVideo.pause();
    }
    
    transitionOverlay.style.opacity = '1';
    karaokeScreen.classList.remove('active');
    setTimeout(() => {
        pickerStage.style.display = 'flex';
        pickerStage.style.opacity = '1';
        transitionOverlay.style.opacity = '0';
        if (audio) { audio = null; }
        // Reset carousel position to ensure cards are properly aligned
        updateCardsPosition();
    }, 500);
}

// Combined Play/Pause button functionality
playPauseBtn.addEventListener('click', () => {
    if (!audio) return;
    
    if (isKaraokePlaying && !audio.paused) {
        audio.pause();
        isKaraokePlaying = false;
        playPauseBtn.innerHTML = '▶';
        syncVideoWithAudio();
    } else {
        audio.play().catch(e => console.log("playback note:", e));
        isKaraokePlaying = true;
        playPauseBtn.innerHTML = '⏸';
        if (!lyricsLoop) startLyricsTimer();
        syncVideoWithAudio();
        
        if (audio.ended) {
            audio.currentTime = 0;
            currentLyricIdx = 0;
            updateFourLyricsSlide(0);
            audio.play();
        }
    }
});

exitKaraokeBtn.addEventListener('click', () => { stopKaraokeAndExit(); });

// Floating notes
function createFloatingNotes() {
    const bg = document.getElementById('floatingBg');
    setInterval(() => {
        const note = document.createElement('div');
        note.innerHTML = ['♪', '♫', '🎵', '🎶'][Math.floor(Math.random() * 4)];
        note.className = 'music-note';
        note.style.left = Math.random() * 100 + '%';
        note.style.fontSize = (18 + Math.random() * 28) + 'px';
        note.style.animationDuration = (4 + Math.random() * 6) + 's';
        note.style.opacity = 0.2 + Math.random() * 0.3;
        bg.appendChild(note);
        setTimeout(() => note.remove(), 9000);
    }, 700);
}

buildCards();
createFloatingNotes();

if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.play().catch(e => console.log("Initial video play:", e));
}