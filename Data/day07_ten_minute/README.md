# Day 07 — Philly / After Dark

The poster uses the City of Philadelphia's street centerlines and Philadelphia Water Department hydrographic polygons, downloaded November 7, 2026.

## Data

- Street layer. https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Street_Centerline/FeatureServer/0
- Street documentation. https://opendataphilly.org/datasets/street-centerlines/
- River layer. https://services.arcgis.com/fLeGjb7u4uXqeF9q/ArcGIS/rest/services/Hydrographic_Features_Poly/FeatureServer/1

The street query used the geographic envelope −75.235, 39.90, −75.115, 40.015, spatial intersection, with all pages ordered by objectid in batches of 2,000. The cached GeoPackage contains 20,052 segments with unique object IDs. Attributes retained are objectid, seg_id, st_name, and class. River names containing Schuylkill or Delaware returned 321 features, matching the service count. Both layers are stored in NAD83 / UTM zone 18N, EPSG:26918. River geometry was made valid before export.

Gold highlights six named corridors — Broad, Market, Benjamin Franklin, Lancaster, Baltimore, and Frankford. The colors are a graphic treatment inspired by night. They do not measure nighttime illumination, traffic, or street activity. The map is cropped around central Philadelphia and does not depict the whole city. Source coverage supplies Philadelphia streets, so roads across the Delaware in New Jersey are outside the street dataset.

## Timing

Design discussion, the illustrative concept, source research, data downloads, validation, and projection happened before the timer. The assisted script build, two renders, and visual checks ran from 2026-11-07 05:38:08 UTC to 05:38:30 UTC (22 seconds). Documentation, copying, and GitHub publication happened afterward. This is an assisted timed map using prepared data.

## Reproduce

Install sf, ragg, and png. From the repository root run source("Scripts/day07_ten_minute_philly_after_dark.R"). The script also accepts a data directory and output PNG path through Rscript. Bundled GeoPackages support offline reproduction of the poster and square thumbnail.

Third-party source data retains its original terms. The street layer is intended for reference mapping rather than engineering measurements.
