import uuid

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_register_and_login():
    email = f"test+{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"
    register_response = client.post('/auth/register', json={
        'name': 'Test User',
        'email': email,
        'password': password,
        'role': 'admin',
    })
    assert register_response.status_code == 200

    login_response = client.post('/auth/login', data={'username': email, 'password': password})
    assert login_response.status_code == 200
    assert 'access_token' in login_response.json()
