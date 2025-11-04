# Local Development Setup

This guide helps you run the application locally for development without Docker.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+

## Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up PostgreSQL:**
   ```bash
   # Create database
   createdb inventory_db
   
   # Or using psql:
   psql -U postgres
   CREATE DATABASE inventory_db;
   \q
   ```

5. **Set environment variables:**
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=inventory_db
   export DB_USER=your_postgres_user
   export DB_PASSWORD=your_postgres_password
   export JWT_SECRET_KEY=your-dev-secret-key
   ```

   Or create a `.env` file (not included in repo):
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=inventory_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET_KEY=dev-secret-key
   ```

6. **Run the backend:**
   ```bash
   python app.py
   ```

   Backend will run on `http://localhost:5000`

## Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API endpoint (for development):**
   
   Edit `src/api.js` and update the baseURL:
   ```javascript
   const api = axios.create({
     baseURL: 'http://localhost:5000',  // Point to local backend
     // ...
   });
   ```

4. **Run the frontend:**
   ```bash
   npm start
   ```

   Frontend will run on `http://localhost:3000`

## Development Workflow

### Backend Development

**Auto-reload on changes:**
```bash
# Use Flask development mode (already enabled in app.py)
python app.py
```

**Database migrations:**
```python
# In Python shell
from app import app, db
with app.app_context():
    db.drop_all()  # Careful! This deletes all data
    db.create_all()
```

**Test API endpoints:**
```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Get updates (requires token)
curl -X GET http://localhost:5000/api/updates \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Frontend Development

**React DevTools:**
- Install React Developer Tools browser extension
- Use browser console for debugging

**Hot reload:**
- Changes are automatically reflected
- No need to restart the development server

**Build for production:**
```bash
npm run build
```

## Testing

### Backend Tests

Create a `tests` directory:
```bash
mkdir backend/tests
```

Example test file `backend/tests/test_auth.py`:
```python
import pytest
from app import create_app, db
from models import User

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()

def test_register(client):
    response = client.post('/api/auth/register', json={
        'username': 'testuser',
        'password': 'password123'
    })
    assert response.status_code == 201
```

Run tests:
```bash
pytest
```

### Frontend Tests

```bash
npm test
```

## Debugging

### Backend Debugging

Use VS Code debugger with this `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Flask",
      "type": "python",
      "request": "launch",
      "module": "flask",
      "env": {
        "FLASK_APP": "app.py",
        "FLASK_ENV": "development"
      },
      "args": ["run", "--no-debugger", "--no-reload"],
      "jinja": true
    }
  ]
}
```

### Frontend Debugging

Use browser DevTools:
- Network tab for API calls
- Console for errors
- React DevTools for component inspection

## Common Issues

### Backend

**Issue: Database connection error**
```
Solution: Ensure PostgreSQL is running and credentials are correct
```

**Issue: Module not found**
```
Solution: Activate virtual environment and reinstall dependencies
pip install -r requirements.txt
```

### Frontend

**Issue: CORS errors**
```
Solution: Backend CORS is configured for localhost:3000
Ensure backend is running on localhost:5000
```

**Issue: Camera not working**
```
Solution: Use HTTPS or localhost (browsers restrict camera access)
```

## Environment Variables

### Backend
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET_KEY=dev-secret-key
```

### Frontend
```bash
REACT_APP_API_URL=http://localhost:5000
```

## Useful Development Tools

### Database Management
- **pgAdmin**: GUI for PostgreSQL
- **DBeaver**: Universal database tool
- **psql**: Command-line interface

### API Testing
- **Postman**: API testing tool
- **curl**: Command-line HTTP client
- **httpie**: User-friendly curl alternative

### Code Quality
```bash
# Backend
pip install black flake8 pylint
black .
flake8 .

# Frontend
npm run lint
```

## Next Steps

After development:
1. Test thoroughly in development
2. Build production images: `docker-compose build`
3. Deploy to Docker Swarm using `./deploy.sh`
4. Monitor logs and performance

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
