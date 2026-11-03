# Day 2 - lines
# Run from the repository root.
dir.create("Maps", showWarnings = FALSE)
dir.create("Maps/Thumbnails", showWarnings = FALSE)
if (!file.exists("Data/day02_lines/derived/map-data.rds")) {
  source("R/day02_download.R")
  source("R/day02_prepare.R")
}
source("R/day02_lines_philadelphia_buses.R", encoding = "UTF-8")
