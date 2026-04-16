import sys
import re
import csv


def clean_column_names(columns: [str]) -> [str]:
    regex = "[a-z][A-Z][a-z]"
    clean_headers = []
    for f in columns:
        n = ""
        if "_" in f:
            n = f
        elif " " in f:
            n = f.replace(" ", "_")
        else:
            hits = re.findall(regex, f)
            if len(hits) == 0:
                n = f
            else:
                index = 0
                for h in hits:
                    i = f.index(h, index)
                    n += f[index:i] + h[0] + "_" + h[1].lower() + h[2]
                    index = i + len(h)
                n += f[index:]
        # remove asterisk
        n = n.replace("*", "")
        clean_headers.append(n)
    return clean_headers


def process(input_csv: str, output_csv: str) -> bool:
    print(f"Converting {input_csv}")

    with open(input_csv) as csv_in_file:
        reader = csv.DictReader(csv_in_file)
        clean_headers = clean_column_names(reader.fieldnames)
        with open(output_csv, "w", newline="") as csv_out_file:
            writer = csv.DictWriter(csv_out_file, fieldnames=clean_headers)
            writer.writeheader()
            for row in reader:
                clean_row = {
                    clean_headers[i]: row[reader.fieldnames[i]]
                    for i in range(len(reader.fieldnames))
                }
                writer.writerow(clean_row)
    return True


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        result = process(sys.argv[1], sys.argv[2])
        if result:
            print("Success")
        else:
            print("Something went wrong")
    else:
        print("Unexpected input, expect input csv and output csv")
