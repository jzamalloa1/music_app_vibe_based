from flask import Flask, render_template, jsonify
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
                static_folder='../frontend')

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

            # Tracks
            # Use a real MP3 URL for testing playback
            sample_audio_url = "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"
            track1 = Track(title="Sample Song A", artist_id=artist1.id, album_id=album1.id, duration_ms=180000, file_path=sample_audio_url)
            track2 = Track(title="Sample Song B", artist_id=artist1.id, album_id=album1.id, duration_ms=210000, file_path=sample_audio_url)
            track3 = Track(title="Flow State", artist_id=artist2.id, album_id=album2.id, duration_ms=300000, file_path=sample_audio_url)
            track4 = Track(title="Synthwave Drive", artist_id=artist2.id, album_id=album2.id, duration_ms=240000, file_path=sample_audio_url)
            track5 = Track(title="Quiet Corner", artist_id=artist3.id, album_id=album3.id, duration_ms=150000, file_path=sample_audio_url)
            track6 = Track(title="Lost & Found", artist_id=artist3.id, duration_ms=190000, file_path=sample_audio_url) # No album
            db.session.add_all([track1, track2, track3, track4, track5, track6])

            # Sample User (needed for playlists)
            # In a real app, users would register, but we need one for sample playlists
            # Note: Storing plain hash like this is INSECURE, just for placeholder
            sample_user = User(username="sampleuser", email="sample@example.com", password_hash="placeholder_hash")
            db.session.add(sample_user)
            db.session.commit() # Commit user to get ID

            # Playlists (representing "For You")
            playlist1 = Playlist(name="Chill Vibes", description="Relaxing tunes.", user_id=sample_user.id, tracks=[track5, track1])
            playlist2 = Playlist(name="Weekly Mix", description="Your personalized mix.", user_id=sample_user.id, tracks=[track3, track6, track2])
            playlist3 = Playlist(name="Focus Mode", description="Concentration music.", user_id=sample_user.id, tracks=[track4, track3])
            db.session.add_all([playlist1, playlist2, playlist3])

            db.session.commit() # Final commit for tracks and playlists
            print("Sample data added.")

    return app
