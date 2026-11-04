# Day 04 - Clusters
# Run from the repository root.
dir.create("Maps",showWarnings=FALSE)
dir.create("Maps/Thumbnails",showWarnings=FALSE)
if(!file.exists("Data/day04_clusters/cafes.json")||!file.exists("Data/day04_clusters/manhattan-borough.geojson"))source("R/day04_download.R")
source("R/day04_clusters_manhattan_cafes.R",encoding="UTF-8")
