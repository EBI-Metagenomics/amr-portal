def test_filters_config(client):
    response = client.get("/filters-config")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)

def test_amr_records_basic(client):
    payload = {
        "selected_filters": [],
        "page": 1,
        "view_id":1,
        "per_page": 10
    }
    response = client.post("/amr-records", json=payload)
    assert response.status_code == 200
    assert "data" in response.json()


def test_release(client):
    response = client.get("/release")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
