"""Builds the WHO growth tables in this folder from the WHO's own files.

Save the WHO files listed in README.md in ./who as {wfa,lhfa,bfa,hcfa}-
{boys,girls}.xlsx (2006 standards) and {wfa,hfa,bmi}2007-{boys,girls}.xlsx
(2007 reference), then run from the repository root:

    docker run --rm -v "$PWD:/w" -w /w python:3.13-slim sh -c \
      "pip install -q openpyxl && python -I \
       apps/panel/src/lib/growth-standards/data/extract.py who"
"""

import json
import sys
from pathlib import Path

import openpyxl

DAYS_PER_MONTH = 30.4375
# The standards are daily: keep every day of the first two weeks, every week
# up to six months and every month after, plus the day before and after the
# switch from length to height at 731 days. Linear interpolation between
# them stays within 0.012 SD of the daily table (README.md).
STANDARD_DAYS = sorted(
    set(range(0, 15))
    | set(range(14, 183, 7))
    | {round(month * DAYS_PER_MONTH) for month in range(6, 61)}
    | {730, 731, 1856}
)
INDICATORS = {
    "weight-for-age": ("wfa-{sex}.xlsx", "wfa2007-{sex}.xlsx"),
    "length-height-for-age": ("lhfa-{sex}.xlsx", "hfa2007-{sex}.xlsx"),
    "bmi-for-age": ("bfa-{sex}.xlsx", "bmi2007-{sex}.xlsx"),
    "head-circumference-for-age": ("hcfa-{sex}.xlsx", None),
}
SEXES = {"male": "boys", "female": "girls"}


def rows(path):
    sheet = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    values = list(sheet.iter_rows(values_only=True))
    return [dict(zip(values[0], row)) for row in values[1:] if row[0] is not None]


def lms(row, age):
    return [age, row["L"], row["M"], row["S"]]


def main(source):
    out = Path(__file__).parent
    for indicator, (standard, reference) in INDICATORS.items():
        table = {}
        for sex, who_sex in SEXES.items():
            daily = rows(source / standard.format(sex=who_sex))
            table[sex] = [lms(daily[day], day) for day in STANDARD_DAYS]
            if reference:
                for row in rows(source / reference.format(sex=who_sex)):
                    table[sex].append(lms(row, row["Month"] * DAYS_PER_MONTH))
        lines = ",\n".join(
            f'  "{sex}": [\n'
            + ",\n".join("    " + json.dumps(entry) for entry in entries)
            + "\n  ]"
            for sex, entries in table.items()
        )
        (out / f"{indicator}.json").write_text("{\n" + lines + "\n}\n")


main(Path(sys.argv[1]))
