# Optional refresh only. Re-rendering uses data/geocodes.json without network.
library(httr2)
library(jsonlite)
addresses <- c("247 West Fayette Street, Syracuse, NY","113 Walton Street, Syracuse, NY","118 East Genesee Street, Syracuse, NY","545 North Salina Street, Syracuse, NY")
if (!file.exists("Data/day01_points/geocodes.json")) {
  out <- list()
  for (a in addresses) {
    r <- request("https://nominatim.openstreetmap.org/search") |>
      req_url_query(q=a,format="jsonv2",limit=1) |>
      req_user_agent("SyracuseFoodMap") |>
      req_timeout(30) |> req_perform()
    out[[a]] <- resp_body_json(r,simplifyVector=FALSE)
    stopifnot(length(out[[a]])==1)
    Sys.sleep(1.1)
  }
  write_json(out,"Data/day01_points/geocodes.json",pretty=TRUE,auto_unbox=TRUE)
} else message("Using existing geocode snapshot.")
