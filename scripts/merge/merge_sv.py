import sys
import os
import csv


def find_files(target_path: str, prefix: str, extension: str) -> [str]:
    return [
        os.path.join(target_path, f) for f in os.listdir(target_path)
        if f.startswith(prefix) and f.endswith(extension)
    ]


def get_delimiter(path):
    if path.endswith("tsv"):
        return "\t"
    else:
        return ","



def merge_tsv(path, pattern, output):
    files = [
        os.path.join(path, f) for f in os.listdir(path)
        if f.startswith(pattern) and f.endswith("sv")
    ]

    print(f"Found: {len(files)} files to merge")

    # check columns
    headers = {}
    for f in files:
        with open(f) as sv_file:
            delimiter = get_delimiter(f)
            merge_reader = csv.DictReader(sv_file, delimiter=delimiter)
            headers[f] = merge_reader.fieldnames

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

    # merge
    with open(output, "w") as merge_out:
        writer = csv.DictWriter(
            merge_out,
            fieldnames=merged_headers
            )

        writer.writeheader()
        count = 0
        for f in files:
            with open(f) as tsv_file:
                delimiter = get_delimiter(f)
                merge_reader = csv.DictReader(tsv_file, delimiter=delimiter)
                for row in merge_reader:
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


if __name__ == "__main__":
    if len(sys.argv) > 3:
        merge_tsv(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print(f"Expected: {sys.argv[0]} [SOURCE PATH] [MATCH PATTERN] [OUTPUT]")