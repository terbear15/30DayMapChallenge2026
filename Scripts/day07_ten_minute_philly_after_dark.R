library(sf)
library(ragg)
library(png)

args <- commandArgs(trailingOnly = TRUE)
stopifnot(length(args) %in% c(0L, 2L))
data_dir <- if (length(args)) args[[1]] else "Data/day07_ten_minute"
output <- if (length(args)) args[[2]] else "Maps/day07_ten_minute_philly_after_dark.png"
dir.create(dirname(output), recursive = TRUE, showWarnings = FALSE)
streets <- st_read(file.path(data_dir, "streets.gpkg"), quiet = TRUE)
rivers <- st_read(file.path(data_dir, "rivers.gpkg"), quiet = TRUE)
stopifnot(nrow(streets) == 20052L, nrow(rivers) == 321L,
          st_crs(streets) == st_crs(rivers))

# Named corridors are a graphic emphasis, not a measure of traffic or light.
highlight <- toupper(trimws(streets$st_name)) %in%
  c("BROAD", "MARKET", "BENJAMIN FRANKLIN", "LANCASTER", "BALTIMORE", "FRANKFORD")
background <- "#030D15"
water <- "#132C3C"
local_street <- "#6B8596"
gold <- "#D8B56B"
white <- "#E9E9E1"

# A fixed projected extent preserves geography and fills the portrait panel.
center <- st_coordinates(st_transform(
  st_sfc(st_point(c(-75.171, 39.963)), crs = 4326), 26918))
map_width <- 9800
map_height <- map_width * 1.25
xlim <- center[1] + c(-.5, .5) * map_width
ylim <- center[2] + c(-.5, .5) * map_height

agg_png(output, width = 2000, height = 2500, res = 200, background = background)
par(mai = rep(0, 4), xaxs = "i", yaxs = "i", family = "sans")
plot.new()
plot.window(xlim, ylim, asp = 1)
plot(st_geometry(rivers), add = TRUE, col = water, border = NA)
plot(st_geometry(streets[!highlight, ]), add = TRUE, col = local_street, lwd = .40)
plot(st_geometry(streets[highlight, ]), add = TRUE, col = gold, lwd = .85)

# One plain title block and a small source credit complete the composition.
par(fig = c(0, 1, 0, 1), new = TRUE)
plot.new()
plot.window(c(0, 1), c(0, 1))
rect(0, .828, .58, 1, col = background, border = NA)
text(.045, .949, "PHILLY /", adj = 0, col = white, cex = 2.55)
text(.045, .908, "AFTER DARK", adj = 0, col = white, cex = 2.55)
text(.045, .867, "07  /  10 MINUTE MAP", adj = 0, col = local_street, cex = .90)
segments(.045, .846, .105, .846, col = gold, lwd = 1.5)
rect(0, 0, 1, .035, col = background, border = NA)
text(.045, .017, "STREETS: CITY OF PHILADELPHIA  /  RIVERS: PWD",
     adj = 0, col = local_street, cex = .61)
text(.955, .017, "TERRY BOXUAN XU", adj = 1, col = white, cex = .61)
invisible(dev.off())

thumb <- file.path(dirname(output), "Thumbnails", "day07_thumbnail.png")
dir.create(dirname(thumb), recursive = TRUE, showWarnings = FALSE)
agg_png(thumb, 1000, 1000, background = background)
grid::grid.raster(readPNG(output, native = TRUE),
                  width = grid::unit(.8, "npc"), height = grid::unit(1, "npc"))
invisible(dev.off())
