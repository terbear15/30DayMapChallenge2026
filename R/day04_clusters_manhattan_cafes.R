library(sf)
library(ggplot2)
library(jsonlite)
library(grid)
library(ragg)
bg<-"#F5EFE6";espresso<-"#3B2822";terra<-"#BB765D"
b<-st_read("Data/day04_clusters/manhattan-borough.geojson",quiet=TRUE)|>st_make_valid()|>st_transform(26918)
islands<-suppressWarnings(st_cast(st_geometry(b),"POLYGON"))
island<-islands[which.max(st_area(islands))]
raw<-fromJSON("Data/day04_clusters/cafes.json",simplifyVector=FALSE)
rows<-lapply(raw$elements,function(e){
 p<-if(!is.null(e$lat))e else e$center
 if(is.null(p))return(NULL)
 data.frame(id=paste(e$type,e$id,sep="/"),name=if(is.null(e$tags$name))"Unnamed caf\u00e9"else e$tags$name,lon=p$lon,lat=p$lat)
})
d<-do.call(rbind,rows)
id_duplicates<-sum(duplicated(d$id));d<-d[!duplicated(d$id),]
points<-st_as_sf(d,coords=c("lon","lat"),crs=4326,remove=FALSE)|>st_transform(26918)
points<-points[lengths(st_intersects(points,island))>0,]
points<-points[order(points$id),]
before_dedup<-nrow(points)
# Remove likely duplicate representations of the same named cafe within 25 m.
# Different names and unnamed co-located cafes are retained.
key<-tolower(iconv(points$name,to="ASCII//TRANSLIT"))
key<-gsub("[^a-z0-9]","",key)
near25<-st_is_within_distance(points,points,dist=25)
drop<-logical(nrow(points));duplicate_rows<-list()
for(i in seq_len(nrow(points))){
 if(drop[i] || is.na(key[i]) || key[i]=="" || grepl("^unnamed",key[i]))next
 candidates<-near25[[i]]
 candidates<-candidates[candidates>i & !drop[candidates] & !is.na(key[candidates]) & key[candidates]==key[i]]
 for(j in candidates){
  drop[j]<-TRUE
  duplicate_rows[[length(duplicate_rows)+1]]<-data.frame(retained_id=points$id[i],removed_id=points$id[j],name=points$name[i],distance_m=as.numeric(st_distance(points[i,],points[j,])))
 }
}
duplicates<-if(length(duplicate_rows))do.call(rbind,duplicate_rows)else data.frame(retained_id=character(),removed_id=character(),name=character(),distance_m=numeric())
write.csv(duplicates,"Data/day04_clusters/duplicate-review.csv",row.names=FALSE)
points<-points[!drop,]
# DBSCAN in projected metres. minPts includes the point itself.
cluster<-function(eps,minpts=5){
 near<-st_is_within_distance(points,points,dist=eps)
 core<-lengths(near)>=minpts;lab<-integer(nrow(points));k<-0L
 for(i in which(core)){
  if(lab[i]>0)next
  k<-k+1L;lab[i]<-k;queue<-i
  while(length(queue)){
   j<-queue[1];queue<-queue[-1]
   for(v in near[[j]])if(lab[v]==0){lab[v]<-k;if(core[v])queue<-c(queue,v)}
  }
 }
 lab
}
sensitivity<-do.call(rbind,lapply(c(100,140,180),function(radius){z<-cluster(radius);data.frame(radius_m=radius,clusters=max(z),outside_clusters=sum(z==0))}))
write.csv(sensitivity,"Data/day04_clusters/sensitivity.csv",row.names=FALSE)
points$cluster<-cluster(140)
points$clustered<-points$cluster>0
groups<-sort(unique(points$cluster[points$cluster>0]))
# Buffered convex envelopes illustrate the groups; they are not official boundaries.
polygons<-lapply(groups,function(g)st_convex_hull(st_union(st_buffer(st_geometry(points[points$cluster==g,]),45))))
hulls<-st_sf(cluster=groups,geometry=st_sfc(lapply(polygons,function(z)z[[1]]),crs=26918))
txt<-function(s,x,y,size=10,col=espresso,face="plain",family="Arial",just="left")grid.text(s,x,y,just=just,gp=gpar(fontsize=size,col=col,fontface=face,fontfamily=family))
source("R/day04_layout.R",encoding="UTF-8")
agg_png("Maps/Thumbnails/day04_thumbnail.png",width=600,height=600,res=100)
grid.newpage();grid.rect(gp=gpar(fill=bg,col=NA))
txt("04 / CLUSTERS",.06,.95,9,col=terra,face="bold")
txt("Coffee, in good company.",.06,.85,24,family="Cambria",face="bold")
print(overview,vp=viewport(x=.5,y=.45,width=.90,height=.68))
txt("Manhattan's mapped caf\u00e9 clusters",.06,.055,9)
txt("OpenStreetMap contributors + NYC DCP",.06,.020,6,col="#8B6D59")
dev.off()
write.csv(st_drop_geometry(points),"Data/day04_clusters/cafes-clustered.csv",row.names=FALSE)
# Meaningful checks: all points in scope, clusters meet minPts, zoom is genuinely larger.
stopifnot(!anyDuplicated(points$id),all(st_is_valid(points)),all(lengths(st_intersects(points,island))>0))
near140<-st_is_within_distance(points,points,dist=140)
is_core<-lengths(near140)>=5
# A shared border point can belong to only one group. Validate each cluster's
# core neighborhood rather than incorrectly requiring 5 assigned members.
stopifnot(all(vapply(groups,function(g)any(is_core[points$cluster==g]),logical(1))),all(points$cluster[is_core]>0),all(zoom_ratios>2))
stopifnot(all(dim(png::readPNG("Maps/day04_clusters_manhattan_cafes.png"))[1:2]==c(2500,2000)))
write_json(list(source="OpenStreetMap amenity=cafe",osm_timestamp=raw$osm3s$timestamp_osm_base,
 scope="Manhattan island: largest land polygon in NYC DCP Manhattan borough boundary",
 crs="EPSG:26918",radius_m=140,min_points=5,raw_island_records=before_dedup,
 repeated_osm_ids_removed=id_duplicates,likely_duplicate_locations_removed=sum(drop),
 final_locations=nrow(points),clusters=length(groups),clustered_locations=sum(points$clustered),
 outside_clusters=sum(!points$clustered),close_up_magnification=unname(round(zoom_ratios,2)),
 status="Geometry, duplicate IDs, core-neighborhood thresholds, image dimensions, and close-up magnification checked."),
 "Data/day04_clusters/methods.json",pretty=TRUE,auto_unbox=TRUE)
cat("Final locations:",nrow(points),"| Likely duplicates removed:",sum(drop),"| Clusters:",length(groups),"\n")
