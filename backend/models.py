from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updates = db.relationship('StockUpdate', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
        }


class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(255), unique=True, nullable=False)  # QR code or SKU
    name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updates = db.relationship('StockUpdate', backref='product', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
        }


class StockUpdate(db.Model):
    __tablename__ = 'stock_updates'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self, include_relations: bool = True):
        data = {
            'id': self.id,
            'product_id': self.product_id,
            'user_id': self.user_id,
            'status': self.status,
            'notes': self.notes,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
        }
        if include_relations:
            data['product'] = self.product.to_dict() if self.product else None
            data['user'] = self.user.to_dict() if self.user else None
        return data
