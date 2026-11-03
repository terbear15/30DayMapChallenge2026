library(sf)
library(jsonlite)
library(ggplot2)
library(grid)
library(ragg)
dir.create("Maps", showWarnings = FALSE)
bg <- "#F6F1E7"; ink <- "#242C2B"; accent <- "#C6532D"; muted <- "#666D66"
osm <- fromJSON(gzfile("Data/day01_points/osm.json.gz"), simplifyVector = FALSE)
elements <- osm$elements
get_element <- function(id) elements[[which(vapply(elements, function(e) as.character(e$id)==id, logical(1)))]]
geocodes <- fromJSON("Data/day01_points/geocodes.json",simplifyVector=FALSE)
point_for <- function(id) {
  hit <- unlist(lapply(geocodes,function(g)Filter(function(p)as.character(p$osm_id)==id,g)),recursive=FALSE)
  if(length(hit)) return(c(as.numeric(hit[[1]]$lon),as.numeric(hit[[1]]$lat)))
  e <- get_element(id)
  if (!is.null(e$lat)) return(c(e$lon,e$lat))
  if (!is.null(e$center)) return(c(e$center$lon,e$center$lat))
  z <- do.call(rbind,lapply(e$geometry,function(p)c(p$lon,p$lat)))
  # Polygon centroid rather than an arbitrary street address interpolation.
  if (all(z[1,]==z[nrow(z),])) {
    p <- st_sfc(st_polygon(list(z)),crs=4326) |> st_transform(32618) |> st_centroid() |> st_transform(4326)
    return(as.numeric(st_coordinates(p)))
  }
  colMeans(z)
}
restaurants <- data.frame(
  number=1:8,
  name=c("The York","Lemon Grass","Dinosaur Bar-B-Que","Pastabilities","Apizza Regionale","Francesca's Cucina","Eden","Phoebe's"),
  category=c("Contemporary American + raw bar","Pacific Rim Thai","Slow-smoked barbecue","Pasta + spicy tomato oil","Wood-fired pizza","Italian + garden patio","Seasonal, wood-fired cooking","American + coffee lounge"),
  address=c("247 W. Fayette St.","113 Walton St.","246 W. Willow St.","311 S. Franklin St.","260 W. Genesee St.","545 N. Salina St.","118 E. Genesee St.","900 E. Genesee St."),
  website=c("https://yorkcny.com/contact","https://www.lemongrasscny.com/contact","https://dinosaurbarbque.com/bbq-in-syracuse-ny","https://www.pastabilities.com/contact","https://www.apizzaregionale.com/","https://francescas-cucina.com/contact","https://www.edencny.com/","https://phoebessyracuse.com/faq"),
  osm_id=c("2277759933","8787550721","1694014652","379522070","11334835811","8787513982","7390544363","2271930665"),
  location_note=c("OSM point for the verified street address; old tenant name bc Restaurant in OSM","Nominatim address point for verified current address",rep("OpenStreetMap restaurant point",3),"Nominatim address point for verified street address",rep("OpenStreetMap restaurant point",2)),
  stringsAsFactors=FALSE)
