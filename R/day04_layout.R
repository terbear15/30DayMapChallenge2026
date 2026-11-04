# Overview at left, three geographic close-ups at right.
area<-function(south,north){
 z<-points[points$lat>=south & points$lat<north,]
 bounds<-st_bbox(z);yc<-mean(c(bounds[2],bounds[4]));xc<-mean(c(bounds[1],bounds[3]))
 # Equal projected units and a wide panel; pad before matching its aspect ratio.
 height<-as.numeric(bounds[4]-bounds[2])+450
 width<-max(as.numeric(bounds[3]-bounds[1])+500,height*(8*.425)/(10*.235))
 height<-width/((8*.425)/(10*.235))
 c(xmin=xc-width/2,xmax=xc+width/2,ymin=yc-height/2,ymax=yc+height/2)
}
zones<-list(area(40.773,40.785),area(40.747,40.758),area(40.719,40.735))
zone_names<-c("UPPER WEST + EAST SIDES","MIDTOWN / THE COFFEE CORE","LOWER MANHATTAN / SOHO + VILLAGE")
base_map<-function(pointsize=1.0){ggplot()+
 geom_sf(data=island,fill="#EEE4D7",color="#CBBBAA",linewidth=.35)+
 geom_sf(data=hulls,fill=terra,color=terra,linewidth=.18,alpha=.13)+
 geom_sf(data=points[points$cluster==0,],color="#AB9D91",size=pointsize*.57,alpha=.7)+
 geom_sf(data=points[points$cluster>0,],color=terra,size=pointsize,alpha=.92)+
 theme_void()+theme(plot.margin=margin(0,0,0,0),panel.background=element_rect(fill=bg,color=NA),plot.background=element_rect(fill=bg,color=NA))}
fb<-st_bbox(island)
overview<-base_map(.62)+coord_sf(crs=26918,xlim=c(fb[1]-450,fb[3]+450),ylim=c(fb[2]-250,fb[4]+250),datum=NA,expand=FALSE)
inset<-function(z){base_map(1.15)+coord_sf(crs=26918,xlim=z[1:2],ylim=z[3:4],datum=NA,expand=FALSE)}
# Check real geographic magnification, rather than just increasing point size.
overview_scale<-max((fb[3]-fb[1]+900)/(8*.41),(fb[4]-fb[2]+500)/(10*.640))
zoom_ratios<-sapply(zones,function(z)overview_scale/max((z[2]-z[1])/(8*.425),(z[4]-z[3])/(10*.235)))
stopifnot(all(zoom_ratios>2))
cat("Close-up magnifications:",round(zoom_ratios,1),"times overview\n")
agg_png("Maps/day04_clusters_manhattan_cafes.png",width=2000,height=2500,res=250)
grid.newpage();grid.rect(gp=gpar(fill=bg,col=NA))
txt("30 DAY MAP CHALLENGE",.05,.965,9,col=terra,face="bold");txt("04 / CLUSTERS",.95,.965,9,col=terra,face="bold",just="right")
grid.lines(c(.05,.95),c(.946,.946),gp=gpar(col="#DACABA",lwd=.7))
txt("Coffee, in",.05,.904,34,face="bold",family="Cambria")
txt("good company.",.05,.855,34,face="bold",family="Cambria")
txt("A closer look at Manhattan's caf\u00e9 clusters.",.05,.813,10.5,col="#8B6D59")
print(overview,vp=viewport(x=.245,y=.460,width=.41,height=.640))
txt("MANHATTAN ISLAND",.05,.777,7.5,col="#8B6D59",face="bold")
txt("N",.075,.734,8,face="bold",just="center")
grid.lines(c(.075,.075),c(.701,.723),arrow=arrow(length=unit(.055,"in")),gp=gpar(col=espresso))
for(i in 1:3){
 yy<-.7775-(i-1)*.270
 txt(zone_names[i],.512,yy+.1375,7.4,col=terra,face="bold")
 print(inset(zones[[i]]),vp=viewport(x=.725,y=yy,width=.425,height=.235))
 grid.rect(x=.725,y=yy,width=.425,height=.235,gp=gpar(fill=NA,col="#BDA793",lwd=.65))
}
grid.circle(.060,.109,r=unit(.032,"in"),gp=gpar(fill=terra,col=NA))
txt("Clustered caf\u00e9s",.085,.109,8.2)
grid.circle(.535,.109,r=unit(.027,"in"),gp=gpar(fill="#AB9D91",col=NA));txt("Outside clusters",.555,.109,8.2)
txt("Clustering: 140 m radius; minimum 5 nearby caf\u00e9s, counting the caf\u00e9 itself.",.05,.078,7.1,col="#8B6D59")
grid.lines(c(.05,.95),c(.057,.057),gp=gpar(col="#DACABA",lwd=.7))
txt("Sources: OpenStreetMap contributors + NYC Department of City Planning",.05,.040,6.4,col="#8B6D59")
txt("Focus areas selected for detail; missing points can reflect incomplete mapping.",.05,.023,6.4,col="#8B6D59")
dev.off()
