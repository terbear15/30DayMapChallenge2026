# Landscape page composition, loaded by make_maps.R after geographic layers.
header<-function(title1,title2,subtitle,page){
 grid.newpage();grid.rect(gp=gpar(fill=bg,col=NA))
 txt("A WAY THROUGH PHILLY",.045,.964,9,col=teal,face="bold")
 txt(paste0("02 / LINES   ",page),.955,.964,8.5,col=teal,face="bold",just="right");rule(.944)
 txt(paste(title1,title2),.045,.892,29,family="Cambria",face="bold")
 txt(subtitle,.045,.843,10,col=muted)
}
focuslabels<-data.frame(name=c("WEST PHILLY","CENTER CITY","NORTH PHILLY"),lon=c(-75.245,-75.159,-75.165),lat=c(39.978,39.957,39.987))
focuscoords<-t(mapply(loc,focuslabels$lon,focuslabels$lat));focuslabels$X<-focuscoords[,1];focuslabels$Y<-focuscoords[,2]
focusmap<-citymap
focusmap$layers[[6]]<-geom_text(data=focuslabels,aes(X,Y,label=name),size=2.4,color=muted,family="Arial",fontface="bold")
focusmap<-suppressMessages(focusmap+coord_sf(crs=26918,xlim=atlas_x,ylim=atlas_y,datum=NA,expand=FALSE))+
 annotate("label",x=cx+300,y=cy-900,label="34th & Walnut / Weitzman",size=2.7,color=ink,fill="white",family="Arial",fontface="bold",hjust=0,linewidth=0)
draw_city<-function(){
 header("From University City,","across Philadelphia.","Eight bus routes near 34th & Walnut, enlarged. Full city network at right.","1/3")
 print(focusmap,vp=viewport(x=.364,y=.526,width=.66,height=.582))
 print(citymap,vp=viewport(x=.852,y=.513,width=.235,height=.575))
 txt("N",.065,.786,8,face="bold",just="center")
 grid.lines(c(.065,.065),c(.739,.765),arrow=arrow(length=unit(.055,"in")),gp=gpar(col=ink))
 txt("FULL CITY NETWORK",.747,.793,9,col=teal,face="bold")
 txt("112 scheduled bus routes",.747,.770,8,col=muted)
 txt("NEAR WEITZMAN / 450 M STRAIGHT-LINE RADIUS",.055,.219,8.5,col=teal,face="bold")
 for(i in seq_along(ids)){
  col<-(i-1)%%2;row<-(i-1)%/%2;xx<-.075+col*.335;yy<-.186-row*.031
  badge(short[i],xx,yy,colors[i],if(i>6).52 else .35)
  txt(desc[i],xx+.027,yy,7.4)
 }
 txt("Teal: other University City routes",.747,.205,8)
 txt("9, 38, 43, 44, 64, 79, 124, 125",.747,.181,7.6,face="bold")
 txt("Gray: remaining bus network",.747,.152,8)
 txt("Includes school + overnight routes.",.747,.130,7.4,col=muted)
 txt("All lines clipped to city limits.",.747,.101,7.5,col=muted)
 txt("Diamond = 34th & Walnut. Named suburban terminals may lie beyond the city edge.",.055,.071,7.5,col=muted)
 footer()
}
draw_close<-function(){
 header("First, find","your stop.","34th & Walnut is the anchor. Nearby buses use several different streets.","2/3")
 print(close,vp=viewport(x=.354,y=.444,width=.64,height=.72))
 txt("N",.065,.773,8,face="bold")
 grid.lines(c(.069,.069),c(.725,.751),arrow=arrow(length=unit(.055,"in")),gp=gpar(col=ink))
 txt("BOARDING STOPS",.710,.787,10,col=teal,face="bold")
 for(i in 1:8){
  xx<-.720;yy<-.735-(i-1)*.080
  grid.circle(xx,yy,r=unit(.085,"in"),gp=gpar(fill=teal,col=NA));txt(board$letter[i],xx,yy,8,col="white",face="bold",just="center")
  txt(board$title[i],xx+.018,yy+.003,10,face="bold")
  txt(board$detail[i],xx+.018,yy-.025,8,col=muted)
 }
 txt("Gold / Green = LUCY loops. Check the headsign: some trips turn earlier. The return stop may differ.",.055,.071,8,col=teal,face="bold")
 footer()
}
draw_atlas<-function(){
 header("One route","at a time.","Eight daytime routes near Weitzman, shown separately at the same scale.","3/3")
 for(i in 1:8){
  column<-(i-1)%%4;row<-(i-1)%/%4;xx<-.155+column*.23;yy<-.613-row*.350
  print(panel(ids[i]),vp=viewport(x=xx,y=yy,width=.215,height=.270))
  badge(short[i],xx-.090,yy+.161,colors[i],if(i>6).52 else .35)
  txt(desc[i],xx-.103,yy+.127,7)
 }
 txt("Diamond = 34th & Walnut. All scheduled variants on the selected day are shown; individual trips may turn earlier.",.055,.075,7,col=muted)
 footer()
}
