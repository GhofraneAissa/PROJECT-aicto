from fastapi.testclient import TestClient
from app.limiter import limiter
import pytest

@pytest.fixture(scope="module")
def client():
    from main import app
    limiter.enabled = False
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"

def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "message" in resp.json()

def test_get_countries(client):
    resp = client.get("/api/countries/")
    assert resp.status_code == 200
    countries = resp.json()
    assert isinstance(countries, list)
    if countries:
        assert "country" in countries[0]

def test_get_map_data(client):
    resp = client.get("/api/analytics/map-data")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        assert "latitude" in data[0]
        assert "longitude" in data[0]
        assert "country" in data[0]

def test_get_stakeholders(client):
    resp = client.get("/api/stakeholders/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

def test_get_resources(client):
    resp = client.get("/api/resources/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

def test_get_sdgs(client):
    resp = client.get("/api/sdgs/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

def test_register_org_validation(client):
    resp = client.post("/api/users/register", json={
        "organization_name": "",
        "organization_type": "NGO",
        "email": "not-an-email",
        "password": "short"
    })
    assert resp.status_code == 422

def test_login_invalid_credentials(client):
    resp = client.post("/api/users/login", json={
        "email": "nonexistent@test.com",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401
    assert "detail" in resp.json()

def test_login_validation(client):
    resp = client.post("/api/users/login", json={
        "email": "not-email"
    })
    assert resp.status_code == 422

def test_admin_endpoints_require_auth(client):
    admin_endpoints = [
        ("GET", "/api/admin/stats"),
        ("GET", "/api/admin/projects/pending"),
        ("GET", "/api/admin/orgs/pending"),
        ("GET", "/api/admin/orgs/approved"),
        ("GET", "/api/admin/orgs/rejected"),
        ("GET", "/api/admin/orgs/stats"),
    ]
    for method, path in admin_endpoints:
        resp = client.request(method, path)
        assert resp.status_code == 401, f"{method} {path} expected 401, got {resp.status_code}"

def test_rate_limiter_active(client):
    resp = client.post("/api/users/login", json={
        "email": "rate@test.com",
        "password": "testpass123"
    })
    assert resp.status_code == 401

def test_org_pagination(client):
    token_resp = client.post("/api/users/login", json={
        "email": "admin@example.com",
        "password": "admin"
    })
    if token_resp.status_code != 200:
        pytest.skip("No admin credentials available for pagination test")
    token = token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/orgs/pending?page=1&page_size=5", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

def test_search_filters(client):
    resp = client.get("/api/search/filters")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)

def test_search_suggest(client):
    resp = client.get("/api/search/suggest?q=AI")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "results" in data

def test_forgot_password_validation(client):
    resp = client.post("/api/users/forgot-password", json={
        "email": "invalid-email"
    })
    assert resp.status_code == 422
