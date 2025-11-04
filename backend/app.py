import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import Config
from models import db, User, Product, StockUpdate
from auth import auth_bp

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def save_uploaded_file(file):
    """Save an uploaded file and return its URL."""
    if file and allowed_file(file.filename):
        # Generate unique filename
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Return public URL
        return f"/uploads/{unique_filename}"
    
    return None


# Register blueprints
app.register_blueprint(auth_bp)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200


@app.route('/api/updates', methods=['POST'])
@jwt_required()
def create_update():
    """Create a new stock update."""
    try:
        # Get current user ID from JWT
        current_user_id = get_jwt_identity()
        
        # Get form data
        qr_identifier = request.form.get('qr_identifier')
        status = request.form.get('status')
        notes = request.form.get('notes', '')
        
        # Validation
        if not qr_identifier:
            return jsonify({'error': 'QR identifier is required'}), 400
        
        if not status:
            return jsonify({'error': 'Status is required'}), 400
        
        if status not in StockUpdate.VALID_STATUSES:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(StockUpdate.VALID_STATUSES)}'}), 400
        
        # Find or create product
        product = Product.query.filter_by(qr_identifier=qr_identifier).first()
        if not product:
            # Create new product with QR identifier as name (can be updated later)
            product = Product(
                qr_identifier=qr_identifier,
                name=f"Product {qr_identifier}"
            )
            db.session.add(product)
            db.session.flush()  # Get product ID without committing
        
        # Handle image upload
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                image_url = save_uploaded_file(file)
        
        # Create stock update
        stock_update = StockUpdate(
            user_id=current_user_id,
            product_id=product.id,
            status=status,
            notes=notes,
            image_url=image_url,
            timestamp=datetime.utcnow()
        )
        
        db.session.add(stock_update)
        db.session.commit()
        
        # Query the complete update with relations
        created_update = StockUpdate.query.filter_by(id=stock_update.id).first()
        update_data = created_update.to_dict(include_relations=True)
        
        # Emit Socket.IO event for real-time updates
        socketio.emit('new_update', update_data, broadcast=True, namespace='/')
        
        return jsonify({
            'message': 'Stock update created successfully',
            'update': update_data
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating update: {str(e)}")
        return jsonify({'error': f'Failed to create update: {str(e)}'}), 500


@app.route('/api/updates', methods=['GET'])
@jwt_required()
def get_updates():
    """Get all stock updates."""
    try:
        # Query all updates with user and product relations, ordered by timestamp descending
        updates = StockUpdate.query.order_by(StockUpdate.timestamp.desc()).all()
        
        # Serialize updates
        updates_data = [update.to_dict(include_relations=True) for update in updates]
        
        return jsonify({
            'updates': updates_data,
            'count': len(updates_data)
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching updates: {str(e)}")
        return jsonify({'error': f'Failed to fetch updates: {str(e)}'}), 500


@app.route('/api/products', methods=['GET'])
@jwt_required()
def get_products():
    """Get all products."""
    try:
        products = Product.query.all()
        products_data = [product.to_dict() for product in products]
        
        return jsonify({
            'products': products_data,
            'count': len(products_data)
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching products: {str(e)}")
        return jsonify({'error': f'Failed to fetch products: {str(e)}'}), 500


@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    print('Client connected')
    emit('connected', {'data': 'Connected to server'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    print('Client disconnected')


def create_app():
    """Application factory function."""
    # NOTE: don't run create_all() here — running migrations / schema creation
    # from every replica causes race conditions when multiple backend
    # containers start at once (race -> duplicate catalog entries / crashes).
    # Schema should be created once by a maintainer or by a controlled
    # initialization job (see init_db.py).

    return app


if __name__ == '__main__':
    application = create_app()
    # Run with SocketIO for development
    socketio.run(application, host='0.0.0.0', port=5000, debug=True)
