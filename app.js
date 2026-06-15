/* ----------------------------------------------------
   ROMANTIC MUSIC PLAYER & CONFIGURATION ENGINE
   ---------------------------------------------------- */

// Web Audio API Generative Synth State
let audioCtx = null;
let synthInterval = null;
let ambientNodes = [];
let isSynthPlaying = false;
let synthTimeElapsed = 0;
let synthDuration = 225; // 3 minutes 45 seconds (225 seconds)

// Audio Preset URLs (High Quality Royalty Free Acoustic / Cinematic Tracks)
const PRESET_TRACKS = {
  'preset-1': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Stable fallback demo track
  'preset-2': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'  // Stable fallback demo track 2
};

// Application State
const state = {
  isPlaying: false,
  isShuffle: false,
  repeatState: 0, // 0 = Off, 1 = Repeat One, 2 = Repeat All
  activeTrackType: 'procedural', // 'procedural', 'preset-1', 'preset-2', 'custom-url', 'custom-file'
  customAudioUrl: '',
  customAudioFile: null, // DataURL
  activeCoverType: 'default', // 'default', 'custom-url', 'custom-file'
  customImageUrl: '',
  customImageFile: null, // DataURL
  
  // Custom text options
  giftHeader: 'A Gift for You',
  songTitle: 'Our Special Song',
  songArtist: 'From Me to You',
  dedicationText: 'token of my love for you.'
};

