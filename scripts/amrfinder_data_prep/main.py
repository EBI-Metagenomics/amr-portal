import os
import sys
import configparser
from ftplib import FTP
import csv

import requests


def get_delimiter(path):
    if path.endswith("tsv"):
        return "\t"
    else:
        return ","


def get_results_from_path(results, path:str) -> str:
    path_bits = path.split('.')
    obj = results

    for bit in path_bits:
        if bit.isnumeric():
            bit = int(bit)
        obj = obj[bit]
        
    return obj


def merge_files(path:str, files:list[dict]):
    print(f"Found: {len(files)} files to merge")
    output = os.path.join(path,"amrfinder.csv")

    # check columns
    headers = {}
    for f in files:
        with open(f["path"]) as f_stream:
            delimiter = get_delimiter(f["path"])
            merge_reader = csv.DictReader(f_stream, delimiter=delimiter)
            headers[f["path"]] = merge_reader.fieldnames

    merged_headers = []
    print("Checking columns")
    for file, header in headers.items():
        if len(merged_headers) == 0:
            merged_headers = header
        else:
            for h in header:
                if h not in merged_headers:
                    print(f"ERROR! {f} \ncontains an unexpected column name {h}")
                    sys.exit(-1)
    print("Columns good, merging")
    
    # add aditional columns
    first_file = files[0]
    for col in first_file["columns"].keys():
        merged_headers.append(col)

    # merge
    with open(output, "w") as merge_out:
        writer = csv.DictWriter(
            merge_out,
            fieldnames=merged_headers
            )

        writer.writeheader()
        count = 0
        for f in files:
            with open(f["path"]) as tsv_file:
                delimiter = get_delimiter(f["path"])
                merge_reader = csv.DictReader(tsv_file, delimiter=delimiter)
                for row in merge_reader:
                    for k,v in f["columns"].items():
                        row[k] = v
                    writer.writerow(row)
                    count += 1
        print(f"Merged! {count} rows written")
    
    #Rewrite headers
    with open(output, "r+") as fix_out:
        fix_headers = [
            h.replace(' ','_') for h in merged_headers
        ]
        writer = csv.DictWriter(
            fix_out,
            fieldnames=fix_headers
            )

        writer.writeheader()


def build_release(release_path: str, config_path: str):
    # check config and set variables
    if os.path.exists(release_path):
        print("ERROR: release path already exists")
        return
    
    if not os.path.exists(config_path):
        print("ERROR: no config found!")
    
    config = configparser.ConfigParser()
    config.read(config_path)
    
    ftp_domain = config["ftp"]["domain"]
    ftp_path = config["ftp"]["path"]
    target = config["ftp"]["target_files"]
    
    # create release dir
    os.mkdir(release_path)
    
    # get amr finder files
    print(f"Connecting to: [{ftp_domain}]")
    
    ftp = FTP(ftp_domain)
    ftp.login()
    ftp.cwd(ftp_path)
    files = ftp.nlst()
    
    target_files = [f for f in files if f.startswith(target)]
    gca_files = []
    for tf in target_files:
        gca = tf[0:tf.rfind('_')]
        tf_path = os.path.join(release_path, tf)
        gca_obj = {
            "gca":gca,
            "path":tf_path
        }
        with open(tf_path, 'wb') as tf_stream:
            ftp.retrbinary(f"RETR {tf}", tf_stream.write)
        gca_files.append(gca_obj)
    
    ftp.quit()
    print(f"{len(gca_files)} downloaded")
    
    # get species details
    print("Accessing species information")
    species_details_url = config["gca"]["api"]
    column_details = {}
    for v in config["gca"]:
        if v == "api":
            continue
        column_details[v] = config["gca"][v]
    
    for gca_obj in gca_files:
        results = requests.get(species_details_url.format(gca_obj["gca"]))
        gca_obj["columns"] = {}
        if results.ok:
            for col,col_path in column_details.items():
                gca_obj["columns"][col] = get_results_from_path(results.json(), col_path)
    
    
    # process and merge
    merge_files(release_path, gca_files)

def main():
    print("Hello from amrfinder-data-prep!")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Expected usage")
        print(f"{sys.argv[0]} [RELEASE_PATH] [CONFIG_PATH]")
        sys.exit(-1)
    
    build_release(sys.argv[1], sys.argv[2])
