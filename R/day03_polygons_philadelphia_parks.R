# Reproduce offline from cached City of Philadelphia GeoJSON.
library(sf)
library(ggplot2)
library(grid)
library(ragg)
library(jsonlite)
bg<-"#F6F6EE";fern<-"#748469";olive<-"#ABB290";sage<-"#AAC1B1";peach<-"#F9EAD7";ink<-"#303B31"
dir.create("Maps",showWarnings=FALSE)
parks<-st_read("Data/day03_polygons/parks.geojson",quiet=TRUE)|>st_make_valid()|>st_transform(26918)
city<-st_read("Data/day03_polygons/philadelphia.geojson",quiet=TRUE)|>st_make_valid()|>st_transform(26918)|>st_union()
parks<-suppressWarnings(st_intersection(parks,city))
parks<-parks[!st_is_empty(parks),]
parks$acres<-as.numeric(st_area(parks))/4046.8564224
parks$size<-cut(parks$acres,breaks=c(0,10,100,Inf),right=FALSE,labels=c("Under 10 acres","10 to under 100 acres","100 acres or more"))
stopifnot(!anyNA(parks$size))
write.csv(st_drop_geometry(parks)[,c("OBJECTID","PARENT_NAME","acres","size")],"Data/day03_polygons/park-sizes.csv",row.names=FALSE)
loc<-function(lon,lat)as.numeric(st_coordinates(st_transform(st_sfc(st_point(c(lon,lat)),crs=4326),26918)))
# Actual river polygon, faded along its north/south extent within the map context.
river<-st_read("Data/day03_polygons/schuylkill.geojson",quiet=TRUE)|>st_make_valid()|>st_transform(26918)|>st_union()
river<-suppressWarnings(st_intersection(river,st_buffer(city,1500)))
river_box<-st_bbox(river)
breaks<-seq(river_box[2],river_box[4],length.out=201)
strips<-lapply(seq_len(200),function(i)st_polygon(list(matrix(c(river_box[1]-1,breaks[i],river_box[3]+1,breaks[i],river_box[3]+1,breaks[i+1],river_box[1]-1,breaks[i+1],river_box[1]-1,breaks[i]),ncol=2,byrow=TRUE))))
river_bands<-st_sf(fade=.85*sin(pi*((seq_len(200)-.5)/200))^.8,geometry=st_sfc(strips,crs=26918))
river_bands<-suppressWarnings(st_intersection(river_bands,river))
river_bands<-river_bands[!st_is_empty(river_bands),]
river_label<-loc(-75.181,39.929)
selected<-c("Wissahickon Valley Park","Pennypack Park","West Fairmount Park","East Fairmount Park","Cobbs Creek Park","Franklin Delano Roosevelt Park","Tacony Creek Park")
label_names<-c("Wissahickon\nValley Park","Pennypack\nPark","West\nFairmount","East\nFairmount","Cobbs Creek\nPark","FDR Park","Tacony Creek\nPark")
ps<-parks[match(selected,parks$PARENT_NAME),]
centers<-suppressWarnings(st_point_on_surface(ps))
xy<-st_coordinates(centers)
labs<-data.frame(label=label_names,X=xy[,1],Y=xy[,2])
# Offset labels into open space, with leaders to a point inside each site.
labs$LX<-labs$X+c(-3500,2500,-3200,2200,-2500,2000,2400)
labs$LY<-labs$Y+c(1700,1500,0,-1400,-1000,-1000,700)
bb<-st_bbox(city)
map<-ggplot()+
 geom_sf(data=city,fill=bg,color="#BFC5B6",linewidth=.4)+
 geom_sf(data=river_bands,aes(alpha=fade),fill=sage,color=NA)+
 scale_alpha_identity()+
 geom_sf(data=parks,aes(fill=size),color=fern,linewidth=.16)+
 scale_fill_manual(values=c("Under 10 acres"=sage,"10 to under 100 acres"=olive,"100 acres or more"=fern),guide="none")+
 geom_segment(data=labs,aes(x=X,y=Y,xend=LX,yend=LY),color=fern,linewidth=.3)+
 geom_label(data=labs,aes(x=LX,y=LY,label=label),size=2.8,family="Arial",color=ink,fill=bg,linewidth=0,lineheight=.98,label.padding=unit(.12,"lines"))+
 annotate("text",x=river_label[1],y=river_label[2],label="Schuylkill River",size=2.7,color=fern,fontface="italic",family="Arial",angle=68)+
 coord_sf(crs=26918,xlim=c(bb[1]-3300,bb[3]+1700),ylim=c(bb[2]-700,bb[4]+700),expand=FALSE,datum=NA)+
 theme_void()+theme(plot.margin=margin(0,0,0,0),panel.background=element_rect(fill=bg,color=NA),plot.background=element_rect(fill=bg,color=NA))
