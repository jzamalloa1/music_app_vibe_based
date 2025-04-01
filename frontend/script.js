// --- Helper Function --- 
// Function to format time (ms to mm:ss)
const formatTime = (ms) => {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// --- Global Variables for Audio Playback ---
let currentTrackId = null;
let playbackQueue = []; // Array to hold track IDs
let currentQueueIndex = -1; // Index of the currently playing track in the queue
let currentPlaylistId = null; // Add this to track the current playlist

// We need references to UI elements globally if loadAndPlayTrack is global
const audioPlayer = document.getElementById('audio-player');
const nowPlayingArt = document.querySelector('.now-playing-art');
const nowPlayingTitle = document.querySelector('.now-playing-info .track-title');
const nowPlayingArtist = document.querySelector('.now-playing-info .track-artist');
const progressBar = document.querySelector('.progress-bar-inner');
const timeElapsed = document.querySelector('.time-elapsed');
const timeTotal = document.querySelector('.time-total');
// Also need play/pause button elements globally for loadAndPlayTrack
const playPauseButton = document.querySelector('.control-button.play-pause');
const playPauseIcon = playPauseButton ? playPauseButton.querySelector('i') : null;

// Function to update playlist card visuals
function updatePlaylistVisuals(playlistId) {
    // Remove 'now-playing' class from all playlist cards
    document.querySelectorAll('.grid-card').forEach(card => {
        card.classList.remove('now-playing');
        // Remove any existing playing indicator
        const indicator = card.querySelector('.playing-indicator');
        if (indicator) {
            indicator.remove();
        }
    });

    // Add 'now-playing' class and indicator to current playlist
    if (playlistId) {
        const currentCard = document.querySelector(`[data-playlist-id="${playlistId}"]`);
        if (currentCard) {
            currentCard.classList.add('now-playing');
            // Add playing indicator
            const indicator = document.createElement('div');
            indicator.className = 'playing-indicator';
            indicator.innerHTML = '<i class="fas fa-volume-up"></i> Playing';
            currentCard.appendChild(indicator);
        }
    }
}

// --- Main Audio Loading Function ---
// Function to load and play a track
async function loadAndPlayTrack(trackId) {
    console.log('loadAndPlayTrack called with trackId:', trackId);
    
    // Check if elements exist
    if (!audioPlayer || !nowPlayingArt || !nowPlayingTitle || !nowPlayingArtist) {
        console.error('Required audio UI elements not found:', {
            audioPlayer: !!audioPlayer,
            nowPlayingArt: !!nowPlayingArt,
            nowPlayingTitle: !!nowPlayingTitle,
            nowPlayingArtist: !!nowPlayingArtist
        });
        return;
    }

    // Stop any current playback
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.src = '';

    try {
        console.log(`Fetching track ${trackId}...`);
        const response = await fetch(`/api/track/${trackId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const trackData = await response.json();
        console.log('Track data received:', trackData);

        // Update Now Playing UI
        console.log('Updating UI with track data...');
        nowPlayingArt.src = trackData.album_art_url || 'https://via.placeholder.com/56';
        nowPlayingArt.alt = trackData.album_title || 'Unknown Album';
        nowPlayingTitle.textContent = trackData.title;
        nowPlayingArtist.textContent = trackData.artist_name;
        timeTotal.textContent = formatTime(trackData.duration_ms);
        timeElapsed.textContent = '0:00';
        if(progressBar) progressBar.style.width = '0%';

        // Load and play audio
        console.log('Loading audio from:', trackData.file_path);
        
        // Create a new Audio element for this track
        const tempAudio = new Audio();
        tempAudio.crossOrigin = "anonymous";
        
        // Set up promise to check if audio can be loaded
        const canPlayPromise = new Promise((resolve, reject) => {
            tempAudio.addEventListener('canplaythrough', () => {
                console.log('Test audio can play through');
                resolve();
            }, { once: true });
            
            tempAudio.addEventListener('error', (e) => {
                console.error('Test audio loading error:', tempAudio.error);
                reject(new Error(`Audio loading failed: ${tempAudio.error?.message || 'Unknown error'}`));
            }, { once: true });
        });

        // Try to load the audio
        tempAudio.src = trackData.file_path;
        
        try {
            // Wait for the test audio to be playable
            await canPlayPromise;
            console.log('Audio file verified, setting up main player');
            
            // If we get here, the audio is loadable, so set it to the main player
            audioPlayer.src = trackData.file_path;
            
            // Try to play
            await audioPlayer.play();
            console.log('Audio playback started successfully');
            
            currentTrackId = trackId;

            // Update play/pause button state
            if(playPauseIcon && playPauseButton){
                playPauseIcon.classList.remove('fa-play');
                playPauseIcon.classList.add('fa-pause');
                playPauseButton.setAttribute('title', 'Pause');
            }
        } catch (playError) {
            console.error("Error playing audio:", playError);
            if (playError.name === 'NotAllowedError') {
                console.log('Playback was prevented by browser autoplay policy');
            } else if (playError.name === 'NotSupportedError') {
                console.log('Audio format not supported');
            }
            throw playError;
        }

    } catch (error) {
        console.error(`Error loading track ${trackId}:`, error);
        // Log the full error details
        console.log('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Clear the player state
        audioPlayer.src = '';
        if(playPauseIcon && playPauseButton){
            playPauseIcon.classList.remove('fa-pause');
            playPauseIcon.classList.add('fa-play');
            playPauseButton.setAttribute('title', 'Play');
        }
    }
}

// --- New Function to Load Queue and Start Playback ---
async function loadQueueAndPlay(playlistId) {
    console.log('loadQueueAndPlay called with playlistId:', playlistId);
    try {
        // Update visuals first
        currentPlaylistId = playlistId;
        updatePlaylistVisuals(playlistId);

        console.log(`Fetching tracks for playlist ${playlistId}...`);
        const response = await fetch(`/api/playlist/${playlistId}/tracks`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const trackIds = await response.json();
        console.log(`Queue loaded with tracks:`, trackIds);

        if (trackIds && trackIds.length > 0) {
            playbackQueue = trackIds;
            currentQueueIndex = 0;
            console.log('Starting playback with first track:', playbackQueue[currentQueueIndex]);
            await loadAndPlayTrack(playbackQueue[currentQueueIndex]);
        } else {
            console.log('Playlist is empty or failed to load tracks.');
            playbackQueue = [];
            currentQueueIndex = -1;
            currentPlaylistId = null;
            updatePlaylistVisuals(null);
        }
    } catch (error) {
        console.error(`Error loading queue for playlist ${playlistId}:`, error);
        console.log('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        // Clear current playlist on error
        currentPlaylistId = null;
        updatePlaylistVisuals(null);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    
    // Ensure elements needed by global functions are found *after* DOM load
    // Note: We already query them globally, this is mostly conceptual
    if (!audioPlayer || !nowPlayingArt /* ... add checks for others */) {
        console.error("DOM loaded, but essential audio elements missing!");
        // Potentially re-query elements here if needed
    }

    fetchArtists();
    fetchForYouPlaylists(); // Call the new function

    // Theme toggle logic
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeIcon = themeToggleButton ? themeToggleButton.querySelector('i') : null;

    const updateThemeIcon = () => {
        if (!themeIcon) return; // Guard clause
        if (document.body.classList.contains('light-theme')) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    };

    if (themeToggleButton && themeIcon) {
        updateThemeIcon();
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('light-theme'); 
            updateThemeIcon();
            console.log('Theme toggled');
        });
    } else {
        console.error('Theme toggle button or icon not found');
    }

    // Playback controls interactivity
    // References already defined globally: playPauseButton, playPauseIcon, audioPlayer
    const shuffleButton = document.querySelector('.control-button.shuffle');
    const repeatButton = document.querySelector('.control-button.repeat');

    // Remove local audio logic, use global references
    /* 
    let currentTrackId = null;
    const formatTime = (ms) => { ... }; 
    async function loadAndPlayTrack(trackId) { ... } 
    */

    // Update play/pause button listener (using global refs)
    if (playPauseButton && playPauseIcon && audioPlayer) {
        // playPauseButton.removeEventListener('click', () => {}); // This line is problematic
        playPauseButton.addEventListener('click', () => {
            // ... (keep existing play/pause logic)
             if (audioPlayer.paused) {
                if (!audioPlayer.src) {
                    console.log('No track loaded yet.');
                    return; 
                }
                audioPlayer.play();
                playPauseIcon.classList.remove('fa-play');
                playPauseIcon.classList.add('fa-pause');
                playPauseButton.setAttribute('title', 'Pause');
            } else {
                audioPlayer.pause();
                playPauseIcon.classList.remove('fa-pause');
                playPauseIcon.classList.add('fa-play');
                playPauseButton.setAttribute('title', 'Play');
            }
        });
    }

    // Audio element event listeners (using global refs)
    if (audioPlayer && progressBar && timeElapsed && timeTotal) {
        audioPlayer.addEventListener('loadedmetadata', () => {
            timeTotal.textContent = formatTime(audioPlayer.duration * 1000);
        });

        audioPlayer.addEventListener('timeupdate', () => {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = `${progress}%`;
            timeElapsed.textContent = formatTime(audioPlayer.currentTime * 1000);
        });

        audioPlayer.addEventListener('ended', () => {
            console.log('Track ended');
            if(playPauseIcon && playPauseButton){
                playPauseIcon.classList.remove('fa-pause');
                playPauseIcon.classList.add('fa-play');
                playPauseButton.setAttribute('title', 'Play');
            }
            if(progressBar) progressBar.style.width = '0%';
            if(timeElapsed) timeElapsed.textContent = '0:00';
        });
    }

    // --- Progress Bar Seeking --- 
    const progressBarContainer = document.querySelector('.progress-bar'); // Get the container div
    if (progressBarContainer && audioPlayer) {
        progressBarContainer.addEventListener('click', (event) => {
            if (!audioPlayer.duration) return; // Can't seek if duration is unknown
            
            // Calculate click position percentage
            const barWidth = progressBarContainer.clientWidth;
            const clickX = event.offsetX;
            const seekTime = (clickX / barWidth) * audioPlayer.duration;
            
            audioPlayer.currentTime = seekTime;
            console.log(`Seeked to ${formatTime(seekTime * 1000)}`);
        });
    }
    // ----------------------------

    // --- Volume Control --- 
    const volumeBarContainer = document.querySelector('.volume-bar');
    const volumeBarInner = document.querySelector('.volume-bar-inner');
    const volumeButton = document.querySelector('.control-button.volume');
    const volumeIcon = volumeButton ? volumeButton.querySelector('i') : null;

    const updateVolumeUI = (volumeLevel) => {
        if(volumeBarInner) volumeBarInner.style.width = `${volumeLevel * 100}%`;
        if (!volumeIcon) return;
        
        // Update volume icon based on level
        volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-off', 'fa-volume-mute');
        if (volumeLevel === 0) {
            volumeIcon.classList.add('fa-volume-mute'); 
        } else if (volumeLevel < 0.5) {
            volumeIcon.classList.add('fa-volume-down');
        } else {
            volumeIcon.classList.add('fa-volume-up');
        }
    };

    if (volumeBarContainer && audioPlayer) {
        volumeBarContainer.addEventListener('click', (event) => {
            const barWidth = volumeBarContainer.clientWidth;
            const clickX = event.offsetX;
            let volumeLevel = clickX / barWidth;
            volumeLevel = Math.max(0, Math.min(1, volumeLevel)); // Clamp between 0 and 1
            
            audioPlayer.volume = volumeLevel;
            updateVolumeUI(volumeLevel);
            console.log(`Volume set to ${Math.round(volumeLevel * 100)}%`);
        });
        // Set initial UI based on default volume (usually 1.0)
        updateVolumeUI(audioPlayer.volume);
    }

    // Optional: Add mute toggle functionality to volume button itself
    if (volumeButton && audioPlayer) {
        volumeButton.addEventListener('click', () => {
            if (audioPlayer.muted) {
                audioPlayer.muted = false;
                updateVolumeUI(audioPlayer.volume); // Restore visual volume
            } else {
                audioPlayer.muted = true;
                updateVolumeUI(0); // Show muted state
            }
             console.log('Mute toggled', audioPlayer.muted);
        });
    }
    // ----------------------

    // Shuffle/Repeat Listeners (using local refs)
    if (shuffleButton) {
        shuffleButton.addEventListener('click', () => {
            shuffleButton.classList.toggle('active');
            console.log('Shuffle toggled', shuffleButton.classList.contains('active'));
        });
    }

    if (repeatButton) {
        repeatButton.addEventListener('click', () => {
            repeatButton.classList.toggle('active');
             console.log('Repeat toggled', repeatButton.classList.contains('active'));
        });
    }

});

async function fetchArtists() {
    const artistsListElement = document.getElementById('artists-list');
    if (!artistsListElement) {
        console.error('Artists list element not found!');
        return;
    }

    try {
        console.log('Fetching artists from /api/artists...');
        const response = await fetch('/api/artists');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const artists = await response.json();
        console.log('Artists data received:', artists);
        
        // Clear the "Loading..." message
        artistsListElement.innerHTML = ''; 

        if (artists.length === 0) {
            artistsListElement.innerHTML = '<p>No artists found.</p>'; // Use paragraph
        } else {
            artists.forEach(artist => {
                // const listItem = document.createElement('li');
                // listItem.textContent = artist.name; // Display artist name
                // artistsListElement.appendChild(listItem);
                
                const artistCard = document.createElement('div');
                artistCard.classList.add('grid-card', 'artist-card');

                // Use Picsum for more realistic placeholder images, seeded by artist ID
                const imageUrl = `https://picsum.photos/seed/${artist.id}/150/150`;
                
                artistCard.innerHTML = `
                    <img src="${imageUrl}" alt="${artist.name}" class="artist-image">
                    <span class="artist-name">${artist.name}</span>
                    <span class="artist-followers">${(artist.id * 5000).toLocaleString()} followers</span> <!-- Example follower count -->
                `;
                artistsListElement.appendChild(artistCard);
            });
        }

    } catch (error) {
        console.error('Error fetching artists:', error);
        artistsListElement.innerHTML = '<p>Error loading artists.</p>'; // Use paragraph
    }
}

// --- Function to fetch "For You" Playlists ---
async function fetchForYouPlaylists() {
    try {
        const response = await fetch('/api/playlists/for-you');
        const playlists = await response.json();
        
        const gridItems = document.querySelector('#for-you .grid-items');
        gridItems.innerHTML = ''; // Clear loading message
        
        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'grid-card for-you-card';
            card.setAttribute('data-playlist-id', playlist.id);  // Add this line
            
            const img = document.createElement('img');
            img.src = playlist.image_url || `https://picsum.photos/seed/${playlist.title}/180/180`;
            img.alt = playlist.title;
            
            const span = document.createElement('span');
            span.textContent = playlist.title;
            
            card.appendChild(img);
            card.appendChild(span);
            
            // Add click handler
            card.onclick = () => loadQueueAndPlay(playlist.id);
            
            gridItems.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching For You playlists:', error);
    }
}

// Add styles for the playing indicator
const style = document.createElement('style');
style.textContent = `
    .grid-card {
        position: relative;
    }
    .grid-card.now-playing {
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    }
    .playing-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .playing-indicator i {
        color: #1DB954;
    }
`;
document.head.appendChild(style);

// -------------------------------------------------
