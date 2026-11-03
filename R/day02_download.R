library(httr2)
dir.create("Data/day02_lines",showWarnings=FALSE)
get_file <- function(url,path) {
 if(!file.exists(path) || file.info(path)$size==0) {
  message("Downloading ",url)
  request(url) |> req_user_agent("PhillyBusAtlas") |>
   req_timeout(180) |> req_perform(path=path)
 }
 invisible(NULL)
}
get_file("https://github.com/septadev/GTFS/releases/download/v202611010/gtfs_public.zip","Data/day02_lines/gtfs_public.zip")
get_file("https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/City_Limits/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson","Data/day02_lines/philadelphia.geojson")
get_file("https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/business_improvement_districts/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson","Data/day02_lines/districts.geojson")
stopifnot(digest::digest(file="Data/day02_lines/gtfs_public.zip",algo="sha256")=="acff1b8757dd33fd195bd0e2fed75076d4e5be1bda5441c64aa85a259ab22813")
unzip("Data/day02_lines/gtfs_public.zip",files="google_bus.zip",exdir="Data/day02_lines/gtfs")
buszip <- list.files("Data/day02_lines/gtfs",pattern="google_bus.zip",recursive=TRUE,full.names=TRUE)
stopifnot(length(buszip)==1)
dir.create("Data/day02_lines/bus",showWarnings=FALSE)
unzip(buszip,exdir="Data/day02_lines/bus")
cat("Ready\n")
