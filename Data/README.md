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

## Day 04 — Manhattan café clusters

`day04_clusters/cafes.json` caches OpenStreetMap features tagged `amenity=cafe`, queried with Overpass. This can include tea shops and bakery cafés as well as coffee shops; coffee-selling venues without that tag are omitted. Data is © OpenStreetMap contributors under the [ODbL](https://www.openstreetmap.org/copyright). The source timestamp is November 4, 2026 at 01:22 UTC, corresponding to the evening of November 3 in New York.

`manhattan-borough.geojson` is the Manhattan feature from [NYC DCP's borough boundaries](https://data.cityofnewyork.us/City-Government/Borough-Boundaries/gthc-hcne). The renderer uses its largest land polygon: Manhattan island, excluding Roosevelt Island, Governors Island, Marble Hill, and other detached borough territory. Geometry and café locations are projected to NAD83 / UTM zone 18N (EPSG:26918) for distance calculations.

The source contained 1,276 mapped café records on the island. A deterministic review removed five likely duplicate representations: matching normalized names within 25 metres. Unnamed venues and different names were retained. This is a heuristic, not proof of business identity; the removed IDs and distances are preserved in `duplicate-review.csv`. OSM object IDs are checked for duplicates separately.

The resulting 1,271 locations are clustered with DBSCAN, using a 140-metre neighborhood and minPts=5, including the core café itself. A core café has at least five locations in its neighborhood; connected core neighborhoods form groups, and neighboring border cafés join them. A chain of neighborhoods can extend much farther than 140 metres. Shared border points are assigned deterministically, so an assigned group can contain fewer than five members even though it has a qualifying core neighborhood. The result is 58 groups, with 812 locations assigned to clusters and 459 outside them. `sensitivity.csv` records alternative 100m and 180m settings; the parameter affects the groups and is exploratory.

Terracotta denotes cluster membership throughout the figure, without implying cuisine, ratings, price, brand, or popularity. Gray indicates cafés outside the selected clustering definition. Light buffered convex envelopes illustrate groups; they are not neighborhood boundaries, walking catchments, or observed areas of continuous café activity. All three detail panels use the same classifications as the island overview, with geographic enlargement of approximately 2.5–3 times. Missing or sparse points may reflect uneven OSM mapping, and the figure is not evidence that an area has no cafés.

`cafes-clustered.csv` contains the final records and group IDs. `methods.json` contains counts, scope, source timestamp, parameters, and validation status. The daily script renders offline from these cached source files. `R/day04_download.R` can fetch missing sources; a fresh download will represent a different snapshot.

## Day 06 — Philadelphia as the federal capital

The cached John Hills 1796 Philadelphia plan supplies the historical street geometry. The poster is an annotated reproduction with a district detail and timeline. The four site anchors are approximate source-image pixel locations. Source links, rights, crop bounds, annotation methods, and landmark histories are in [day06_vintage/README.md](day06_vintage/README.md).
