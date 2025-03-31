# Music App Clone

A music streaming platform designed to rival Spotify, built with Flask and basic HTML/JS/CSS.

## Project Goals

(Refer to initial project description for detailed goals regarding personalization, community, artist support, etc.)

## Tech Stack

*   **Backend:** Python (Flask)
*   **Database:** SQLite (via Flask-SQLAlchemy)
*   **Frontend:** HTML, CSS, JavaScript
*   **Environment:** Conda (`cursor_python` environment used during development)

## Setup and Running

1.  **Clone the Repository:**
    ```bash
    git clone <your-repo-url>
    cd music_app_clone 
    ```

2.  **Create Conda Environment:**
    It's recommended to use the specified `cursor_python` environment or create a similar one:
    ```bash
    # If you don't have the 'cursor_python' env from the development session:
    conda create --name cursor_python python=3.9 # Or your preferred Python 3 version
    conda activate cursor_python
    ```
    If you use a different environment name, make sure to activate it instead.

3.  **Install Dependencies:**
    Ensure you are in the project root directory (`music_app_clone`) and the correct conda environment is active.
    ```bash
    # Use python -m pip to ensure packages install into the active env
    python -m pip install -r requirements.txt
    ```

4.  **Database Setup:**
    The SQLite database (`music_app.db`) and necessary tables will be created automatically the first time you run the application. Sample data (artists, tracks, playlists) will also be seeded if the database is empty.
    *   If you need to reset the database, simply delete the `music_app.db` file before running the app.

5.  **Run the Application:**
    Ensure your conda environment is active.
    ```bash
    # Set Flask environment variables (for bash/zsh)
    export FLASK_APP=backend
    export FLASK_ENV=development

    # Run using the environment's python/flask
    python -m flask run --host=0.0.0.0
    ```
    The application should now be accessible at `http://127.0.0.1:5000/` (or `http://localhost:5000/`) in your web browser.

## Development Notes

*   The application uses Font Awesome for icons (via CDN).
*   Sample data includes placeholder audio URLs for testing playback.
*   User authentication is not yet implemented.
