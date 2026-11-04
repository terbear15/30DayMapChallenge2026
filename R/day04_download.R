library(httr2)
library(sf)
dir.create("Data/day04_clusters",recursive=TRUE,showWarnings=FALSE)
if(!file.exists("Data/day04_clusters/manhattan-borough.geojson")){
 request("https://data.cityofnewyork.us/resource/gthc-hcne.geojson?$limit=10")|>req_timeout(120)|>req_perform(path=tempfile_path<-tempfile(fileext=".geojson"))
 boroughs<-st_read(tempfile_path,quiet=TRUE)
 st_write(boroughs[boroughs$boroname=="Manhattan",],"Data/day04_clusters/manhattan-borough.geojson",quiet=TRUE)
}
if(!file.exists("Data/day04_clusters/cafes.json")){
 query<-'[out:json][timeout:70];nwr["amenity"="cafe"](40.695,-74.025,40.885,-73.900);out center;'
 request("https://overpass-api.de/api/interpreter")|>req_url_query(data=query)|>req_timeout(120)|>req_perform(path="Data/day04_clusters/cafes.json")
}
