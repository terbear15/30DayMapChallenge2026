# Public OpenStreetMap snapshot. Cached files keep the map reproducible offline.
dir.create("Data/day01_points", showWarnings = FALSE)
library(httr2)
library(jsonlite)
query <- '[out:json][timeout:90];(way["highway"](43.023,-76.174,43.072,-76.108);way["waterway"](43.023,-76.174,43.072,-76.108);nwr["amenity"~"restaurant|cafe|food_court"](43.023,-76.174,43.072,-76.108););out center geom;'
if (!file.exists("Data/day01_points/osm.json")) {
  for (endpoint in c("https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter")) {
    result <- tryCatch({
      request(endpoint) |> req_url_query(data = query) |>
        req_user_agent("SyracuseFoodMap/1.0 educational cartography") |>
        req_timeout(120) |> req_perform(path = "Data/day01_points/osm.json")
      TRUE
    }, error = function(e) {message(conditionMessage(e)); FALSE})
    if (result) break
  }
}
x <- fromJSON("Data/day01_points/osm.json", simplifyVector = FALSE)
stopifnot(length(x$elements) > 100)
food <- Filter(function(e) !is.null(e$tags$name) && !is.null(e$tags$amenity), x$elements)
for (e in food) {
  if (grepl("pasta|dinosaur|apizza|salt city|varsity|phoebe|century|alto cinco",e$tags$name,ignore.case=TRUE)) {
    cat(e$id,e$tags$name,if(is.null(e$lat))e$center$lat else e$lat,
        if(is.null(e$lon))e$center$lon else e$lon,"\n")
  }
}
cat("Elements:",length(x$elements),"\nOSM timestamp:",x$osm3s$timestamp_osm_base,"\n")

cache <- gzfile("Data/day01_points/osm.json.gz", "wb")
writeBin(readBin("Data/day01_points/osm.json", "raw", n=file.info("Data/day01_points/osm.json")$size), cache)
close(cache)
