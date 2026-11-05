library(sf)
library(terra)
library(ragg)

args <- commandArgs(trailingOnly = TRUE)
stopifnot(length(args) %in% c(0L, 2L))
data_dir <- if (length(args)) args[[1]] else "Data/day05_sight"
output <- if (length(args)) args[[2]] else "Maps/day05_sight_twin_peaks.png"
dir.create(dirname(output), recursive = TRUE, showWarnings = FALSE)

dem <- rast(file.path(data_dir, "elevation.tif"))
streets <- st_read(file.path(data_dir, "streets.gpkg"), quiet = TRUE)
shore <- st_transform(st_read(file.path(data_dir, "shoreline.geojson"), quiet = TRUE), 32610)
stopifnot(same.crs(dem, "EPSG:32610"), st_crs(streets)$epsg == 32610L,
          nrow(streets) == 16199L, !anyDuplicated(streets$cnn))

project_points <- function(lon, lat) {
  pts <- st_as_sf(data.frame(lon, lat), coords = c("lon", "lat"), crs = 4326)
  st_coordinates(st_transform(pts, 32610))
}

# Snap the north-summit observation point to the DEM cell used by viewshed().
summit <- project_points(-122.44775, 37.75346)
observer <- xyFromCell(dem, cellFromXY(dem, summit))
eye <- 1.7
observer_z <- extract(dem, observer)[1, 1] + eye
view <- viewshed(dem, as.numeric(observer), observer = eye, target = 0,
                 curvcoef = 0, output = "yes/no")
print(freq(view))

# Limit the viewshed to mainland San Francisco. Keep nearby island shorelines for context.
shore_parts <- st_cast(st_geometry(shore), "POLYGON")
mainland <- st_as_sf(shore_parts[which.max(st_area(shore_parts))])
land <- rasterize(vect(mainland), dem, field = 1, background = 0)
z <- values(dem)[, 1]
city <- values(land)[, 1] == 1
island <- !city & values(rasterize(vect(shore), dem, field = 1, background = 0))[, 1] == 1
visible <- values(view)[, 1] == 1 & city
stopifnot(sum(visible, na.rm = TRUE) > 10000, all(is.finite(z[city])))

# Select legible profile examples on opposite sides of the summit. Use the
# same planar DEM and zero-height target as the viewshed, and require the
# interpolated profile and mapped visibility to agree.
choose_profile <- function(lon, lat, clear) {
  candidates <- project_points(lon, lat)
  offsets <- as.matrix(expand.grid(dx = seq(-240, 240, 30), dy = seq(-240, 240, 30)))
  candidates <- sweep(offsets[order(rowSums(offsets^2)), ], 2, candidates, "+")
  cells <- unique(cellFromXY(dem, candidates))
  cells <- cells[city[cells] & visible[cells] == clear & z[cells] > 10]
  for (cell in cells) {
    target <- xyFromCell(dem, cell)
    delta <- target - observer
    length_m <- sqrt(sum(delta^2))
    fraction <- seq(0, 1, length.out = ceiling(length_m / 5) + 1)
    xy <- cbind(observer[1] + fraction * delta[1], observer[2] + fraction * delta[2])
    terrain <- extract(dem, xy, method = "bilinear")[, 1]
    ray <- observer_z + fraction * (tail(terrain, 1) - observer_z)
    obstacles <- which(terrain - ray > 0.15)
    if ((clear && !length(obstacles)) ||
        (!clear && max(terrain - ray) > 15 && length(obstacles) &&
         fraction[obstacles[1]] > .10 && fraction[obstacles[1]] < .86)) {
      return(list(target = target, distance = fraction * length_m / 1000,
                  terrain = terrain, ray = ray,
                  block = if (clear) NA_integer_ else obstacles[1]))
    }
  }
  stop("No suitable profile near ", lon, ", ", lat)
}

