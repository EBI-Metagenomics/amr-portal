import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    """Test client with base URL handling"""
    with TestClient(app) as test_client:
        # Create a wrapper that automatically prefixes endpoints with /api
        class APIClient:
            def __init__(self, client):
                self.client = client
                self.base_url = "/api"

            def get(self, endpoint: str, **kwargs):
                return self.client.get(f"{self.base_url}{endpoint}", **kwargs)

            def post(self, endpoint: str, **kwargs):
                return self.client.post(f"{self.base_url}{endpoint}", **kwargs)

            def put(self, endpoint: str, **kwargs):
                return self.client.put(f"{self.base_url}{endpoint}", **kwargs)

            def delete(self, endpoint: str, **kwargs):
                return self.client.delete(f"{self.base_url}{endpoint}", **kwargs)

            def patch(self, endpoint: str, **kwargs):
                return self.client.patch(f"{self.base_url}{endpoint}", **kwargs)

        yield APIClient(test_client)
