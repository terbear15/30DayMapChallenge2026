# Offline rendering from the pinned, processed SEPTA feed.
library(sf)
library(data.table)
library(ggplot2)
library(grid)
library(ragg)
x <- readRDS("Data/day02_lines/derived/map-data.rds")
dir.create("Maps",showWarnings=FALSE)
bg<-"#FFFFFF"; ink<-"#203636"; teal<-"#267C7D"; muted<-"#65736E"; pale<-"#D5D8D0"
ids<-c("21","30","31","40","42","49","LUCYGO","LUCYGR")
colors<-setNames(c("#2367A2","#8362A5","#218C98","#BF4654","#DA7932","#24745E","#A78118","#698A32"),ids)
short<-setNames(c("21","30","31","40","42","49","GOLD","GREEN"),ids)
desc<-c("Columbus-Dock / 69th St TC","30th St Station / 69th St TC","City Hall / 76th-City","2nd-Lombard / Conshohocken","2nd-Spruce / 61st-Pine or Wycombe","33rd-Dauphin / 40th-Baltimore","LUCY Gold Loop","LUCY Green Loop")
guide<-x$route_guide
guide[,regular:=!grepl("^4[0-9][0-9]$|OWL|BUS",route_id)]
uc_regular<-guide[university_city & regular,route_id]
stopifnot(length(uc_regular)==16,all(ids %in% uc_regular))
routes<-x$routes
# Union trip variants by route to avoid drawing repeated geometry hundreds of times.
route_geo<-lapply(unique(routes$route_id),function(id){
 g<-st_union(st_geometry(routes[routes$route_id==id,]))
 if(as.character(st_geometry_type(g))[1]=="MULTILINESTRING")g<-st_line_merge(g)
 g
})
r<-st_sf(route_id=unique(routes$route_id),geometry=st_sfc(lapply(route_geo,function(g)g[[1]]),crs=26918))
base_theme<-theme_void()+theme(plot.margin=margin(0,0,0,0),panel.background=element_rect(fill=bg,color=NA),plot.background=element_rect(fill=bg,color=NA))
loc<-function(lon,lat)as.numeric(st_coordinates(st_transform(st_sfc(st_point(c(lon,lat)),crs=4326),26918)))
origin<-as.numeric(st_coordinates(x$origin))
citylabels<-data.frame(name=c("NORTHEAST","NORTH PHILLY","CENTER CITY","SOUTH PHILLY","WEST PHILLY","ROXBOROUGH"),lon=c(-75.013,-75.147,-75.140,-75.164,-75.245,-75.224),lat=c(40.070,40.006,39.961,39.920,39.978,40.044))
coords<-t(mapply(loc,citylabels$lon,citylabels$lat));citylabels$X<-coords[,1];citylabels$Y<-coords[,2]
bb<-st_bbox(x$city)
citymap<-ggplot()+geom_sf(data=x$city,fill="#FFFFFF",color="#A9B6AD",linewidth=.35)+
 geom_sf(data=r,color="#BDC7BD",linewidth=.22,alpha=.7)+
 geom_sf(data=x$uc,fill="#EFF7F5",color=teal,linewidth=.4,linetype="dashed")+
 geom_sf(data=r[r$route_id %in% setdiff(uc_regular,ids),],color=teal,linewidth=.43,alpha=.9)+
 geom_sf(data=r[r$route_id %in% ids,],aes(color=route_id),linewidth=.72)+scale_color_manual(values=colors,guide="none")+
 geom_text(data=citylabels,aes(X,Y,label=name),size=2.4,color=muted,family="Arial",fontface="bold")+
 annotate("point",x=origin[1],y=origin[2],shape=23,size=3,fill=ink,color="white",stroke=.5)+
 coord_sf(crs=26918,xlim=c(bb[1]-600,bb[3]+600),ylim=c(bb[2]-500,bb[4]+500),datum=NA,expand=FALSE)+base_theme
txt<-function(label,x,y,size=10,col=ink,face="plain",family="Arial",just="left",...)grid.text(label,x,y,just=just,gp=gpar(fontsize=size,col=col,fontface=face,fontfamily=family),...)
rule<-function(y)grid.lines(c(.055,.945),c(y,y),gp=gpar(col="#D2D8CC",lwd=.8))
badge<-function(label,x,y,col=teal,w=.35){grid.roundrect(x,y,width=unit(w,"in"),height=unit(.20,"in"),r=unit(.045,"in"),gp=gpar(fill=col,col=NA));txt(label,x,y,8,col="white",face="bold",just="center")}
footer<-function(){rule(.057);txt("SEPTA GTFS v202611010 | Scheduled Monday service: 02 NOV 2026 | City of Philadelphia boundaries",.055,.039,6.7,col=muted);txt("Bus geometry only. Check SEPTA for departure times, detours and trip-specific destinations.",.055,.022,6.7,col=muted);txt("#30DayMapChallenge",.945,.022,6.7,col=teal,just="right")}
# Boarding positions: exact GTFS stop locations, with offset letter markers.
board<-data.table(letter=LETTERS[1:8],stop_id=c("21354","21360","21449","21443","21447","573","22233","30643"),
 title=c("Chestnut & 34th","Walnut & 34th","34th & Walnut","33rd & Walnut","Market & 34th","Market & 33rd","Spruce & 34th","Spruce & 34th"),
 detail=c("21 toward Columbus-Dock","21 toward 69th St TC","30 + 42 west / 49 south / Gold","30 + 42 east / 49 north / Green","31 toward City Hall","31 toward 76th-City","40 toward 2nd-Lombard","40 toward Conshohocken-Monument"))
