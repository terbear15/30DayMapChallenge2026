# Day 05 · Sight

- `elevation.tif` is a Float32 export from the [USGS 3DEP Elevation ImageServer](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer). The requested geographic envelope was −122.53, 37.708, −122.37, 37.83, with output EPSG:32610 and size 1200 × 1200. The resulting grid is approximately 11.8 m per cell.
- `streets.gpkg` contains 16,199 unique street centerline IDs from the [DataSF Active Streets ArcGIS layer](https://www.arcgis.com/home/item.html?id=184e1f64b55f4dee9e8ca349963eebc8). The envelope query used the same geographic bounds. The snapshot retains CNN, street name and class, and was reprojected to UTM zone 10N.
- `shoreline.geojson` is the [San Francisco mainland shoreline layer](https://services.arcgis.com/Zs2aNLFN00jrS4gG/ArcGIS/rest/services/CPAs_WFL1/FeatureServer/7). The largest polygon limits the viewshed display to mainland San Francisco. Nearby islands are shown for context.

The observer is placed on the DEM cell nearest the north summit (37.75346° N, 122.44775° W), 1.7 m above ground. The target is at ground level. The analysis uses planar line of sight, without curvature or atmospheric refraction corrections. Buildings, vegetation, and fog are outside the model. The two illustrated profiles sample the same elevation surface and agree with the raster classification at their endpoints.
