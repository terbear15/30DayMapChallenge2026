# Data sources

These files are cached to make the maps reproducible. Source data retains its original license and terms; inclusion here does not relicense third-party data.

## Day 01 — Syracuse restaurants

`day01_points/osm.json.gz` contains the compressed OpenStreetMap snapshot used for streets, waterways, and restaurant locations. `geocodes.json` contains four cached address lookups. `restaurants.csv` records each location, verified street address, official website, OSM object identifier, and location note.

OpenStreetMap data is © OpenStreetMap contributors under the [Open Database License](https://www.openstreetmap.org/copyright). Some points represent address locations rather than surveyed entrances. The York's OSM address point carries an older tenant name, so the current restaurant identity was checked against its official website. Lemon Grass uses its current Walton Street address.

The selection includes The York, Lemon Grass, Dinosaur Bar-B-Que, Pastabilities, Apizza Regionale, Francesca's Cucina, Eden, and Phoebe's. It is a curated guide, not a ratings-based ranking or a claim that all restaurants have the same price level. Venue websites are listed in the CSV.

## Day 02 — Philadelphia buses

The pinned source is [SEPTA feed v202611010](https://github.com/septadev/GTFS/releases/tag/v202611010), with authoritative bus dates November 1, 2026 through February 20, 2027. The visualization selects scheduled service for Monday, November 2, 2026, using calendar exceptions and boarding-permitted stop calls. Only GTFS bus routes (`route_type=3`) are included.

`day02_lines/derived/map-data.rds` contains the data needed to redraw the images offline. CSVs provide all 112 city-intersecting routes, University City stops, labeled boarding locations, and checked headsign/direction combinations. The derived geometry is in NAD83 / UTM zone 18N (EPSG:26918).

The original raw ZIP and expanded GTFS tables are not committed. To rebuild from the original source:

```r
source("R/day02_download.R")
source("R/day02_prepare.R")
source("Scripts/day02_lines_philadelphia_buses.R")
source("R/day02_validate.R")
```

The download helper pins the release and checks its SHA-256. City boundary and district polygons are cached from the [City of Philadelphia](https://opendataphilly.org/), subject to its published terms.

The eight nearby daytime routes are 21, 30, 31, 40, 42, 49, LUCY Gold, and LUCY Green. Nearby means within 450 metres straight-line distance of the approximate 34th & Walnut intersection, not a walking-time or accessible-route estimate. The University City District polygon identifies 19 routes with boarding stops; school routes 411 and 415 and the L1 overnight bus are kept in the background, leaving 16 regular daytime routes highlighted.

## Day 03 — Philadelphia parks

The official [Parks layer](https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Parks/FeatureServer/0) describes land that Philadelphia Parks & Recreation manages, maintains, or has a distinct role in. It contains 389 source records. `feature-count.json` is checked against the downloaded GeoJSON to detect truncation.

The data includes parks, playgrounds, recreation sites, and some other PPR properties. It is not a vegetation inventory. Campus and privately managed green spaces may be absent, and boundaries can contain buildings or paving. The cached layer metadata records an April 7, 2025 edit date; retrieval on November 3, 2026 does not mean all sites were surveyed that day.

`park-sizes.csv` records area after clipping to the city boundary. Classes are under 10 acres, 10 to under 100 acres, and 100 acres or more. Multipart sites are measured as one source record. These are size categories, not park quality, access, or tree-cover categories.

The Schuylkill polygons come from the Water Department's [Hydrology dataset](https://opendataphilly.org/datasets/hydrology/). Water geometry extends up to 1.5 km beyond the city boundary for a soft fade; park geometry remains city-clipped. The opacity gradient is decorative.