// DOM Elements
const dom = {
  bokehContainer: document.getElementById('bokeh-container'),
  giftHeaderText: document.getElementById('gift-header-text'),
  songTitle: document.getElementById('song-title'),
  songArtist: document.getElementById('song-artist'),
  dedicationText: document.getElementById('dedication-text'),
  
  // Multi-View System
  viewHome: document.getElementById('view-home'),
  viewPlayer: document.getElementById('view-player'),
  interactiveGiftbox: document.getElementById('interactive-giftbox'),
  
  // Bottom Navigation & Toast
  navHome: document.getElementById('nav-home'),
  navPlayer: document.getElementById('nav-player'),
  navShare: document.getElementById('nav-share'),
  toastNotification: document.getElementById('toast-notification'),
  
  // Player Card UI
  playerCard: document.querySelector('.player-card'),
  audioPlayer: document.getElementById('audio-player'),
  
  // Slideshow
  slideshowWrapper: document.getElementById('slideshow-wrapper'),
  
  // Controls
  playBtn: document.getElementById('play-btn'),
  playIcon: document.getElementById('play-icon'),
  pauseIcon: document.getElementById('pause-icon'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  shuffleBtn: document.getElementById('shuffle-btn'),
  repeatBtn: document.getElementById('repeat-btn'),
  repeatBadge: document.getElementById('repeat-badge'),
  
  // Seek bar
  seekbarTrack: document.querySelector('.seekbar-track-wrapper'),
  seekbarProgress: document.getElementById('seekbar-progress-bar'),
  timeElapsed: document.getElementById('time-elapsed'),
  timeTotal: document.getElementById('time-total'),
  
  // Modal & Settings Form
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  resetDefaultBtn: document.getElementById('reset-default-btn'),
  
  // Form fields
  inputGiftHeader: document.getElementById('input-gift-header'),
  inputSongTitle: document.getElementById('input-song-title'),
  inputSongArtist: document.getElementById('input-song-artist'),
  inputDedication: document.getElementById('input-dedication'),
  
  inputTrackSelect: document.getElementById('input-track-select'),
  customAudioUrlGroup: document.getElementById('custom-audio-url-group'),
  inputAudioUrl: document.getElementById('input-audio-url'),
  customAudioFileGroup: document.getElementById('custom-audio-file-group'),
  inputAudioFile: document.getElementById('input-audio-file'),
  audioFileInfo: document.getElementById('audio-file-info'),
  
  inputCoverSelect: document.getElementById('input-cover-select'),
  customImageUrlGroup: document.getElementById('custom-image-url-group'),
  inputImageUrl: document.getElementById('input-image-url'),
  customImageFileGroup: document.getElementById('custom-image-file-group'),
  inputImageFile: document.getElementById('input-image-file'),
  imageFileInfo: document.getElementById('image-file-info')
};

/* ----------------------------------------------------
   INITIALIZATION & STORAGE
   ---------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initBokehBackground();
  loadSettings();
  setupEventListeners();
  updateTimeDisplay(0, synthDuration);
  initSlideshow();
});

// Load settings from localStorage
function loadSettings() {
  const savedState = localStorage.getItem('romantic_gift_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      Object.assign(state, parsed);
      
      // Update Texts
      dom.giftHeaderText.textContent = state.giftHeader;
      dom.songTitle.textContent = state.songTitle;
      dom.songArtist.textContent = state.songArtist;
      dom.dedicationText.textContent = state.dedicationText;
      
      // Populate fields
      dom.inputGiftHeader.value = state.giftHeader;
      dom.inputSongTitle.value = state.songTitle;
      dom.inputSongArtist.value = state.songArtist;
      dom.inputDedication.value = state.dedicationText;
      
      dom.inputTrackSelect.value = state.activeTrackType;
      dom.inputAudioUrl.value = state.customAudioUrl;
      
      dom.inputCoverSelect.value = state.activeCoverType;
      dom.inputImageUrl.value = state.customImageUrl;
      
      // Cover image settings preserved for compatibility but slideshow is now fixed
      
      // Load Custom Audio info
      if (state.customAudioFile) {
        dom.audioFileInfo.textContent = "Custom audio file ready";
      }
      
      toggleFormGroups();
    } catch (e) {
      console.error("Error loading localStorage settings:", e);
    }
  } else {
    // Fill default values in form
    dom.inputGiftHeader.value = state.giftHeader;
    dom.inputSongTitle.value = state.songTitle;
    dom.inputSongArtist.value = state.songArtist;
    dom.inputDedication.value = state.dedicationText;
  }
}

// Save settings to localStorage
function saveSettings() {
  state.giftHeader = dom.inputGiftHeader.value || 'A Gift for You';
  state.songTitle = dom.inputSongTitle.value || 'Our Special Song';
  state.songArtist = dom.inputSongArtist.value || 'From Me to You';
  state.dedicationText = dom.inputDedication.value || 'token of my love for you.';
  
  state.activeTrackType = dom.inputTrackSelect.value;
  state.customAudioUrl = dom.inputAudioUrl.value;
  
  state.activeCoverType = dom.inputCoverSelect.value;
  state.customImageUrl = dom.inputImageUrl.value;
  
  // Store text and dropdown states
  const serializableState = { ...state };
  // Don't save huge audio DataURL in localStorage if it exceeds storage caps
  if (serializableState.customAudioFile && serializableState.customAudioFile.length > 2000000) {
    serializableState.customAudioFile = null; // Remove if too big, keep loaded in memory
  }
  
  localStorage.setItem('romantic_gift_state', JSON.stringify(serializableState));
  
  // Apply changes to UI immediately
  dom.giftHeaderText.textContent = state.giftHeader;
  dom.songTitle.textContent = state.songTitle;
  dom.songArtist.textContent = state.songArtist;
  dom.dedicationText.textContent = state.dedicationText;
  
  // Slideshow photos are fixed, no cover art change needed
  
  // Stop current playing audio to switch sources cleanly
  if (state.isPlaying) {
    togglePlayPause();
  }
  
  closeModal();
}

/* ----------------------------------------------------
   EVENT LISTENERS SETUP
   ---------------------------------------------------- */
function setupEventListeners() {
  // Play button click
  dom.playBtn.addEventListener('click', togglePlayPause);
  
  // Seek bar native progress
  dom.audioPlayer.addEventListener('timeupdate', handleNativeTimeUpdate);
  dom.audioPlayer.addEventListener('ended', handleTrackEnded);
  dom.seekbarTrack.addEventListener('click', handleSeekbarClick);
  
  // Controls
  dom.repeatBtn.addEventListener('click', toggleRepeat);
  dom.shuffleBtn.addEventListener('click', toggleShuffle);
  dom.nextBtn.addEventListener('click', triggerNextPrevTrack);
  dom.prevBtn.addEventListener('click', triggerNextPrevTrack);
  
  // Settings modal
  dom.settingsBtn.addEventListener('click', openModal);
  dom.modalCloseBtn.addEventListener('click', closeModal);
  dom.saveSettingsBtn.addEventListener('click', saveSettings);
  dom.resetDefaultBtn.addEventListener('click', resetToDefaults);
  dom.settingsModal.addEventListener('click', handleModalOverlayClick);
  
  dom.inputTrackSelect.addEventListener('change', toggleFormGroups);
  dom.inputCoverSelect.addEventListener('change', toggleFormGroups);
  
  // Custom file upload handlers
  dom.inputAudioFile.addEventListener('change', handleAudioFileUpload);
  dom.inputImageFile.addEventListener('change', handleImageFileUpload);
  
  // Space bar play trigger
  document.addEventListener('keydown', handleGlobalKeydown);
  
  // ====================================================
  // VIEW SWITCHING & INTERACTION LOGIC
  // ====================================================
  
  // Gift Box Open Surprise Click
  dom.interactiveGiftbox.addEventListener('click', handleGiftboxClick);
  
  // Bottom Navigation tab buttons
  dom.navHome.addEventListener('click', () => switchView('home'));
  dom.navPlayer.addEventListener('click', () => switchView('player'));
  dom.navShare.addEventListener('click', handleShareAction);
}

/* ----------------------------------------------------
   BOKEH & PARTICLES STYLISTICS
   ---------------------------------------------------- */
function initBokehBackground() {
  const colors = [
    'rgba(248, 207, 108, 0.16)', // soft warm gold
    'rgba(255, 179, 176, 0.14)', // soft rose pink
    'rgba(6, 68, 48, 0.22)',     // forest green
    'rgba(25, 99, 74, 0.12)'     // emerald green
  ];
  
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.classList.add('bokeh-particle');
    
    const size = Math.random() * 200 + 150; // 150px - 350px
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.background = colors[i % colors.length];
    
    p.style.top = `${Math.random() * 80 + 5}%`;
    p.style.left = `${Math.random() * 80 + 5}%`;
    
    // Staggered slow float animation speeds
    p.style.animationDuration = `${Math.random() * 20 + 20}s`;
    p.style.animationDelay = `-${Math.random() * 25}s`;
    
    dom.bokehContainer.appendChild(p);
  }
}

