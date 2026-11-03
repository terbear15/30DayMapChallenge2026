# Checks the useful boarding claims against active trips and their stop_times.
library(data.table)
library(sf)
x<-readRDS("Data/day02_lines/derived/map-data.rds")
tt<-fread("Data/day02_lines/bus/stop_times.txt",colClasses="character",na.strings="")
tt<-merge(tt[trip_id %in% x$trips$trip_id],x$trips[,.(trip_id,route_id,direction_id,trip_headsign)],by="trip_id")
tt<-tt[is.na(pickup_type)|pickup_type!="1"]
b<-fread("Data/day02_lines/derived/boarding-guide.csv",colClasses="character")
expected<-data.table(letter=c("A","B",rep("C",4),rep("D",4),"E","F","G","H"),
 route_id=c("21","21","30","42","49","LUCYGO","30","42","49","LUCYGR","31","31","40","40"),
 direction_id=c("0","1","1","1","0","0","0","0","1","0","0","1","0","1"))
expected<-merge(expected,b[,.(letter,stop_id)],by="letter")
claims<-merge(expected,unique(tt[,.(stop_id,route_id,direction_id,trip_headsign)]),by=c("stop_id","route_id","direction_id"),all.x=TRUE)
stopifnot(!anyNA(claims$trip_headsign))
fwrite(claims,"Data/day02_lines/derived/verified-boarding-destinations.csv")
ids<-c("21","30","31","40","42","49","LUCYGO","LUCYGR")
stopifnot(all(x$route_guide[route_id %in% ids,near_weitzman]))
stopifnot(all(st_is_valid(x$routes)),all(!st_is_empty(x$routes)),st_crs(x$routes)$epsg==26918)
# No route vertices should spill more than 2 metres beyond the city boundary.
outside<-suppressWarnings(st_difference(st_geometry(x$routes),st_buffer(x$city,2)))
stopifnot(all(st_is_empty(outside)))
pngs<-c(list.files("Maps",pattern="^day02.*png$",full.names=TRUE), "Maps/Thumbnails/day02_thumbnail.png")
stopifnot(length(pngs)==4)
for(p in pngs){im<-png::readPNG(p);dims<-dim(im);stopifnot(all(dims[1:2]==if(grepl("thumbnail",p))c(600,600)else c(1600,2600)),all(im[10,10,1:3]==1))}
writeLines(c("PASS: all 14 route/direction boarding claims have scheduled trips at the displayed stop.",
 "PASS: eight focus routes have boarding stops within 450m of the origin.",
 "PASS: all route geometry is valid, nonempty, and clipped to Philadelphia (2m tolerance).",
 "PASS: three landscape maps are 2600x1600, thumbnail is 600x600, and page backgrounds are pure white.",
 "Scope: scheduled service for Monday 2026-11-02, not live operations.",
 "Origin: approx. 34th & Walnut (-75.192110, 39.952817), near Weitzman, not a building entrance."),"Data/day02_lines/derived/qa-results.txt")
cat("All checks passed.\n")
