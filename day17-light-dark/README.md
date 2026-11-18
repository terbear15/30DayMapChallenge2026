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
