import json

def test_health_check(client):
    """Test health check endpoint."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["status"] == "healthy"
    assert data["environment"] == "testing"

def test_list_members_empty(client):
    """Test that listing members returns an empty list initially in test db."""
    res = client.get("/api/membres")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert isinstance(data["data"], list)

def test_create_member_invalid_schema(client):
    """Test creating a member with missing fields returns 400."""
    payload = {
        "prenom": "Jean"
        # missing nom, statut
    }
    res = client.post("/api/membres", json=payload)
    assert res.status_code == 400
    data = json.loads(res.data)
    assert data["success"] is False
    assert "error" in data

def test_create_member_success(client):
    """Test successful member creation and subsequent retrieval."""
    payload = {
        "prenom": "Jean",
        "nom": "Dupont",
        "email": "jean.dupont@gmail.com",
        "statut": "membre_actif"
    }
    # Create
    res = client.post("/api/membres", json=payload)
    assert res.status_code == 201
    created = json.loads(res.data)
    assert created["success"] is True
    member_id = created["data"]["id"]
    assert created["data"]["prenom"] == "Jean"
    assert created["data"]["nom"] == "Dupont"

    # Get Single
    res_get = client.get(f"/api/membres/{member_id}")
    assert res_get.status_code == 200
    get_data = json.loads(res_get.data)
    assert get_data["data"]["email"] == "jean.dupont@gmail.com"

    # Update
    payload_update = {
        "prenom": "Jean Modified",
        "nom": "Dupont",
        "email": "jean.dupont@gmail.com",
        "statut": "visiteur"
    }
    res_put = client.put(f"/api/membres/{member_id}", json=payload_update)
    assert res_put.status_code == 200
    put_data = json.loads(res_put.data)
    assert put_data["data"]["prenom"] == "Jean Modified"
    assert put_data["data"]["statut"] == "visiteur"

    # Delete
    res_del = client.delete(f"/api/membres/{member_id}")
    assert res_del.status_code == 200
    del_data = json.loads(res_del.data)
    assert del_data["data"]["id"] == member_id

    # Verify deleted
    res_get_deleted = client.get(f"/api/membres/{member_id}")
    assert res_get_deleted.status_code == 404

def test_send_email_integration(client):
    """Test email send integration endpoint validation."""
    payload = {
        "to": "test@gmail.com",
        "subject": "Hello",
        "body": "Welcome to Rehoboth Church!"
    }
    res = client.post("/api/integrations/send-email", json=payload)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["message"] == "Email sent successfully"

def test_create_department_with_chef_success(client):
    """Test creating a department with chef details automatically creates user and member records."""
    payload = {
        "nom": "Jeunesse Réformée",
        "type": "jeunesse",
        "chef_prenom": "Antoine",
        "chef_nom": "Kaya",
        "chef_email": "antoine.kaya@gmail.com",
        "jour_reunion": "Samedi",
        "heure_reunion": "16:00",
        "lieu_reunion": "Salle B",
        "actif": True
    }
    res = client.post("/api/departements", json=payload)
    assert res.status_code == 201
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["nom"] == "Jeunesse Réformée"
    assert data["data"]["responsable_nom"] == "Antoine Kaya"

def test_public_join_department_success(client):
    """Test public membership join route finds/creates member and links to department."""
    # 1. Create a department first
    payload_dept = {
        "nom": "Chorale Céleste",
        "type": "chorale"
    }
    res_dept = client.post("/api/departements", json=payload_dept)
    assert res_dept.status_code == 201
    data_dept = json.loads(res_dept.data)
    dept_id = data_dept["data"]["id"]

    # 2. Public join
    payload_join = {
        "prenom": "Marie",
        "nom": "Sia",
        "email": "marie.sia@gmail.com",
        "telephone": "123456789"
    }
    res_join = client.post(f"/api/departements/{dept_id}/rejoindre", json=payload_join)
    assert res_join.status_code == 201
    data_join = json.loads(res_join.data)
    assert data_join["success"] is True
    assert "rejoint" in data_join["data"]["message"]
