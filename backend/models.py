from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    """User model for authentication."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    stock_updates = db.relationship('StockUpdate', back_populates='user', lazy=True)
    
    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if the provided password matches the hash."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Serialize user to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<User {self.username}>'


class Product(db.Model):
    """Product model for inventory items."""
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    qr_identifier = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    stock_updates = db.relationship('StockUpdate', back_populates='product', lazy=True)
    
    def to_dict(self):
        """Serialize product to dictionary."""
        return {
            'id': self.id,
            'qr_identifier': self.qr_identifier,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Product {self.name} ({self.qr_identifier})>'


class StockUpdate(db.Model):
    """Stock update model for tracking inventory status changes."""
    __tablename__ = 'stock_updates'
    
    # Status choices
    STATUS_OUT_OF_STOCK = 'Out of Stock'
    STATUS_NEAR_OUT_OF_STOCK = 'Near Out of Stock'
    STATUS_ORDERED = 'Ordered'
    STATUS_RESTOCKED = 'Restocked'
    
    VALID_STATUSES = [
        STATUS_OUT_OF_STOCK,
        STATUS_NEAR_OUT_OF_STOCK,
        STATUS_ORDERED,
        STATUS_RESTOCKED
    ]
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    
    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    # Relationships
    user = db.relationship('User', back_populates='stock_updates')
    product = db.relationship('Product', back_populates='stock_updates')
    
    def to_dict(self, include_relations=True):
        """Serialize stock update to dictionary."""
        data = {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'status': self.status,
            'notes': self.notes,
            'image_url': self.image_url,
            'user_id': self.user_id,
            'product_id': self.product_id
        }
        
        if include_relations:
            data['user'] = self.user.to_dict() if self.user else None
            data['product'] = self.product.to_dict() if self.product else None
        
        return data
    
    def __repr__(self):
        return f'<StockUpdate {self.id} - {self.status}>'