/* ----------------------------------------------------
   VIEW CONTROLLER & SURPRISE OPEN ANIMATION
   ---------------------------------------------------- */
// Switch smoothly between Home view and Player view
function switchView(viewName) {
  // Update nav active tab highlights
  dom.navHome.classList.toggle('active', viewName === 'home');
  dom.navPlayer.classList.toggle('active', viewName === 'player');
  
  if (viewName === 'home') {
    // Fade out player and fade in home
    dom.viewPlayer.classList.add('hidden-view');
    dom.viewPlayer.classList.remove('active-view');
    
    dom.viewHome.classList.remove('hidden-view');
    dom.viewHome.classList.add('active-view');
    
    // Reset the giftbox open status so they can tap it again
    dom.interactiveGiftbox.classList.remove('open');
    
    // Stop playback when returning home for a peaceful experience
    if (state.isPlaying) {
      togglePlayPause();
    }
  } else {
    // Fade out home and fade in player
    dom.viewHome.classList.add('hidden-view');
    dom.viewHome.classList.remove('active-view');
    
    dom.viewPlayer.classList.remove('hidden-view');
    dom.viewPlayer.classList.add('active-view');
  }
}

// Hand Gift surprise opening animation
function handleGiftboxClick() {
  if (dom.interactiveGiftbox.classList.contains('open')) return;
  
  // 1. Trigger CSS Pop/Lift Lid & Untie ribbon
  dom.interactiveGiftbox.classList.add('open');
  
  // 2. Spawn Spectacular Golden Spark Particles
  spawnGiftSparks(25);
  
  // 3. Spawn floating love hearts bursting out of the gift
  spawnLoveHearts(15);
  
  // 3. Smoothly Transition View from Gift Box to Music Player (750ms delay)
  setTimeout(() => {
    switchView('player');
    
    // 4. Auto-Play: drop the mechanical tonearm and play the music!
    if (!state.isPlaying) {
      togglePlayPause();
    }
  }, 750);
}