a <- choose_profile(-122.489, 37.783, TRUE)
b <- choose_profile(-122.442, 37.793, FALSE)
print(data.frame(profile = c("A", "B"),
                 distance_km = c(max(a$distance), max(b$distance)),
                 blocked_at_km = c(NA, b$distance[b$block])))

ink <- "#03111F"
ivory <- "#F7EAD3"
secondary <- "#9BB0BD"
gold <- "#F4B455"
shade <- "#41535E"

# Compose the relief in raster space and keep the centerlines as vectors
# until the final render. The relief modulation applies to both land colors.
slope <- terrain(dem, "slope", unit = "radians")
aspect <- terrain(dem, "aspect", unit = "radians")
west <- values(shade(slope, aspect, angle = 29, direction = 315))[, 1]
east <- values(shade(slope, aspect, angle = 45, direction = 40))[, 1]
light <- pmax(0, pmin(1, 0.90 * west + 0.10 * east))
light[!is.finite(light)] <- .62
relief <- pmax(0, pmin(1, (light - .12) / .66))
color_ramp <- function(colors) colorRampPalette(colors)(256)
tone <- 1L + round(255 * relief)
colors <- rep(ink, length(z))
colors[city] <- color_ramp(c("#071622", "#2D414D", "#87989A"))[tone[city]]
colors[island] <- color_ramp(c("#102331", "#354956", "#60757A"))[tone[island]]
colors[which(visible)] <- color_ramp(c("#402813", "#A56024", "#FFD07A"))[tone[which(visible)]]
rgb_map <- as.raster(matrix(colors, nrow(dem), ncol(dem), byrow = TRUE))

agg_png(output, width = 2000, height = 2500, res = 200, background = ink)
par(mai = c(0, 0, 0, 0), xaxs = "i", yaxs = "i", family = "sans", fg = ivory)
panel <- function(fig, xlim = c(0, 1), ylim = c(0, 1), asp = NA) {
  par(fig = fig, new = TRUE)
  plot.new()
  plot.window(xlim, ylim, asp = asp)
}
plot.new()
panel(c(0, 1, 0, 1))
text(.052, .958, "30 DAY MAP CHALLENGE     /     05 SIGHT", adj = 0, col = gold, cex = 1.03, font = 2)
text(.050, .914, "The View from Twin Peaks", adj = 0, col = ivory, family = "serif", cex = 3.50)
text(.052, .879, "What the hills let you see", adj = 0, col = secondary, cex = 1.35)
text(.948, .879, "SAN FRANCISCO, CA", adj = 1, col = secondary, cex = .87, font = 2)

panel(c(.036, .964, .251, .852), c(541470, 555300), c(4175050, 4186250), asp = 1)
rasterImage(rgb_map, xmin(dem), ymin(dem), xmax(dem), ymax(dem), interpolate = TRUE)
contour_dem <- mask(dem, vect(mainland))
contours <- st_as_sf(as.contour(contour_dem, levels = seq(20, 280, by = 20)))
plot(st_geometry(contours), add = TRUE, col = "#F6E6CC42", lwd = .29)
major <- streets$classcode %in% c(1, 2, 3, 6)
plot(st_geometry(streets[!major, ]), add = TRUE, col = "#E7EAE478", lwd = .27)
plot(st_geometry(streets[major, ]), add = TRUE, col = "#FFF0CE8C", lwd = .48)

