library(sf)
library(data.table)
library(jsonlite)
dir.create("Data/day02_lines/derived",showWarnings=FALSE)
date <- as.Date("2026-11-02")
read_gtfs <- function(name) fread(file.path("Data/day02_lines/bus",paste0(name,".txt")),colClasses="character",na.strings="")
routes <- read_gtfs("routes");trips <- read_gtfs("trips");cal <- read_gtfs("calendar");exceptions <- read_gtfs("calendar_dates")
stops <- read_gtfs("stops");times <- read_gtfs("stop_times");shapes <- read_gtfs("shapes")
day <- tolower(format(date,"%A")); day <- "monday" # explicit English column, independent of OS locale
stamp <- format(date,"%Y%m%d")
services <- cal[start_date<=stamp & end_date>=stamp & get(day)=="1",service_id]
services <- union(setdiff(services,exceptions[date==stamp & exception_type=="2",service_id]),exceptions[date==stamp & exception_type=="1",service_id])
bus_routes <- routes[route_type=="3"]
trips <- trips[service_id %in% services & route_id %in% bus_routes$route_id]
stopifnot(nrow(trips)>0)
times <- merge(times[trip_id %in% trips$trip_id],trips[,.(trip_id,route_id,direction_id,trip_headsign,shape_id)],by="trip_id")
times <- times[is.na(pickup_type)|pickup_type!="1"]
stops[,`:=`(stop_lat=as.numeric(stop_lat),stop_lon=as.numeric(stop_lon))]
stop_sf <- st_as_sf(stops[stop_id %in% times$stop_id],coords=c("stop_lon","stop_lat"),crs=4326,remove=FALSE) |> st_transform(26918)
city <- st_read("Data/day02_lines/philadelphia.geojson",quiet=TRUE) |> st_make_valid() |> st_transform(26918) |> st_union()
districts <- st_read("Data/day02_lines/districts.geojson",quiet=TRUE)
text_fields <- st_drop_geometry(districts)
which_uc <- apply(text_fields,1,function(row)any(grepl("university city",row,ignore.case=TRUE)))
stopifnot(sum(which_uc)==1)
uc <- districts[which_uc,] |> st_make_valid() |> st_transform(26918) |> st_union()
origin <- st_sfc(st_point(c(-75.192110,39.952817)),crs=4326) |> st_transform(26918)
stop_sf$in_uc <- lengths(st_intersects(stop_sf,uc))>0
stop_sf$origin_distance_m <- as.numeric(st_distance(stop_sf,origin))
uc_stop_ids <- stop_sf$stop_id[stop_sf$in_uc]
uc_routes <- unique(times[stop_id %in% uc_stop_ids,route_id])
near_ids <- stop_sf$stop_id[stop_sf$origin_distance_m<=450]
near_routes <- unique(times[stop_id %in% near_ids,route_id])
shapes <- shapes[shape_id %in% trips$shape_id]
shapes[,`:=`(shape_pt_lon=as.numeric(shape_pt_lon),shape_pt_lat=as.numeric(shape_pt_lat),shape_pt_sequence=as.integer(shape_pt_sequence))]
setorder(shapes,shape_id,shape_pt_sequence)
geo <- shapes[,.(geometry=list(st_linestring(as.matrix(.SD)))),by=shape_id,.SDcols=c("shape_pt_lon","shape_pt_lat")]
shape_sf <- st_sf(shape_id=geo$shape_id,geometry=st_sfc(geo$geometry,crs=4326)) |> st_transform(26918)
shape_meta <- unique(trips[,.(route_id,shape_id)])
shape_sf <- merge(shape_sf,shape_meta,by="shape_id")
shape_sf <- merge(shape_sf,as.data.frame(bus_routes[,.(route_id,route_short_name,route_long_name,route_url)]),by="route_id")
in_city <- lengths(st_intersects(shape_sf,city))>0
shape_sf <- shape_sf[in_city,]
# Clip actual route geometry, not a bounding rectangle.
clipped <- suppressWarnings(st_intersection(shape_sf,city))
clipped <- clipped[!st_is_empty(clipped),]
clipped$uc_route <- clipped$route_id %in% uc_routes
clipped$near_origin <- clipped$route_id %in% near_routes
summary <- copy(bus_routes[route_id %in% unique(clipped$route_id)])
summary[,university_city:=route_id %in% uc_routes]
summary[,near_weitzman:=route_id %in% near_routes]
nearest <- merge(times,as.data.table(st_drop_geometry(stop_sf))[,.(stop_id,stop_name,origin_distance_m)],by="stop_id")
setorder(nearest,route_id,origin_distance_m)
nearest_route <- nearest[,.(nearest_stop=stop_name[1],distance_m=round(origin_distance_m[1])),by=route_id]
summary <- merge(summary,nearest_route,by="route_id")
destinations <- unique(trips[,.(route_id,trip_headsign)])
heads <- destinations[,.(headsigns=paste(sort(unique(trip_headsign)),collapse=" | ")),by=route_id]
summary <- merge(summary,heads,by="route_id")
fwrite(summary,"Data/day02_lines/derived/route-guide.csv")
uc_near_stops <- merge(unique(times[route_id %in% uc_routes,.(route_id,stop_id,direction_id)]),as.data.table(st_drop_geometry(stop_sf)),by="stop_id")
fwrite(uc_near_stops,"Data/day02_lines/derived/uc-stops.csv")
saveRDS(list(routes=clipped,route_guide=summary,stops=stop_sf,stop_routes=uc_near_stops,trips=trips,
 city=city,uc=uc,origin=origin,date=date),"Data/day02_lines/derived/map-data.rds")
cat("CITY ROUTES:",nrow(summary),"\nUC ROUTES:",sum(summary$university_city),"\nNEAR WEITZMAN:\n")
print(summary[university_city==TRUE,.(route_id,route_long_name,nearest_stop,distance_m,near_weitzman)])
writeLines(c("Service date: 2026-11-02, Monday","SEPTA feed: v202611010",paste("Active routes intersecting Philadelphia:",nrow(summary)),
 paste("Routes with boarding stops in University City District:",sum(summary$university_city)),
 "Nearby is within 450 metres straight-line distance of 34th and Walnut, not a walking-time estimate.",capture.output(sessionInfo())),"Data/day02_lines/derived/validation.txt")