board<-merge(board,as.data.table(st_drop_geometry(x$stops))[,.(stop_id,stop_lon,stop_lat)],by="stop_id")
setorder(board,letter)
bxy<-t(mapply(loc,board$stop_lon,board$stop_lat));board$X<-bxy[,1];board$Y<-bxy[,2]
board$LX<-board$X+c(-75,55,-85,70,-70,55,-55,70)
board$LY<-board$Y+c(30,-35,45,15,45,60,-35,30)
fwrite(board,"Data/day02_lines/derived/boarding-guide.csv")
cx<-origin[1];cy<-origin[2]
close_x<-cx+c(-620,980);close_y<-cy+c(-600,560)
# Clean schematic street context drawn at geographic coordinates from the GTFS stops.
# Streets below are reference alignments, not a comprehensive road survey.
street_refs<-data.frame(name=c("MARKET ST","CHESTNUT ST","WALNUT ST","SPRUCE ST","34TH ST","33RD ST"),lon=c(-75.197,-75.197,-75.197,-75.197,-75.192,-75.190),lat=c(39.9557,39.9541,39.9528,39.9506,39.9572,39.9572))
ssxy<-t(mapply(loc,street_refs$lon,street_refs$lat));street_refs$X<-ssxy[,1];street_refs$Y<-ssxy[,2]
close<-ggplot()+
 geom_sf(data=r[r$route_id %in% ids,],color="#A9C5BD",linewidth=.95)+
 geom_text(data=street_refs,aes(X,Y,label=name),size=2.3,color=muted,family="Arial",fontface="bold")+
 geom_segment(data=board,aes(x=X,y=Y,xend=LX,yend=LY),linewidth=.4,color=teal)+
 geom_point(data=board,aes(X,Y),size=1.4,color=teal)+
 geom_point(data=board,aes(LX,LY),shape=21,size=5.5,color=bg,fill=teal,stroke=.5)+
 geom_text(data=board,aes(LX,LY,label=letter),color="white",fontface="bold",family="Arial",size=3)+
 annotate("point",x=cx,y=cy,shape=23,size=3.3,color=bg,fill=ink,stroke=.6)+
 annotate("text",x=cx-145,y=cy-85,label="HOME BASE\n34TH & WALNUT",size=2.8,color=ink,fontface="bold",hjust=1,family="Arial")+
 coord_sf(crs=26918,xlim=close_x,ylim=close_y,datum=NA,expand=FALSE)+base_theme
# Each route gets its own map, so overlapping alignments remain understandable.
atlas_bounds<-st_bbox(st_union(st_geometry(r[r$route_id %in% ids,])))
atlas_x<-c(atlas_bounds[1]-500,atlas_bounds[3]+500);atlas_y<-c(atlas_bounds[2]-500,atlas_bounds[4]+500)
panel<-function(id){ggplot()+geom_sf(data=x$city,fill="#FFFFFF",color="#B8C1B6",linewidth=.2)+
 geom_sf(data=x$uc,fill="#EFF7F5",color=NA)+geom_sf(data=r[r$route_id==id,],color=colors[id],linewidth=.8)+
 annotate("point",x=cx,y=cy,shape=23,fill=ink,color="white",size=2,stroke=.35)+
 coord_sf(crs=26918,xlim=atlas_x,ylim=atlas_y,datum=NA,expand=FALSE)+base_theme}
source("R/day02_layout.R")
render<-function(file,draw){agg_png(file,width=2600,height=1600,res=200);draw();dev.off()}
render("Maps/day02_lines_philadelphia_buses_01_citywide.png",draw_city)
render("Maps/day02_lines_philadelphia_buses_02_boarding.png",draw_close)
render("Maps/day02_lines_philadelphia_buses_03_routes.png",draw_atlas)
agg_png("Maps/Thumbnails/day02_thumbnail.png",width=600,height=600,res=100)
grid.newpage();grid.rect(gp=gpar(fill=bg,col=NA));txt("02 / LINES",.065,.95,10,col=teal,face="bold");txt("A way through Philly.",.065,.86,29,family="Cambria",face="bold")
print(citymap,vp=viewport(x=.5,y=.45,width=.86,height=.67));txt("University City as home base",.065,.07,12);txt("SEPTA + City of Philadelphia | 02 NOV 2026",.065,.025,6.5,col=muted);dev.off()
stopifnot(length(ids)==8,all(ids %in% unique(r$route_id)),all(board$stop_id %in% x$stops$stop_id),all(lengths(st_intersects(x$origin,x$uc))>0))
cat("Rendered 3 landscape maps + thumbnail.\n")