label <- function(lon, lat, value, ...) {
  p <- project_points(lon, lat)
  text(p[1], p[2], value, ...)
}
label(-122.519, 37.771, "PACIFIC\nOCEAN", col = secondary, family = "serif", font = 3, cex = 1)
label(-122.385, 37.813, "SAN FRANCISCO\nBAY", col = secondary, family = "serif", font = 3, cex = 1)
label(-122.481, 37.815, "Golden Gate", col = secondary, family = "serif", font = 3, cex = 1)
for (i in seq_along(list(a, b))) {
  p <- list(a, b)[[i]]
  segments(observer[1], observer[2], p$target[1], p$target[2], col = ink, lwd = 2.4)
  segments(observer[1], observer[2], p$target[1], p$target[2], col = ivory,
           lwd = 1.15, lty = if (i == 1) 1 else 2)
  points(p$target[1], p$target[2], pch = 21, bg = ivory, col = ink, cex = .8)
  text(p$target[1], p$target[2] + 240, LETTERS[i], col = ivory, cex = 1.15, font = 2)
}
points(observer[1], observer[2], pch = 21, bg = ivory, col = ink, cex = 1.45, lwd = 1.1)
text(observer[1] + 130, observer[2] - 220, "Twin Peaks", adj = 0,
     col = ivory, family = "serif", font = 4, cex = 1.29)
arrows(542150, 4184800, 542150, 4185420, col = ivory, length = .08, lwd = .9)
text(542150, 4185630, "N", col = ivory, cex = .72)
segments(542450, 4175390, 543450, 4175390, col = ivory, lwd = 1.8)
text(542950, 4175590, "1 km", col = ivory, cex = .77)

panel(c(0, 1, 0, 1))
rect(.052, .236, .068, .246, col = gold, border = NA)
text(.076, .241, "Visible terrain", adj = 0, col = ivory, cex = .98)
rect(.257, .236, .273, .246, col = shade, border = "#8B9CA0")
text(.281, .241, "Terrain hidden by hills", adj = 0, col = ivory, cex = .98)
text(.948, .241, sprintf("NORTH SUMMIT  /  %d m", round(observer_z - eye)),
     adj = 1, col = secondary, cex = .86)
segments(.052, .220, .948, .220, col = "#334B5D")
segments(.502, .074, .502, .206, col = "#334B5D")
text(.052, .199, "A   Clear sightline", adj = 0, col = ivory, family = "serif", cex = 1.45)
text(.529, .199, "B   Blocked by a ridge", adj = 0, col = ivory, family = "serif", cex = 1.45)

profile <- function(p, fig) {
  panel(fig, c(0, 6.2), c(0, 320))
  for (h in c(100, 200, 300)) segments(0, h, 6.2, h, col = "#263E50", lwd = .55)
  d <- p$distance
  polygon(c(0, d, tail(d, 1)), c(0, p$terrain, 0), col = "#314956", border = NA)
  lines(d, p$terrain, col = "#B8C6C5", lwd = .8)
  if (is.na(p$block)) {
    lines(d, p$ray, col = gold, lwd = 1.4)
  } else {
    lines(d[seq_len(p$block)], p$ray[seq_len(p$block)], col = gold, lwd = 1.4)
    lines(d[p$block:length(d)], p$ray[p$block:length(d)], col = gold, lty = 2, lwd = 1)
  }
  points(0, p$ray[1], pch = 21, col = ink, bg = ivory, cex = .75, xpd = NA)
  points(tail(d, 1), tail(p$ray, 1), pch = 21, col = ink, bg = ivory, cex = .65)
  text(.09, 306, "300 m", col = secondary, cex = .66, adj = 0)
  text(tail(d, 1), -25, sprintf("%.1f km", tail(d, 1)), col = secondary, cex = .72, adj = .5, xpd = NA)
  text(0, -25, "Twin Peaks", col = secondary, cex = .72, adj = 0, xpd = NA)
}
profile(a, c(.055, .472, .092, .180))
profile(b, c(.532, .949, .092, .180))

panel(c(0, 1, 0, 1))
segments(.052, .062, .948, .062, col = "#334B5D")
text(.052, .045, "Terrain visibility at 1.7 m eye height. Buildings, trees and fog are outside the model.",
     adj = 0, col = secondary, cex = .79)
text(.052, .027, "USGS 3DEP elevation  /  DataSF street centerlines and shoreline", adj = 0, col = secondary, cex = .73)
text(.948, .027, "TERRY BOXUAN XU", adj = 1, col = ivory, cex = .73, font = 2)
invisible(dev.off())
