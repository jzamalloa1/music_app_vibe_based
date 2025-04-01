from flask import Flask, render_template, jsonify, send_from_directory
import os

# Import extensions and models
from .extensions import db
from .models import User, Artist, Album, Track, Playlist

# Get the absolute path of the project directory
# Note: __file__ refers to __init__.py in this context
basedir = os.path.abspath(os.path.dirname(__file__))
project_root = os.path.abspath(os.path.join(basedir, os.pardir))

def create_app(config_object=None):
    """Application factory"""
    app = Flask(__name__,
                template_folder='../frontend',
                static_folder='../frontend',
                static_url_path='/frontend')  # Add explicit static URL path

    # Register a second static folder for backend static files
    @app.route('/static/audio/<path:filename>')
    def serve_audio(filename):
        return send_from_directory(os.path.join(basedir, 'static', 'audio'), filename)

    # Load configuration (if any)
    # app.config.from_object(config_object)

    # Configure the database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(project_root, 'music_app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    db.init_app(app)

    # Register Blueprints (add routes later)
    # from .routes import main_bp
    # app.register_blueprint(main_bp)

    # Add a simple root route here for now
    @app.route('/')
    def index():
        return render_template('index.html', title='Home')

    # --- API Endpoints --- 
    @app.route('/api/artists')
    def get_artists():
        # TODO: Replace with actual database query later
        # sample_artists = [
        #     {'id': 1, 'name': 'Artist One'},
        #     {'id': 2, 'name': 'Artist Two'},
        #     {'id': 3, 'name': 'Independent Artist A'}
        # ]
        # return jsonify(sample_artists)

        # Query the database for all artists
        try:
            all_artists = db.session.execute(db.select(Artist).order_by(Artist.name)).scalars().all()
            # Convert the list of Artist objects into a list of dictionaries
            artists_list = [{'id': artist.id, 'name': artist.name, 'bio': artist.bio} for artist in all_artists]
            return jsonify(artists_list)
        except Exception as e:
            print(f"Error querying artists: {e}") # Log error to server console
            return jsonify({"error": "Could not retrieve artists"}), 500
            
    # ---------------------

    # --- API Endpoint for "For You" Playlists ---
    @app.route('/api/playlists/for-you')
    def get_for_you_playlists():
        try:
            # Query a few sample playlists (e.g., limit to 3 for the top row)
            # In a real app, this would involve complex recommendation logic
            playlists = db.session.execute(
                db.select(Playlist).order_by(Playlist.created_at).limit(3)
            ).scalars().all()
            
            playlist_list = []
            for pl in playlists:
                # Simulate getting an image URL - replace with actual logic later
                # e.g., based on playlist name or first track's album art
                image_seed = pl.name.replace(' ', '').lower()
                image_url = f"https://picsum.photos/seed/{image_seed}/180/180"
                
                playlist_list.append({
                    'id': pl.id,
                    'name': pl.name,
                    'description': pl.description,
                    'image_url': image_url
                    # Add more fields if needed, like track count
                })
            
            return jsonify(playlist_list)
        except Exception as e:
            print(f"Error querying For You playlists: {e}")
            return jsonify({"error": "Could not retrieve For You playlists"}), 500
    # -----------------------------------------

    # --- API Endpoint for a single track ---
    @app.route('/api/track/<int:track_id>')
    def get_track(track_id):
        try:
            track = db.session.get(Track, track_id)
            if not track:
                return jsonify({"error": "Track not found"}), 404
            
            # Get artist and album info if they exist
            artist_name = track.artist.name if track.artist else "Unknown Artist"
            album_title = track.album.title if track.album else "Unknown Album"
            # Simulate album art URL (using track ID)
            album_art_url = f"https://picsum.photos/seed/track{track.id}/56/56"

            track_data = {
                "id": track.id,
                "title": track.title,
                "artist_name": artist_name,
                "album_title": album_title,
                "duration_ms": track.duration_ms,
                "file_path": track.file_path, # The actual audio URL
                "album_art_url": album_art_url
            }
            return jsonify(track_data)
        except Exception as e:
            print(f"Error querying track {track_id}: {e}")
            return jsonify({"error": "Could not retrieve track details"}), 500
    # ------------------------------------

    # --- API Endpoint for Playlist Tracks ---
    @app.route('/api/playlist/<int:playlist_id>/tracks')
    def get_playlist_tracks(playlist_id):
        try:
            playlist = db.session.get(Playlist, playlist_id)
            if not playlist:
                 return jsonify({"error": "Playlist not found"}), 404
            
            # Get IDs of tracks in the playlist, preserving order if possible (depends on relationship config)
            track_ids = [track.id for track in playlist.tracks]
            
            return jsonify(track_ids)
        except Exception as e:
            print(f"Error querying playlist tracks {playlist_id}: {e}")
            return jsonify({"error": "Could not retrieve playlist tracks"}), 500
    # ------------------------------------

    # Create database tables within app context
    with app.app_context():
        db.create_all()
        
        # Add sample data if the database is empty
        if not db.session.execute(db.select(Artist).limit(1)).first():
            print("Adding sample data to the database...")
            
            # Artists
            artist1 = Artist(name='The Sampletones', bio='A band created for demonstration purposes.')
            artist2 = Artist(name='DJ CodeFlow', bio='Spins virtual tracks.')
            artist3 = Artist(name='Indie Gem')
            db.session.add_all([artist1, artist2, artist3])
            db.session.commit() # Commit artists to get IDs

            # Albums
            album1 = Album(title="Greatest Hits", artist_id=artist1.id)
            album2 = Album(title="Code Breaker Beats", artist_id=artist2.id)
            album3 = Album(title="Acoustic Gems", artist_id=artist3.id)
            db.session.add_all([album1, album2, album3])
            db.session.commit() # Commit albums to get IDs

            # Sample tracks with different audio files
            tracks = [
                Track(
                    title="Sunset Cruising",
                    artist_id=artist1.id,
                    album_id=album1.id,
                    duration_ms=3000,  # 3 seconds
                    file_path="/static/audio/sample1.wav"
                ),
                Track(
                    title="Urban Dreams",
                    artist_id=artist1.id,
                    album_id=album1.id,
                    duration_ms=3000,  # 3 seconds
                    file_path="/static/audio/sample2.wav"
                ),
                Track(
                    title="Flow State",
                    artist_id=artist2.id,
                    album_id=album2.id,
                    duration_ms=3000,  # 3 seconds
                    file_path="/static/audio/sample3.wav"
                ),
                Track(
                    title="Deep Focus",
                    artist_id=artist2.id,
                    album_id=album2.id,
                    duration_ms=3000,  # 3 seconds
                    file_path="/static/audio/sample4.wav"
                ),
                Track(
                    title="Midnight Jazz",
                    artist_id=artist3.id,
                    album_id=album3.id,
                    duration_ms=3000,  # 3 seconds
                    file_path="/static/audio/sample5.wav"
                ),
                Track(
                    title="Morning Coffee",
                    artist_id=artist3.id,
                    album_id=album3.id,
                    duration_ms=3000,  # 3 seconds
                    file_path="/static/audio/sample6.wav"
                )
            ]

            for track in tracks:
                db.session.add(track)
            db.session.commit()

            # Sample User (needed for playlists)
            # In a real app, users would register, but we need one for sample playlists
            # Note: Storing plain hash like this is INSECURE, just for placeholder
            sample_user = User(username="sampleuser", email="sample@example.com", password_hash="placeholder_hash")
            db.session.add(sample_user)
            db.session.commit() # Commit user to get ID

            # Create sample playlists with the new tracks
            playlist1 = Playlist(
                name="Chill Vibes",
                description="Relaxing tunes for your evening.",
                user_id=sample_user.id,
                tracks=[tracks[4], tracks[0]]  # Midnight Jazz, Sunset Cruising
            )

            playlist2 = Playlist(
                name="Weekly Mix",
                description="Your personalized mix of the week.",
                user_id=sample_user.id,
                tracks=[tracks[2], tracks[5], tracks[1]]  # Flow State, Morning Coffee, Urban Dreams
            )

            playlist3 = Playlist(
                name="Focus Mode",
                description="Music to help you concentrate.",
                user_id=sample_user.id,
                tracks=[tracks[3], tracks[2]]  # Deep Focus, Flow State
            )

            db.session.add(playlist1)
            db.session.add(playlist2)
            db.session.add(playlist3)
            db.session.commit()

            print("Added sample data...")

    return app