// Spawn beautiful random golden floating sparks on box opening
function spawnGiftSparks(count) {
  const rect = dom.interactiveGiftbox.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.classList.add('open-spark');
    
    // Position at center of gift box
    spark.style.left = `${originX}px`;
    spark.style.top = `${originY}px`;
    
    // Set random velocity displacements
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 180 + 70;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 40; // Bias upwards slightly
    
    spark.style.setProperty('--tx', `${tx}px`);
    spark.style.setProperty('--ty', `${ty}px`);
    
    // Random sizes and speed delays
    const size = Math.random() * 6 + 6;
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.animationDelay = `${Math.random() * 0.15}s`;
    
    document.body.appendChild(spark);
    
    // Garbage collection of completed spark DOMs
    setTimeout(() => {
      spark.remove();
    }, 1300);
  }
}

// Spawn floating love hearts bursting out of the gift box
function spawnLoveHearts(count) {
  const rect = dom.interactiveGiftbox.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  
  const heartEmojis = ['❤️', '💕', '💖', '💗', '💘', '💝', '🩷', '🤍'];
  
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('div');
    heart.classList.add('open-heart');
    heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    
    // Position at center of gift box
    heart.style.left = `${originX}px`;
    heart.style.top = `${originY}px`;
    
    // Random upward & outward burst direction
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 200 + 80;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 60; // Bias upwards
    const rot = (Math.random() - 0.5) * 90; // Random rotation
    const size = Math.random() * 16 + 18; // 18px - 34px
    
    heart.style.setProperty('--tx', `${tx}px`);
    heart.style.setProperty('--ty', `${ty}px`);
    heart.style.setProperty('--rot', `${rot}deg`);
    heart.style.setProperty('--sz', `${size}px`);
    heart.style.animationDelay = `${Math.random() * 0.25}s`;
    
    document.body.appendChild(heart);
    
    // Garbage collection
    setTimeout(() => {
      heart.remove();
    }, 1900);
  }
}

// Native Share trigger or toast fallback copy-to-clipboard
function handleShareAction() {
  if (navigator.share) {
    navigator.share({
      title: state.giftHeader,
      text: `🎁 ${state.songTitle} - ${state.songArtist}. Buka hadiah kejutan spesial untukmu di sini!`,
      url: window.location.href
    }).catch(console.error);
  } else {
    // Fallback Clipboard copy
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        // Toggle beautiful Toast Notification
        dom.toastNotification.classList.remove('hidden');
        dom.toastNotification.classList.add('visible');
        
        setTimeout(() => {
          dom.toastNotification.classList.remove('visible');
          setTimeout(() => dom.toastNotification.classList.add('hidden'), 500);
        }, 2500);
      })
      .catch(err => {
        console.error("Failed to copy gift URL: ", err);
      });
  }
}

/* ----------------------------------------------------
   GENERATIVE OFF-LINE MUSIC SYNTHESIZER
   ---------------------------------------------------- */
function initAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Generate romantic ambient piano chords & vinyl atmospheric sound
function playGenerativeSynth() {
  initAudioCtx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  isSynthPlaying = true;
  synthTimeElapsed = 0;
  
  // 1. Vinyl Crackle Generator
  const crackleNode = createVinylCrackleNode();
  if (crackleNode) {
    crackleNode.connect(audioCtx.destination);
    ambientNodes.push(crackleNode);
  }
  
  // 2. Slow Soft Chords Progression
  // Jazzy Romantic progression: Cmaj7 -> Am9 -> Fmaj7 -> G9sus4
  const chords = [
    [130.81, 196.00, 246.94, 329.63], // Cmaj7 (C3, G3, B3, E4)
    [110.00, 196.00, 261.63, 329.63], // Am9 (A2, G3, C4, E4)
    [87.31,  174.61, 261.63, 329.63], // Fmaj7 (F2, A3, C4, E4)
    [98.00,  174.61, 246.94, 293.66]  // G7/9 (G2, F3, B3, D4)
  ];
  
  let chordIndex = 0;
  
  // Arpeggiate and play a chord every 5 seconds
  function playNextChord() {
    if (!isSynthPlaying) return;
    const currentChord = chords[chordIndex];
    const now = audioCtx.currentTime;
    
    // Play each note in the chord with a soft dream arpeggiation delay
    currentChord.forEach((freq, idx) => {
      triggerRhodesPianoNote(freq, now + idx * 0.15);
    });
    
    chordIndex = (chordIndex + 1) % chords.length;
  }
  
  playNextChord();
  synthInterval = setInterval(playNextChord, 5000);
  
  // Mock Playback Interval for Progress updates
  const timer = setInterval(() => {
    if (!state.isPlaying || !isSynthPlaying) {
      clearInterval(timer);
      return;
    }
    
    synthTimeElapsed += 1;
    
    if (synthTimeElapsed >= synthDuration) {
      synthTimeElapsed = 0;
      if (state.repeatState === 1) {
        // Repeat one: just keep playing
      } else if (state.repeatState === 2 || state.repeatState === 0) {
        // Repeat all/off: reset or go to start
        if (state.repeatState === 0) {
          togglePlayPause();
          synthTimeElapsed = 0;
        }
      }
    }
    
    updateProgressBar(synthTimeElapsed, synthDuration);
    updateTimeDisplay(synthTimeElapsed, synthDuration);
  }, 1000);
}

// Stop Web Audio Synthesizer
function stopGenerativeSynth() {
  isSynthPlaying = false;
  if (synthInterval) {
    clearInterval(synthInterval);
    synthInterval = null;
  }
  // Stop & disconnect nodes
  ambientNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  ambientNodes = [];
}

// Custom low-frequency synthesizer with soft envelope mimicking Rhodes piano
function triggerRhodesPianoNote(frequency, startTime) {
  if (!audioCtx || !isSynthPlaying) return;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  // Sweet sine + subtle triangle warm harmonics
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, startTime);
  
  // Warm low-pass filter to sound soft and vintage
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, startTime);
  filter.Q.setValueAtTime(1, startTime);
  
  // Amp Envelope
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.4); // soft attack
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 4.5); // long release
  
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + 5.0);
  
  // Clean references
  osc.onended = () => {
    osc.disconnect();
    filter.disconnect();
    gainNode.disconnect();
  };
}

// Procedural Vinyl Crackle & Rain background
function createVinylCrackleNode() {
  if (!audioCtx) return null;
  
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise loop
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    // Rain/Pinkish constant background noise
    let noise = Math.random() * 2 - 1;
    // Add periodic vinyl static pops & crackles
    if (Math.random() > 0.9997) {
      noise += (Math.random() > 0.5 ? 0.75 : -0.75); // static pop impulse
    }
    data[i] = noise * 0.015; // keep it subtle
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  
  // Filter crackle to fit high-mid frequency pop and low-cut bass
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
  filter.Q.setValueAtTime(0.6, audioCtx.currentTime);
  
  source.connect(filter);
  filter.connect(audioCtx.destination);
  source.start(0);
  
  return source;
}