txt<-function(label,x,y,size=10,col=ink,face="plain",family="Arial",just="left")grid.text(label,x,y,just=just,gp=gpar(fontsize=size,col=col,fontface=face,fontfamily=family))
draw<-function(thumbnail=FALSE){
 grid.newpage();grid.rect(gp=gpar(fill=bg,col=NA))
 if(thumbnail){
  txt("03 / POLYGONS",.06,.955,9,col=fern,face="bold")
  txt("A greener Philly.",.06,.87,30,family="Cambria",face="bold")
  print(map,vp=viewport(x=.5,y=.45,width=.95,height=.70))
  txt("Philadelphia's park + recreation land",.06,.055,8.7)
  return(invisible(NULL))
 }
 txt("30 DAY MAP CHALLENGE",.055,.966,9,col=fern,face="bold")
 txt("03 / POLYGONS",.945,.966,9,col=fern,face="bold",just="right")
 grid.lines(c(.055,.945),c(.947,.947),gp=gpar(col="#CDD1C2",lwd=.7))
 txt("A greener Philly.",.055,.901,37,family="Cambria",face="bold")
 txt("From pocket-sized places to sprawling parkland.",.055,.855,11,col=fern)
 print(map,vp=viewport(x=.5,y=.499,width=.95,height=.686))
 txt("N",.12,.797,8,face="bold",just="center")
 grid.lines(c(.12,.12),c(.766,.786),arrow=arrow(length=unit(.06,"in"),type="closed"),gp=gpar(col=fern,lwd=.9))
 txt("THE SHAPE OF PARK + RECREATION LAND",.055,.139,9,col=fern,face="bold")
 legend_x<-c(.067,.335,.671)
 legend_labels<-c("Under 10 acres","10 to under 100 acres","100 acres or more")
 for(i in 1:3){grid.rect(legend_x[i],.110,width=unit(.13,"in"),height=unit(.13,"in"),gp=gpar(fill=c(sage,olive,fern)[i],col=fern,lwd=.4));txt(legend_labels[i],legend_x[i]+.019,.110,8.2)}
 txt("Fill shows mapped site area, not tree cover or park quality.",.055,.082,8,col=ink)
 grid.lines(c(.055,.945),c(.061,.061),gp=gpar(col="#CDD1C2",lwd=.7))
 txt("Source: Philadelphia PPR + Water Department + City Limits | Retrieved 03 NOV 2026",.055,.044,6.5,col=fern)
 txt("PPR-managed / maintained land. Campus and private green spaces may be absent.",.055,.027,6.6,col=fern)
 txt("Frosted Fern palette / Macarons & Mimosas",.055,.012,6.2,col=fern)
 txt("#30DayMapChallenge",.945,.012,6.2,col=fern,just="right")
}
agg_png("Maps/day03_polygons_philadelphia_parks.png",width=1800,height=2250,res=225);draw();dev.off()
agg_png("Maps/Thumbnails/day03_thumbnail.png",width=600,height=600,res=100);draw(TRUE);dev.off()
stopifnot(all(st_is_valid(parks)),all(parks$acres>0),!anyNA(match(selected,parks$PARENT_NAME)))
outside<-suppressWarnings(st_difference(st_geometry(parks),st_buffer(city,2)))
stopifnot(all(st_is_empty(outside)))
writeLines(c(paste("Mapped records:",nrow(parks)),"Projection: NAD83 / UTM 18N (EPSG:26918)","PASS: valid, nonempty polygons; positive areas; city clipping within 2m tolerance.",
 "Area classes: <10, 10 to <100, >=100 acres, computed on city-clipped geometry.",
 "Palette: #748469, #ABB290, #AAC1B1, #F9EAD7, #F6F6EE",capture.output(sessionInfo())),"Data/day03_polygons/validation.txt")
cat("Created portrait map and thumbnail.\n")
