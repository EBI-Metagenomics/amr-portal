import numpy as np

from backend.services.serializer import serialize_amr_record

COLUMN_DETAILS = {
    "col_a":{
        "type":"string",
    },
    "col_b":{
        "type":"link",
        "url":"http://unit/test/{}"
    },
    "col_c":{
        "type":"array-link",
        "url":"http://array/link/{}",
        "delimiter":","
    },
    "col_d":{
        "type":"labelled-link",
    }
}

ROW = {
    "col_a":"a_string",
    "col_b":"a_link",
    "col_c":"link1,link2,link3",
    "col_d":"label|link"
}

def test_serialize_amr_record_happy_tests():
    results = serialize_amr_record(
        ROW,
        COLUMN_DETAILS
    )
    
    assert len(results) == 4
    
    #check column ids
    columns = [k for k in COLUMN_DETAILS.keys()]
    for r in results:
        assert r["column_id"] in columns
    
    #check column types
    assert results[0]["type"] == "string"
    assert results[1]["type"] == "link"
    assert results[2]["type"] == "array-link"
    assert results[3]["type"] == "link"
    
    #check values
    assert results[0]["value"] == ROW[columns[0]]
    assert results[1]["value"] == ROW[columns[1]]
    
    #check array-link values / url
    assert results[2]["values"]
    assert len(results[2]["values"]) == 3
    for x in range(0,3):
        assert results[2]["values"][x]["url"] == f"http://array/link/link{x+1}"
        assert results[2]["values"][x]["value"] == f"link{x+1}"
    
    #check labelled-link value / url
    labelled_link = ROW[columns[3]].split("|")
    assert results[3]["value"] ==labelled_link[0]
    assert results[3]["url"] ==labelled_link[1]
    
    #check extras
    assert results[1]["url"] == f"http://unit/test/{ROW[columns[1]]}"


def test_sad_records_basic():

    for value_of_nope in [None, "", "nan"]:
    
        sad_row = {
            "col_d":value_of_nope
        }
        
        results = serialize_amr_record(
            sad_row,
            COLUMN_DETAILS
        )
        
        assert len(results) == 1
        assert results[0]["type"] == "link"
        
        
        assert results[0]["value"] in [None, '']
    
    
    
    
    