/* ----------------------------------------------------
   AUDIO PLAYBACK CONTROLLER
   ---------------------------------------------------- */
function togglePlayPause() {
  if (state.isPlaying) {
    // PAUSE SEQUENCE
    state.isPlaying = false;
    
    // 1. Lift needle tonearm off record FIRST
    dom.playerCard.classList.remove('playing');
    
    // 2. Pause audio after arm sweeps out (600ms)
    setTimeout(() => {
      if (!state.isPlaying) {
        if (state.activeTrackType === 'procedural') {
          stopGenerativeSynth();
        } else {
          dom.audioPlayer.pause();
        }
        updateButtonStates();
      }
    }, 600);
    
  } else {
    // PLAY SEQUENCE
    state.isPlaying = true;
    updateButtonStates();
    
    // 1. Move needle tonearm onto record
    dom.playerCard.classList.add('playing');
    
    // 2. Play audio after needle drops onto the record (700ms)
    setTimeout(() => {
      if (state.isPlaying) {
        if (state.activeTrackType === 'procedural') {
          playGenerativeSynth();
        } else {
          playAudioElement();
        }
      }
    }, 700);
  }
}

// Safe play invocation for HTML5 Audio element
function playAudioElement() {
  // Config audio element source if needed
  let trackSrc = '';
  
  if (state.activeTrackType === 'custom-file' && state.customAudioFile) {
    trackSrc = state.customAudioFile;
  } else if (state.activeTrackType === 'custom-url' && state.customAudioUrl) {
    trackSrc = state.customAudioUrl;
  } else if (PRESET_TRACKS[state.activeTrackType]) {
    trackSrc = PRESET_TRACKS[state.activeTrackType];
  }
  
  if (dom.audioPlayer.src !== trackSrc) {
    dom.audioPlayer.src = trackSrc;
    dom.audioPlayer.load();
  }
  
  initAudioCtx(); // Make sure user interaction has initialized AudioContext
  dom.audioPlayer.play()
    .catch(e => {
      console.warn("Autoplay blocked or audio load error. Resetting visual state.", e);
      state.isPlaying = false;
      dom.playerCard.classList.remove('playing');
      updateButtonStates();
    });
}

// Update Play/Pause Button SVG Icons
function updateButtonStates() {
  if (state.isPlaying) {
    dom.playIcon.classList.add('hidden');
    dom.pauseIcon.classList.remove('hidden');
  } else {
    dom.playIcon.classList.remove('hidden');
    dom.pauseIcon.classList.add('hidden');
  }
}

/* ----------------------------------------------------
   SEEKBAR PROGRESS & INTERACTIVITY
   ---------------------------------------------------- */
// Handle Audio Player Native Time Updates
function handleNativeTimeUpdate() {
  if (state.activeTrackType === 'procedural') return;
  const currentTime = dom.audioPlayer.currentTime;
  const duration = dom.audioPlayer.duration || 0;
  
  updateProgressBar(currentTime, duration);
  updateTimeDisplay(currentTime, duration);
}

// Update elapsed text elements
function updateTimeDisplay(current, duration) {
  dom.timeElapsed.textContent = formatTime(current);
  dom.timeTotal.textContent = duration ? formatTime(duration) : "3:45";
}

// Format seconds into MM:SS
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Update progress bar element
function updateProgressBar(current, duration) {
  if (!duration) return;
  const percent = (current / duration) * 100;
  dom.seekbarProgress.style.width = `${percent}%`;
}

