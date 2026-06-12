def test_filters_config(client):
    response = client.get("/filters-config")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)


def test_amr_records_browse_all_without_filters_or_search(client):
    payload = {
        "selected_filters": [],
        "page": 1,
        "view_id": 1,
        "per_page": 10,
    }
    response = client.post("/amr-records", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "meta" in data
    assert "data" in data
    assert data["meta"]["total_hits"] > 0
    assert len(data["data"]) == 10


def test_amr_records_with_search(client):
    payload = {
        "selected_filters": [],
        "search_query": "amik",
        "page": 1,
        "view_id": 1,
        "per_page": 10,
    }
    response = client.post("/amr-records", json=payload)
    assert response.status_code == 200
    assert "data" in response.json()


def test_amr_facets_basic(client):
    payload = {
        "selected_filters": [],
        "view_id": 1,
        "facet_paging": {},
    }
    response = client.post("/amr-facets", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "facets" in data
    assert "data_type" in data


def test_release(client):
    response = client.get("/release")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
