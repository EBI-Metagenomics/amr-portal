def test_amr_records_basic(client):
    payload = {
        "selected_filters": [],
        "page": 1,
        "view_id":1,
        "per_page": 10
    }
    response = client.post("/amr-records", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "meta" in data
    assert "data" in data
    assert isinstance(data["data"], list)