xy <- t(vapply(restaurants$osm_id,point_for,numeric(2)))
restaurants$longitude <- xy[,1]; restaurants$latitude <- xy[,2]
write.csv(restaurants,"Data/day01_points/restaurants.csv",row.names=FALSE)
pts <- st_as_sf(restaurants,coords=c("longitude","latitude"),crs=4326,remove=FALSE) |> st_transform(32618)
xy <- st_coordinates(pts)
restaurants$x <- xy[,1]; restaurants$y <- xy[,2]
restaurants$label_x <- restaurants$x
restaurants$label_y <- restaurants$y
# Spread crowded downtown markers. Thin leaders retain the true locations.
restaurants$label_x <- restaurants$x+c(-200,50,130,-200,-130,0,0,0)
restaurants$label_y <- restaurants$y+c(110,-160,90,-100,-90,0,0,0)
ways <- Filter(function(e)e$type=="way" && !is.null(e$geometry) && length(e$geometry)>1 && (!is.null(e$tags$highway)||!is.null(e$tags$waterway)),elements)
geo <- lapply(ways,function(e) st_linestring(do.call(rbind,lapply(e$geometry,function(p)c(p$lon,p$lat)))))
lines <- st_sf(kind=vapply(ways,function(e)if(!is.null(e$tags$waterway))"water" else e$tags$highway,character(1)),geometry=st_sfc(geo,crs=4326)) |> st_transform(32618)
roads <- lines[!lines$kind %in% c("water","construction","proposed","raceway"),]
minor <- roads[!roads$kind %in% c("motorway","motorway_link","trunk","trunk_link","primary","primary_link","secondary","tertiary"),]
major <- roads[roads$kind %in% c("primary","primary_link","secondary","tertiary"),]
freeway <- roads[roads$kind %in% c("motorway","motorway_link","trunk","trunk_link"),]
water <- lines[lines$kind=="water",]
# Fixed projected extent and north-up layout. Equal x/y units preserve scale.
mid <- c(mean(range(xy[,1])),mean(range(xy[,2])))
campus_y <- st_coordinates(st_transform(st_sfc(st_point(c(-76.1363,43.0377)),crs=4326),32618))[1,2]
yr <- c(min(c(xy[,2],campus_y))-400,max(xy[,2])+400)
map_width <- 0.90; map_height <- 0.445
xspan <- diff(yr)*(8*map_width)/(10*map_height)
xr <- mid[1]+c(-.5,.5)*xspan
loc <- function(lon,lat) {as.numeric(st_coordinates(st_transform(st_sfc(st_point(c(lon,lat)),crs=4326),32618)))}
lab <- data.frame(text=c("DOWNTOWN","UNIVERSITY HILL","NORTHSIDE"),
                  lon=c(-76.160,-76.132,-76.146),lat=c(43.043,43.041,43.057))
lx <- t(mapply(loc,lab$lon,lab$lat));lab$x<-lx[,1];lab$y<-lx[,2]
camp <- loc(-76.1363,43.0377)
map_plot <- ggplot() +
  geom_sf(data=minor,color="#DEDCD1",linewidth=.22) +
  geom_sf(data=major,color="#CACBBE",linewidth=.48) +
  geom_sf(data=freeway,color="#D2C8B8",linewidth=.8) +
  geom_sf(data=water,color="#A7B9B2",linewidth=.7) +
  geom_text(data=lab,aes(x,y,label=text),family="Arial",fontface="bold",size=2.55,color="#7B8277") +
  annotate("point",x=camp[1],y=camp[2],shape=23,size=2.7,fill=ink,color=bg,stroke=.6) +
  annotate("text",x=camp[1]+110,y=camp[2]-100,label="Syracuse University",hjust=0,family="Arial",size=2.5,color=ink) +
  geom_segment(data=restaurants,aes(x=x,y=y,xend=label_x,yend=label_y),color=accent,linewidth=.45) +
  geom_point(data=restaurants,aes(x=x,y=y),color=accent,size=1.2) +
  geom_point(data=restaurants,aes(x=label_x,y=label_y),shape=21,fill=accent,color=bg,size=5.5,stroke=.65) +
  geom_text(data=restaurants,aes(x=label_x,y=label_y,label=number),family="Arial",color="white",fontface="bold",size=2.9) +
  coord_sf(crs=32618,xlim=xr,ylim=yr,expand=FALSE,datum=NA) +
  theme_void() + theme(plot.margin=margin(0,0,0,0),panel.background=element_rect(fill="#EFEDE2",color=NA),plot.background=element_rect(fill="#EFEDE2",color=NA))