// Handle Seekbar Interaction
function handleSeekbarClick(e) {
  const rect = dom.seekbarTrack.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percent = Math.max(0, Math.min(100, (clickX / rect.width)));
  
  dom.seekbarProgress.style.width = `${percent}%`;
  
  if (state.activeTrackType === 'procedural') {
    // Jump mock procedural play state
    synthTimeElapsed = Math.floor((percent / 100) * synthDuration);
    updateTimeDisplay(synthTimeElapsed, synthDuration);
  } else {
    const duration = dom.audioPlayer.duration || 0;
    if (duration > 0) {
      dom.audioPlayer.currentTime = (percent / 100) * duration;
    }
  }
}

// Repeat Toggle Logic
function toggleRepeat() {
  state.repeatState = (state.repeatState + 1) % 3;
  
  if (state.repeatState === 0) {
    dom.repeatBtn.classList.remove('active');
    dom.repeatBadge.classList.add('hidden');
    dom.audioPlayer.loop = false;
  } else if (state.repeatState === 1) {
    dom.repeatBtn.classList.add('active');
    dom.repeatBadge.classList.remove('hidden');
    dom.repeatBadge.textContent = '1';
    if (state.activeTrackType !== 'procedural') {
      dom.audioPlayer.loop = true;
    }
  } else {
    dom.repeatBtn.classList.add('active');
    dom.repeatBadge.classList.add('hidden');
    dom.audioPlayer.loop = false;
  }
}

// Shuffle Toggle Logic
function toggleShuffle() {
  state.isShuffle = !state.isShuffle;
  dom.shuffleBtn.classList.toggle('active', state.isShuffle);
}

// Skip forward / backward buttons (Demo arpeggiators or preset changes)
function triggerNextPrevTrack() {
  // Skip to start or mock a beautiful chord synth notes trigger
  if (state.isPlaying) {
    if (state.activeTrackType === 'procedural') {
      synthTimeElapsed = 0;
      updateTimeDisplay(0, synthDuration);
      playGenerativeSynth();
    } else {
      dom.audioPlayer.currentTime = 0;
    }
    
    // Animate tonearm lift and drop for high-end feeling
    dom.playerCard.classList.remove('playing');
    setTimeout(() => {
      dom.playerCard.classList.add('playing');
    }, 300);
  }
}

// When native audio reaches end
function handleTrackEnded() {
  if (state.repeatState === 1) {
    dom.audioPlayer.play();
  } else if (state.repeatState === 2) {
    dom.audioPlayer.currentTime = 0;
    dom.audioPlayer.play();
  } else {
    state.isPlaying = false;
    dom.playerCard.classList.remove('playing');
    updateButtonStates();
  }
}

/* ----------------------------------------------------
   MODAL DIALOG & CUSTOM SETTINGS MANAGEMENT
   ---------------------------------------------------- */
function openModal() {
  dom.settingsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Lock background scrolling
}

