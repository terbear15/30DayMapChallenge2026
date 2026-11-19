# Dusk Till Dawn
Day 17 of the 2026 #30DayMapChallenge. Follow sunlight and satellite-observed city lights across the contiguous United States.

[Open the interactive map](https://terbear15.github.io/30DayMapChallenge2026/day17-light-dark/)

Run locally with python -m http.server 8000 from this directory, then open http://localhost:8000. The static site also runs on GitHub Pages.

NASA Blue Marble imagery depicts November 2004. Black Marble lights are from the 2016 composite. The animation models solar illumination and reveals the composite as night falls. The regional clocks follow IANA time zones. The time-zone boundary overlay is unavailable in this edition.

## Rebuild the textures

Install Pillow. Create a Data directory beside assets and save the following NASA originals in it. Run python Scripts/prepare_imagery.py from this directory.

- [day.jpg](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/november/world.200411.3x21600x10800.jpg)
- [A1.jpg](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/november/world.200411.3x21600x21600.A1.jpg)
- [B1.jpg](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/november/world.200411.3x21600x21600.B1.jpg)
- [night.jpg](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg)
- [night-A1.jpg](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_A1.jpg)
- [night-B1.jpg](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_B1.jpg)
Run python Scripts/prepare_detail.py to recreate the lightweight previews and the native-resolution regional day/night and global daylight tiles. Regional imagery spans 17,280 × 8,640 source pixels. Detail textures are streamed around the current view.

### Clouds and oceans
For the opening cloud composite and water reflectivity mask, save [clouds-hd.jpg](https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg) and [ocean.tif](https://www.solarsystemscope.com/textures/download/2k_earth_specular_map.tif) from Solar System Scope (CC BY 4.0) in Data. Save [NASA November shaded bathymetry](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/november/world.topo.bathy.200411.3x5400x2700.jpg) as Data/ocean-relief.jpg. Run python Scripts/prepare_atmosphere.py to resample and combine the layers. The cloud opacity falls to zero as the camera settles.

### Terrain lighting
Download [NASA GEBCO elevation imagery](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_21600x10800.jpg) as Data/elevation.jpg and run python Scripts/prepare_terrain.py. The renderer estimates east and north gradients with latitude-adjusted pixel spacing, then applies a gentle, vertically exaggerated hillshade using the simulation sun vector. Relief fades at the regional boundary and at night.

### Worldwide detail and playback
The default playback rate is two simulated hours per real second (12 seconds per 24 hours). The five-second opening and the stationary United States share one base. Manual exploration fades in native day/night detail from these same unlabeled NASA mosaics. GEBCO gradients use locally hosted, shared 18-degree elevation tiles (one arcminute sampling). Run python Scripts/prepare_global_elevation.py with the elevation.jpg described above to rebuild them. Arrow keys on the focused map pan across regions. Regional clocks still follow the four US reference zones.

To rebuild worldwide satellite detail, download all eight NASA November 2004 Blue Marble tiles (A1 through D2) and matching 2016 Black Marble tiles. Use the A1 and B1 download links above as filename templates, storing them as Data/A1.jpg and Data/night-A1.jpg and similarly for each tile. Run python Scripts/prepare_satellite.py. The resulting 6-degree tiles contain imagery only. No political boundary layer is rendered.
