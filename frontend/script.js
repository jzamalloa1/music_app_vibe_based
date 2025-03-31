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

// --- Main Audio Loading Function ---
// Function to load and play a track
async function loadAndPlayTrack(trackId) {
    // Check if elements exist (might not if script runs before DOM is fully ready, 
    // though DOMContentLoaded should prevent this. Good practice anyway.)
    if (!audioPlayer || !nowPlayingArt || !nowPlayingTitle || !nowPlayingArtist) {
        console.error('Required audio UI elements not found! Cannot load track.');
        return;
    }
    try {
        console.log(`Fetching track ${trackId}...`);
        const response = await fetch(`/api/track/${trackId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const trackData = await response.json();
        console.log('Track data:', trackData);

        // Update Now Playing UI
        nowPlayingArt.src = trackData.album_art_url || 'https://via.placeholder.com/56';
        nowPlayingArt.alt = trackData.album_title || 'Unknown Album';
        nowPlayingTitle.textContent = trackData.title;
        nowPlayingArtist.textContent = trackData.artist_name;
        timeTotal.textContent = formatTime(trackData.duration_ms);
        timeElapsed.textContent = '0:00';
        if(progressBar) progressBar.style.width = '0%';

        // Load and play audio
        audioPlayer.src = trackData.file_path;
        // Use a promise to ensure play starts after loading is possible
        await audioPlayer.play().catch(e => console.error("Error playing audio:", e));
        currentTrackId = trackId;

        // Update play/pause button state
        if(playPauseIcon && playPauseButton){
             playPauseIcon.classList.remove('fa-play');
             playPauseIcon.classList.add('fa-pause');
             playPauseButton.setAttribute('title', 'Pause');
        }

    } catch (error) {
        console.error(`Error loading track ${trackId}:`, error);
        // Optionally display error in UI
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
     const forYouContainer = document.querySelector('#for-you .grid-items');
     if (!forYouContainer) {
         console.error('For You container not found!');
         return;
     }
 
     try {
         console.log('Fetching For You playlists from /api/playlists/for-you...');
         const response = await fetch('/api/playlists/for-you');
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
         }
         const playlists = await response.json();
         console.log('For You playlists received:', playlists);
 
         // Clear existing placeholder cards (if any)
         forYouContainer.innerHTML = ''; 
 
         if (playlists.length === 0) {
             forYouContainer.innerHTML = '<p>Nothing here for you yet.</p>';
         } else {
             playlists.forEach((playlist, index) => {
                 const playlistCard = document.createElement('div');
                 playlistCard.classList.add('grid-card', 'for-you-card');
                 
                 playlistCard.innerHTML = `
                     <img src="${playlist.image_url}" alt="${playlist.name}">
                     <span>${playlist.name}</span>
                 `;
                 // TEST: Add click handler to load a sample track
                 if (index === 0) { // Add to first card only for now
                      playlistCard.style.cursor = 'pointer';
                      // Now calls the globally scoped function
                      playlistCard.onclick = () => loadAndPlayTrack(1); // Load track 1
                 }
                 
                 forYouContainer.appendChild(playlistCard);
             });
         }
 
     } catch (error) {
         console.error('Error fetching For You playlists:', error);
         forYouContainer.innerHTML = '<p>Error loading recommendations.</p>';
     }
 }
 // -------------------------------------------------