function closeModal() {
  dom.settingsModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleModalOverlayClick(e) {
  if (e.target === dom.settingsModal) {
    closeModal();
  }
}

// Show/Hide forms based on custom source dropdowns
function toggleFormGroups() {
  const trackVal = dom.inputTrackSelect.value;
  const coverVal = dom.inputCoverSelect.value;
  
  // Track fields
  dom.customAudioUrlGroup.classList.toggle('hidden', trackVal !== 'custom-url');
  dom.customAudioFileGroup.classList.toggle('hidden', trackVal !== 'custom-file');
  
  // Cover fields
  dom.customImageUrlGroup.classList.toggle('hidden', coverVal !== 'custom-url');
  dom.customImageFileGroup.classList.toggle('hidden', coverVal !== 'custom-file');
}

// File Reader Handlers for Audio Uploads
function handleAudioFileUpload(e) {
  const file = e.target.files[0];
  if (file) {
    dom.audioFileInfo.textContent = "Loading file...";
    const reader = new FileReader();
    reader.onload = function(evt) {
      state.customAudioFile = evt.target.result; // Store base64 DataURL
      dom.audioFileInfo.textContent = `${file.name} ready (ready to play)`;
    };
    reader.readAsDataURL(file);
  }
}

// File Reader Handlers for Image Uploads
function handleImageFileUpload(e) {
  const file = e.target.files[0];
  if (file) {
    dom.imageFileInfo.textContent = "Loading image...";
    const reader = new FileReader();
    reader.onload = function(evt) {
      state.customImageFile = evt.target.result; // Store base64 DataURL
      dom.imageFileInfo.textContent = `${file.name} ready (ready to save)`;
    };
    reader.readAsDataURL(file);
  }
}

// Reset inputs to default values
function resetToDefaults() {
  if (confirm("Reset everything back to the defaults?")) {
    localStorage.removeItem('romantic_gift_state');
    
    // Restore state values
    state.activeTrackType = 'procedural';
    state.activeCoverType = 'default';
    state.customAudioUrl = '';
    state.customAudioFile = null;
    state.customImageUrl = '';
    state.customImageFile = null;
    state.giftHeader = 'A Gift for You';
    state.songTitle = 'Our Special Song';
    state.songArtist = 'From Me to You';
    state.dedicationText = 'token of my love for you.';
    
    // Reset values in forms
    dom.inputGiftHeader.value = state.giftHeader;
    dom.inputSongTitle.value = state.songTitle;
    dom.inputSongArtist.value = state.songArtist;
    dom.inputDedication.value = state.dedicationText;
    dom.inputTrackSelect.value = state.activeTrackType;
    dom.inputCoverSelect.value = state.activeCoverType;
    dom.audioFileInfo.textContent = "No file uploaded";
    dom.imageFileInfo.textContent = "No file uploaded";
    
    // Apply defaults to UI
    dom.giftHeaderText.textContent = state.giftHeader;
    dom.songTitle.textContent = state.songTitle;
    dom.songArtist.textContent = state.songArtist;
    dom.dedicationText.textContent = state.dedicationText;
    // Slideshow photos are fixed, no cover reset needed
    
    toggleFormGroups();
    
    if (state.isPlaying) {
      togglePlayPause();
    }
    
    closeModal();
  }
}

// Bind basic key events (Space to Play/Pause)
function handleGlobalKeydown(e) {
  if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    togglePlayPause();
  }
}

/* ----------------------------------------------------
   PHOTO SLIDESHOW ENGINE
   ---------------------------------------------------- */
let slideshowInterval = null;
let currentSlideIndex = 0;

function initSlideshow() {
  const images = document.querySelectorAll('.slideshow-image');
  const dots = document.querySelectorAll('.slide-dot');
  
  if (images.length === 0) return;
  
  // Start auto-cycling every 2 seconds
  slideshowInterval = setInterval(() => {
    // Remove active from current slide
    images[currentSlideIndex].classList.remove('active-slide');
    dots[currentSlideIndex].classList.remove('active-dot');
    
    // Move to next slide (loop back to 0)
    currentSlideIndex = (currentSlideIndex + 1) % images.length;
    
    // Activate next slide
    images[currentSlideIndex].classList.add('active-slide');
    dots[currentSlideIndex].classList.add('active-dot');
  }, 1500);
  
  // Allow clicking dots to jump to a specific slide
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      // Clear the auto-cycle temporarily
      clearInterval(slideshowInterval);
      
      // Remove active from current
      images[currentSlideIndex].classList.remove('active-slide');
      dots[currentSlideIndex].classList.remove('active-dot');
      
      // Jump to clicked slide
      currentSlideIndex = index;
      images[currentSlideIndex].classList.add('active-slide');
      dots[currentSlideIndex].classList.add('active-dot');
      
      // Restart auto-cycle
      slideshowInterval = setInterval(() => {
        images[currentSlideIndex].classList.remove('active-slide');
        dots[currentSlideIndex].classList.remove('active-dot');
        currentSlideIndex = (currentSlideIndex + 1) % images.length;
        images[currentSlideIndex].classList.add('active-slide');
        dots[currentSlideIndex].classList.add('active-dot');
      }, 1500);
    });
  });
}
