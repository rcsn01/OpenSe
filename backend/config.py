import os


def read_secret(secret_name):
    """Read a Docker secret from /run/secrets/"""
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as secret_file:
            return secret_file.read().strip()
    except IOError:
        # Fallback to environment variable for local development
        return os.environ.get(secret_name.upper())


class Config:
    """Application configuration class."""
    
    # Database configuration
    DB_USER = read_secret('db_user') or 'inventory_user'
    DB_PASSWORD = read_secret('db_password') or 'postgres'
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_NAME = os.environ.get('DB_NAME', 'inventory_db')
    
    # Construct database URI
    SQLALCHEMY_DATABASE_URI = (
        f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT configuration
    JWT_SECRET_KEY = read_secret('jwt_secret_key') or 'dev-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    
    # File upload configuration
    UPLOAD_FOLDER = '/app/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Flask configuration
    SECRET_KEY = read_secret('jwt_secret_key') or 'dev-secret-key-change-in-production'
    
    # CORS configuration
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost']
