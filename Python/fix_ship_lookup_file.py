__author__ = 'scottsfarley'
import csv
wiki_reader = csv.reader(open("/Users/scottsfarley/documents/wooden_ships_2.0/main/assets/data/ship_lookup.csv", 'rU'))
orig_reader = csv.reader(open("/Users/scottsfarley/documents/wooden_ships_2.0/main/assets/data/ship_lookup_original.csv", 'rU'))

writer = csv.writer(open("/Users/scottsfarley/documents/wooden_ships_2.0/main/assets/data/ship_lookup_fixed.csv", 'w'))

wiki = []
for row in wiki_reader:
    wiki.append(row)

# #
new_rows = []
for row in orig_reader:
    row.append("")#wiki text
    row.append("") #start
    row.append("")#end
    row.append("") #guns
    shipName = row[0]
    startDate = row[-5]
    for w in wiki:
        w_start = w[-5]
        w_name = w[0]
        if w_name == shipName and w_start == startDate:
            row[-1] = w[-1]
            row[-2] = w[-2]
            row[-3] = w[-3]
            row[-4] = w[-4]
    writer.writerow(row)
