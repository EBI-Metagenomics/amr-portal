import numpy as np

KNOWN_ATTRIBUTES = ["type","sortable", "url", "delimiter"]

def serialize_amr_record(row, column_details:dict):
    def val(key):
        v = row.get(key)
        return None if v in [None, "nan", np.nan, np.inf, -np.inf] else v

    result = []
    keys = row.keys()

    for col in keys:
        v = val(col)
        
        if col in column_details:
            # Add column detail attributes to cell
            cd = column_details[col]
            cell_obj = {
                cd_k:cd_v for cd_k, cd_v in cd.items() 
                if cd_k in KNOWN_ATTRIBUTES and cd_v is not None
            }
            # set default type if missing
            cell_obj["type"] = cell_obj.get("type") or "string"

            # handle types
            if cell_obj["type"] == "link":
                if "url" in cell_obj and v:
                    cell_obj["url"] = cell_obj["url"].format(v)
                else:
                    cell_obj["url"] = None
                cell_obj["value"] = v
            elif cell_obj["type"] == "labelled-link":
                cell_obj["type"] = "link" #switch type to url for client
                cell_obj["value"] = v
                if v:
                    v_bits = v.split('|')
                    
                    if len(v_bits) >= 2:
                        cell_obj["url"] = v_bits[1]
                        cell_obj["value"] = v_bits[0]
                        
            elif cell_obj["type"] == "array-link":
                if set(("delimiter","url")) <=  cell_obj.keys() and v:
                    v_bits = v.split(cell_obj["delimiter"])
                    elements = [
                        { 
                            "value": vb, 
                            "url": cell_obj["url"].format(vb) 
                        }
                        for vb in v_bits
                    ]
                    cell_obj["values"] = elements
                else:
                    cell_obj["values"] = []
                del cell_obj["url"]
                del cell_obj["delimiter"]     
            else:
                cell_obj["value"] = v

            cell_obj["column_id"] = col
            result.append(cell_obj)
        else:
            result.append({
                "type": "string",
                "column_id": col,
                "value": v
            })
        
    return result
