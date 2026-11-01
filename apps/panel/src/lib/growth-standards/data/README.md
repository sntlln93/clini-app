# WHO growth tables (#363)

L, M and S (Box-Cox power, median and coefficient of variation) by sex and
age, for weight, length/height, BMI and head circumference for age. Each
file holds `male` and `female` rows as `[ageDays, L, M, S]`.

## Sources

Downloaded from the WHO on 2026-11-01, unmodified except for the sampling
below:

| Ages | Publication | Files (`https://cdn.who.int/media/docs/default-source/child-growth/…`) |
|---|---|---|
| 0–1856 days (0–5 years), by day | WHO Child Growth Standards (2006), expanded percentile tables | `child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-{boys,girls}-percentiles-expanded-tables.xlsx`, `…/length-height-for-age/expandable-tables/lhfa-{boys,girls}-percentiles-expanded-tables.xlsx`, `…/body-mass-index-for-age/expanded-tables/bfa-{boys,girls}-percentiles-expanded-tables.xlsx`, `…/head-circumference-for-age/expanded-tables/hcfa-{boys,girls}-percentiles-expanded-tables.xlsx` |
| 61–228 months (5–19 years), by month | WHO Growth Reference 2007, expanded percentile tables | `growth-reference-5-19-years/height-for-age-(5-19-years)/hfa-{boys,girls}-perc-who2007-exp.xlsx`, `…/bmi-for-age-(5-19-years)/bmi-{boys,girls}-perc-who2007-exp.xlsx`, and weight for age (61–120 months), published under `…/weight-for-age-(5-10-years)/hfa-boys-perc-who2007-exp_07eb5053-9a09-4910-aa6b-c7fb28012ce6.xlsx` and `hfa-girls-perc-who2007-exp_6040a43e-81da-48fa-a2d4-5c856fe4fe71.xlsx` (the WHO's file name says `hfa`; the sheet is `wfa_*_perc_WHO2007_exp`) |

SHA-256 of the files used:

```text
c4e251201c6cd352fbdd7797a7a298aff8c78b7525bd242fedec4494f3ccb095  wfa-boys-percentiles-expanded-tables.xlsx
5bdfd79de222d0f660c1662adc02995e879374f5b3260571a357a2ec771da629  wfa-girls-percentiles-expanded-tables.xlsx
8e163405223fcdf749f6689a8b8233d15182117c8a8b87f46c957fcfc498c7f2  lhfa-boys-percentiles-expanded-tables.xlsx
92b5b0306d87f32eeb1d0c68f32aceda55121ff9a2600af517ba2a5b8dc84851  lhfa-girls-percentiles-expanded-tables.xlsx
b4b0fdf7d8613e6035a91910e5f554a28276d415ab066c8d49da1521a5cb38a3  bfa-boys-percentiles-expanded-tables.xlsx
b89cfc51dd733f48e63d56d9f66016ccfed7156774b23c745f0f25e909c75e47  bfa-girls-percentiles-expanded-tables.xlsx
3e4d401a557841a93d56d552889d2778e4ad4e42585c8d768f5514aaf65979ff  hcfa-boys-percentiles-expanded-tables.xlsx
3e097ab1c73c9b376faea2bde2f10de761efbde486c9d6092a8ef63d21f2a5ff  hcfa-girls-percentiles-expanded-tables.xlsx
9aaf9f08039f84c64d1a1c95b94286cbe0e87e43409fcd009e5fe0cc67ac66ea  hfa-boys-perc-who2007-exp.xlsx
0f04c643731981f92f0069475bbcc39451fc5ce937b5de2c8da6fa20bf5dff3c  hfa-girls-perc-who2007-exp.xlsx
e5dc43f1e6b245f83dfa5e19d1a2023e15bee757004269e9d0bc17fbc512d533  bmi-boys-perc-who2007-exp.xlsx
b45ad98d39f2a2723152ad3d80bf7c4735264513574dea6340209b07172e0b27  bmi-girls-perc-who2007-exp.xlsx
33ebb6e89e64599d093fc78091941047881793a0baed79ce3528749588ad397b  wfa-boys-perc-who2007-exp (hfa-boys-perc-who2007-exp_07eb…).xlsx
3a2c217d6220f53d55c366f7661ab07f6f241e0653849f04165ba45f342bea0b  wfa-girls-perc-who2007-exp (hfa-girls-perc-who2007-exp_6040…).xlsx
```

Both publications are closed: the WHO hasn't revised the 2006 standards or
the 2007 reference. A new revision would be a new set of files here, built
the same way.

## Ages

Ages are days since birth; a 2007 month counts `month × 30.4375` days, so
61 months is day 1856.6875. The WHO publishes no weight for age past ten
years (it can't tell height from weight gain in puberty; BMI covers it) and
no head circumference past five.

The length/height table measures lying down up to 730 days and standing up
from 731, so the median drops about 0.7 cm overnight: the measurement is
assumed taken that way.

## Sampling

The standards are daily (1857 rows per sex). To keep the bundle small this
folder keeps every day of the first two weeks, every week up to 182 days and
the day nearest each month after (`round(month × 30.4375)`), plus days 730,
731 and 1856. Linear interpolation of L, M and S between those rows stays
within 0.012 SD of the daily table at every day (under half a percentile
point); the 2007 reference is kept whole. `who-growth.test.ts` checks the
curves against the WHO's published P3, P15, P50, P85 and P97.

`extract.py` rebuilds the JSON files from the WHO files (its docstring says
how to run it in a disposable container).
