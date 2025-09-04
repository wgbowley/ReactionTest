"""
File: app.py
Author: William Bowley
Version: 0.1
Date: 2024 - 09 - 04

Description:
    This is the main entry point for the Flask application.
    It creates the Flask app and registers the 'routes' Blueprint.
"""

import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from modules.routes import bp as routes_bp
from modules.database import initialize_database

# Create the main Flask application instance
app = Flask(__name__, template_folder='template')

# Register the Blueprint from the routes.py file
app.register_blueprint(routes_bp)

# Configure logging 
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=1)
handler.setLevel(logging.INFO)
formatter = logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
)

handler.setFormatter(formatter)
app.logger.addHandler(handler)

app.logger.info('Application startup')

if __name__ == '__main__':
    # Initialize the database and tables on startup
    initialize_database()
    app.run(debug=True)
