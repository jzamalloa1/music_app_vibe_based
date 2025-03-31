from .extensions import db
from sqlalchemy import ForeignKey, Table
from sqlalchemy.orm import relationship
import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    playlists = relationship('Playlist', back_populates='user') # One-to-Many with Playlist

    def __repr__(self):
        return f'<User {self.username}>'

# Association table for Playlist and Track (Many-to-Many)
playlist_track = Table('playlist_track', db.metadata,
    db.Column('playlist_id', db.Integer, ForeignKey('playlist.id'), primary_key=True),
    db.Column('track_id', db.Integer, ForeignKey('track.id'), primary_key=True)
)

class Artist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    bio = db.Column(db.Text, nullable=True) # Optional artist biography
    # Relationships
    albums = relationship('Album', back_populates='artist') # One-to-Many with Album
    tracks = relationship('Track', back_populates='artist') # One-to-Many with Track

    def __repr__(self):
        return f'<Artist {self.name}>'

class Album(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    release_date = db.Column(db.Date, nullable=True)
    cover_art_url = db.Column(db.String(255), nullable=True)
    artist_id = db.Column(db.Integer, ForeignKey('artist.id'), nullable=False)
    # Relationships
    artist = relationship('Artist', back_populates='albums') # Many-to-One with Artist
    tracks = relationship('Track', back_populates='album') # One-to-Many with Track

    def __repr__(self):
        return f'<Album {self.title}>'

class Track(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    duration_ms = db.Column(db.Integer, nullable=True) # Duration in milliseconds
    file_path = db.Column(db.String(255), nullable=False) # Path or URL to the audio file
    # Foreign Keys
    artist_id = db.Column(db.Integer, ForeignKey('artist.id'), nullable=False)
    album_id = db.Column(db.Integer, ForeignKey('album.id'), nullable=True) # Track might not belong to an album
    # Relationships
    artist = relationship('Artist', back_populates='tracks') # Many-to-One with Artist
    album = relationship('Album', back_populates='tracks')   # Many-to-One with Album
    playlists = relationship('Playlist', secondary=playlist_track, back_populates='tracks') # Many-to-Many with Playlist

    def __repr__(self):
        return f'<Track {self.title}>'

class Playlist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    # Foreign Keys
    user_id = db.Column(db.Integer, ForeignKey('user.id'), nullable=False)
    # Relationships
    user = relationship('User', back_populates='playlists') # Many-to-One with User
    tracks = relationship('Track', secondary=playlist_track, back_populates='playlists') # Many-to-Many with Track

    def __repr__(self):
        return f'<Playlist {self.name}>'