txt <- function(label,x,y,size=10,col=ink,family="Arial",face="plain",just="left",...) grid.text(label,x,y,just=just,gp=gpar(fontsize=size,col=col,fontfamily=family,fontface=face),...)
rule <- function(y,col="#D7D1C5") grid.lines(c(.055,.945),c(y,y),gp=gpar(col=col,lwd=.7))
draw <- function(thumbnail=FALSE) {
 grid.newpage();grid.rect(gp=gpar(fill=bg,col=NA))
 if(thumbnail) {
   txt("30 DAY MAP CHALLENGE / 01 POINTS",.07,.95,9,col=accent,face="bold")
   txt("Hungry in Syracuse.",.07,.86,29,family="Cambria",face="bold")
   print(map_plot,vp=viewport(x=.5,y=.47,width=.94,height=.62))
   txt("8 places to start exploring",.07,.08,12)
   txt("Map data \u00a9 OpenStreetMap contributors",.07,.035,6.5,col=muted)
   return(invisible(NULL))
 }
 txt("THE SALT CITY ATLAS",.055,.965,9,col=accent,face="bold")
 txt("01 / POINTS",.945,.965,9,col=accent,face="bold",just="right")
 rule(.945)
 txt("Hungry in",.055,.894,38,family="Cambria",face="bold")
 txt("Syracuse.",.055,.837,45,family="Cambria",face="bold")
 txt("8 PLACES",.945,.884,12,face="bold",just="right")
 txt("TO START",.945,.861,12,face="bold",just="right")
 txt("Eight tables worth finding. A guide for your next dinner out.",.055,.786,11,col=muted)
 print(map_plot,vp=viewport(x=.5,y=.5415,width=map_width,height=map_height))
 # North arrow and scale bar are outside the street drawing to stay readable.
 txt("N",.082,.739,9,face="bold",just="center")
 grid.lines(c(.082,.082),c(.707,.726),arrow=arrow(length=unit(.06,"in"),type="closed"),gp=gpar(col=ink,lwd=1))
 # Map viewport width is 90% of page; scale length is derived from projected bounds.
 scale_x <- .075; scale_y <- .338; scale_w <- 1000/diff(xr)*map_width
 grid.lines(c(scale_x,scale_x+scale_w),c(scale_y,scale_y),gp=gpar(col=ink,lwd=2))
 for(xx in c(scale_x,scale_x+scale_w))grid.lines(c(xx,xx),c(scale_y-.003,scale_y+.003),gp=gpar(col=ink,lwd=1))
 txt("1 km",scale_x+scale_w/2,scale_y+.014,7.5,just="center")
 txt("Numbers locate places; they are not rankings.",.945,.304,7.5,col=muted,just="right")
 txt("FIND YOUR NEXT TABLE",.055,.285,9,col=accent,face="bold")
 for(i in 1:8) {
   column <- if(i<=4)0 else 1; row <- (i-1)%%4
   x <- .07+column*.46; y <- .250-row*.052
   grid.circle(x,y,r=unit(.083,"in"),gp=gpar(fill=accent,col=NA))
   txt(as.character(i),x,y,8,col="white",face="bold",just="center")
   txt(restaurants$name[i],x+.024,y+.003,10.5,face="bold")
   txt(restaurants$category[i],x+.024,y-.014,8.1,col=muted)
   txt(restaurants$address[i],x+.024,y-.029,7.2,col=muted)
 }
 rule(.052)
 txt("A curated starting list | Check menus and opening hours before visiting.",.055,.036,7,col=muted)
 txt("Data: \u00a9 OpenStreetMap contributors + venue websites | 02 NOV 2026",.055,.020,6.5,col=muted)
 txt("#30DayMapChallenge",.945,.020,6.5,col=accent,just="right")
}
agg_png("Maps/day01_points_syracuse_food.png",width=1600,height=2000,res=200)
draw();dev.off()
agg_png("Maps/Thumbnails/day01_thumbnail.png",width=600,height=600,res=100)
draw(TRUE);dev.off()
# Meaningful checks: every entry maps to a cached OSM object and lies in the extent.
stopifnot(nrow(restaurants)==8,!anyNA(xy),all(xy[,1]>xr[1]&xy[,1]<xr[2]),all(xy[,2]>yr[1]&xy[,2]<yr[2]))
writeLines(c(paste("R:",R.version.string),paste("OSM timestamp:",osm$osm3s$timestamp_osm_base),
             "Projection: WGS 84 / UTM zone 18N, EPSG:32618",capture.output(sessionInfo())),"Data/day01_points/session-info.txt")
cat("Created map, thumbnail, location table, and session record.\n")
