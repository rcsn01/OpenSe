import os
import time
import uuid
from datetime import timedelta
from typing import Dict, Any

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_socketio import SocketIO
from werkzeug.utils import secure_filename
import logging

from models import db, User, Product, StockUpdate
from auth import auth_bp


# Allowed statuses for stock updates (use user-friendly labels)
ALLOWED_STATUSES = {
    "Out of Stock",
    "Near Out of Stock",
    "Ordered",
    "Restocked",
}


def create_app() -> Flask:
    app = Flask(__name__, static_folder='static', static_url_path='')

    # Configuration from environment
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'change-me')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', os.path.join(app.root_path, 'uploads'))

    # Ensure uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    JWTManager(app)

    # SocketIO with gevent/gevent-websocket
    socketio = SocketIO(app, cors_allowed_origins="*")
    app.socketio = socketio  # type: ignore[attr-defined]

    # Blueprints
    app.register_blueprint(auth_bp)

    # Health check
    @app.route('/api/health')
    def health():
        return jsonify({"status": "ok"})

    # Current user
    @app.route('/api/me')
    @jwt_required()
    def me():
        uid = get_jwt_identity()
        user = User.query.get(int(uid)) if uid is not None else None
        return jsonify(user=user.to_dict() if user else None)

    # Serve uploaded images
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Create a new stock update
    @app.route('/api/updates', methods=['POST'])
    @jwt_required()
    def create_update():
        uid = get_jwt_identity()
        user = User.query.get(int(uid)) if uid is not None else None
        if not user:
            return jsonify({'message': 'Unauthorized'}), 401

        # Supports multipart/form-data with optional image
        status = (request.form.get('status') or request.json.get('status') if request.is_json else None)  # type: ignore
        notes = (request.form.get('notes') or (request.json.get('notes') if request.is_json else None))  # type: ignore
        product_code = (request.form.get('product_code') or (request.json.get('product_code') if request.is_json else None))  # type: ignore
        product_name = (request.form.get('product_name') or (request.json.get('product_name') if request.is_json else None))  # type: ignore

        if not status or status not in ALLOWED_STATUSES:
            return jsonify({'message': 'Invalid or missing status.'}), 400

        if not product_code:
            return jsonify({'message': 'product_code is required.'}), 400

        product = Product.query.filter_by(code=product_code).first()
        if not product:
            product = Product(code=product_code, name=product_name)
            db.session.add(product)
            db.session.flush()  # get product.id

        image_url = None
        if 'image' in request.files:
            img = request.files['image']
            if img and img.filename:
                filename = secure_filename(img.filename)
                # Prefix with UUID to avoid collisions
                unique_name = f"{uuid.uuid4().hex}_{filename}"
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
                img.save(save_path)
                image_url = f"/uploads/{unique_name}"

        update = StockUpdate(
            product_id=product.id,
            user_id=user.id,
            status=status,
            notes=notes,
            image_url=image_url,
        )
        db.session.add(update)
        db.session.commit()

        payload: Dict[str, Any] = update.to_dict()

        # Broadcast to all connected clients
        socketio.emit('update_created', payload, broadcast=True)

        return jsonify(payload), 201

    # List all updates (most recent first)
    @app.route('/api/updates', methods=['GET'])
    @jwt_required()
    def list_updates():
        updates = StockUpdate.query.order_by(StockUpdate.created_at.desc()).all()
        return jsonify([u.to_dict() for u in updates])

    # Serve React build (catch-all)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        if path != '' and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    # Initialize database with retry (wait for Postgres)
    with app.app_context():
        retries = 0
        while retries < 30:
            try:
                db.create_all()
                app.logger.info('Database initialized successfully')
                break
            except Exception as e:
                retries += 1
                app.logger.warning(f'Database not ready, retry {retries}/30: {e}')
                time.sleep(2)

    return app


# Expose app and socketio for Gunicorn
app = create_app()
socketio = app.socketio  # type: ignore[attr-defined]


if __name__ == '__main__':
    # Configure basic logging to stdout for container visibility
    logging.basicConfig(level=logging.INFO)
    app.logger.info('Starting Flask development server via socketio.run')
    # Use socketio.run so websockets work in development when running directly
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
