import os
import time
import sys
from app import create_app
from models import db


def wait_for_db(uri, timeout=60):
    """Wait until the database is accepting connections."""
    from sqlalchemy import create_engine
    start = time.time()
    while True:
        try:
            engine = create_engine(uri)
            conn = engine.connect()
            conn.close()
            return True
        except Exception as e:
            if time.time() - start > timeout:
                print(f"Timed out waiting for database: {e}")
                return False
            print("Waiting for database to be ready...")
            time.sleep(2)


if __name__ == '__main__':
    # Create the app (config will pick DB credentials from env vars or secrets)
    app = create_app()

    # Ensure SQLAlchemy URI is available
    uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    if not uri:
        print('No SQLALCHEMY_DATABASE_URI configured; aborting')
        sys.exit(2)

    print(f'Using database URI: {uri}')

    ok = wait_for_db(uri, timeout=120)
    if not ok:
        print('Database did not become ready in time')
        sys.exit(3)

    with app.app_context():
        print('Creating database tables (if missing)')
        try:
            db.create_all()
            print('Database tables created successfully')
            sys.exit(0)
        except Exception as e:
            print(f'Failed to create tables: {e}')
            sys.exit(4)
