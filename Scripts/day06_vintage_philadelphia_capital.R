library(jpeg)
library(png)
library(ragg)

args <- commandArgs(trailingOnly = TRUE)
stopifnot(length(args) %in% c(0L, 2L))
data_dir <- if (length(args)) args[[1]] else "Data/day06_vintage"
output <- if (length(args)) args[[2]] else "Maps/day06_vintage_philadelphia_capital.png"
dir.create(dirname(output), showWarnings = FALSE, recursive = TRUE)
original <- readJPEG(file.path(data_dir, "hills1796.jpg"))
stopifnot(dim(original)[1] == 4080L, dim(original)[2] == 5714L)
landmarks <- read.csv(text = readLines(file.path(data_dir, "landmarks.csv"), encoding = "UTF-8"))
stopifnot(nrow(landmarks) == 4L, all(landmarks$x > 0), all(landmarks$y > 0))

paper <- "#F2E5CB"
ink <- "#3C281D"
red <- "#A24632"
muted <- "#78654F"
line <- "#AF9877"
water <- "#5D7D84"

# Native scan coordinates are kept throughout. No affine warping or modern
# basemap substitution is used. All red landmark annotations are added layers.
crop <- function(bounds) {
  original[bounds[3]:bounds[4], bounds[1]:bounds[2], , drop = FALSE]
}
city_bounds <- c(1400L, 5660L, 780L, 3540L)
detail_bounds <- c(3940L, 4760L, 2020L, 2570L)

# Translate the original scan into a restrained two-ink reproduction.
# Blockwise high quantiles estimate paper brightness while preserving lines.
reproduce <- function(image) {
  gray <- .299 * image[, , 1] + .587 * image[, , 2] + .114 * image[, , 3]
  nr <- nrow(gray)
  nc <- ncol(gray)
  row_bins <- split(seq_len(nr), ceiling(seq_len(nr) / 180))
  col_bins <- split(seq_len(nc), ceiling(seq_len(nc) / 180))
  back <- matrix(0, length(row_bins), length(col_bins))
  for (i in seq_along(row_bins)) {
    for (j in seq_along(col_bins)) {
      back[i, j] <- quantile(gray[row_bins[[i]], col_bins[[j]]], .87)
    }
  }
  # Interpolate the coarse paper estimate before subtracting scan shading.
  mid_cols <- vapply(col_bins, mean, numeric(1))
  mid_rows <- vapply(row_bins, mean, numeric(1))
  horizontal <- t(apply(back, 1, function(v) approx(mid_cols, v, seq_len(nc), rule = 2)$y))
  background <- apply(horizontal, 2, function(v) approx(mid_rows, v, seq_len(nr), rule = 2)$y)
  density <- pmax(0, pmin(1, (1 - gray / pmax(background, .25)) * 1.30))
  # A slight warm variation retains the printed-map character.
  level <- as.integer(round(255 * density)) + 1L
  palette <- colorRampPalette(c(paper, "#BDA788", "#493326"))(256)
  as.raster(matrix(palette[level], nr, nc))
}
city <- reproduce(crop(city_bounds))
detail <- reproduce(crop(detail_bounds))
rm(original)
invisible(gc(verbose = FALSE))

# Preserve the source-map aspect ratio exactly inside each allocated frame.
frame <- function(x, y, w, h, bounds) {
  aspect <- (bounds[2] - bounds[1] + 1) / (bounds[4] - bounds[3] + 1)
  actual_h <- w * 2400 / 3000 / aspect
  if (actual_h > h) {
    actual_h <- h
    w <- h * 3000 / 2400 * aspect
  }
  c(x = x, y = y + (h - actual_h) / 2, w = w, h = actual_h)
}
city_frame <- frame(.040, .345, .920, .477, city_bounds)
detail_frame <- frame(.052, .111, .455, .206, detail_bounds)

to_page <- function(x, y, bounds, box) {
  cbind(box["x"] + (x - bounds[1]) / (bounds[2] - bounds[1]) * box["w"],
        box["y"] + (bounds[4] - y) / (bounds[4] - bounds[3]) * box["h"])
}
agg_png(output, width = 2400, height = 3000, res = 240, background = paper)
par(mai = c(0, 0, 0, 0), xaxs = "i", yaxs = "i", family = "serif")
plot.new()
plot.window(c(0, 1), c(0, 1))
rect(.013, .012, .987, .988, border = ink, lwd = 1.6)
rect(.019, .017, .981, .983, border = line, lwd = .65)
segments(.050, .951, .270, .951, col = ink, lwd = .7)
segments(.730, .951, .950, .951, col = ink, lwd = .7)
text(.500, .951, "DAY 06   /   VINTAGE", col = ink, cex = 1.03, font = 2)
text(.500, .903, "Philadelphia", col = ink, cex = 5.3, font = 2)
text(.500, .858, "Capital of a Young Republic", col = ink, cex = 2.0, font = 3)
text(.500, .830, "1790\u20131800   \u00b7   THE CITY AS MAPPED BY JOHN HILLS IN 1796", col = muted, cex = .88)

draw_map <- function(image, box) {
  rasterImage(image, box["x"], box["y"], box["x"] + box["w"], box["y"] + box["h"], interpolate = TRUE)
  rect(box["x"], box["y"], box["x"] + box["w"], box["y"] + box["h"], border = ink, lwd = .8)
}
draw_map(city, city_frame)
# Mark the exact crop used by the district inset.
corners <- to_page(c(detail_bounds[1], detail_bounds[2]),
                   c(detail_bounds[4], detail_bounds[3]), city_bounds, city_frame)
rect(corners[1, 1], corners[1, 2], corners[2, 1], corners[2, 2],
     border = red, lwd = 1.5)
text(corners[1, 1] - .010, mean(corners[, 2]), "CAPITAL\nDISTRICT", col = red, adj = 1,
     cex = .71, font = 2, family = "sans")
# Readable labels identify the rivers while the engraved linework remains visible.
text(.081, .561, "SCHUYLKILL", col = water, srt = 73, cex = .95, font = 3)
text(.923, .541, "DELAWARE", col = water, srt = 87, cex = 1.10, font = 3)

text(.050, .324, "THE GOVERNMENT DISTRICT", adj = 0, col = ink, cex = 1.20, font = 2)
text(.955, .324, "2.6\u00d7 detail  /  Red annotations added", adj = 1, col = muted, cex = .78, font = 3)
draw_map(detail, detail_frame)
points <- to_page(landmarks$x, landmarks$y, detail_bounds, detail_frame)
# Callout circles avoid obscuring the adjacent buildings in the State House group.
callouts <- rbind(c(.172, .174), c(.250, .133), c(.200, .285), c(.357, .178))
for (i in seq_len(nrow(landmarks))) {
  segments(points[i, 1], points[i, 2], callouts[i, 1], callouts[i, 2], col = paper, lwd = 3.2)
  segments(points[i, 1], points[i, 2], callouts[i, 1], callouts[i, 2], col = red, lwd = .85)
  points(points[i, 1], points[i, 2], pch = 21, bg = red, col = paper, cex = .72)
  points(callouts[i, 1], callouts[i, 2], pch = 21, bg = red, col = paper, cex = 2.25, lwd = 1)
  text(callouts[i, 1], callouts[i, 2], i, col = paper, cex = .99, font = 2)
}
guide <- list(
  c("Congress Hall", "House and Senate, 1790\u20131800.", "Washington and Adams took oaths here."),
  c("Independence Hall", "Then Pennsylvania's State House.", "Supreme Court's February 1791 term."),
  c("President\u2019s House", "Home and workplace of Washington", "and Adams, 1790\u20131800."),
  c("Old City Hall", "Principal Philadelphia meeting place", "of the Supreme Court, 1791\u20131800.")
)
for (i in seq_along(guide)) {
  top <- .294 - (i - 1) * .047
  text(.548, top, i, col = red, font = 2, cex = 1.25)
  text(.575, top, guide[[i]][1], adj = 0, col = ink, font = 2, cex = 1.13)
  text(.575, top - .015, guide[[i]][2], adj = 0, col = muted, cex = .84)
  text(.575, top - .028, guide[[i]][3], adj = 0, col = muted, cex = .84)
}
text(.545, .108, "At the President\u2019s House, Washington held nine people in slavery.",
     adj = 0, col = ink, cex = .66, font = 3)

segments(.050, .096, .950, .096, col = line)
text(.500, .083, "A DECADE AS THE CAPITAL", col = ink, cex = .88, font = 2)
segments(.120, .066, .880, .066, col = ink, lwd = .8)
for (x in c(.120, .500, .880)) points(x, .066, pch = 21, bg = red, col = ink, cex = .85)
text(c(.120, .500, .880), .052, c("1790", "1797", "1800"), col = ink, cex = 1.06, font = 2)
text(c(.120, .500, .880), .038,
     c("Congress convenes \u00b7 Dec 6", "Adams inaugurated \u00b7 Mar 4", "Government moves to Washington"),
     col = muted, cex = .67)
text(.050, .023, "Historical plan: John Hills (1796), Library of Congress \u00b7 Landmark history: NPS / FJC / U.S. Supreme Court",
     adj = 0, col = muted, cex = .59)
text(.950, .023, "TERRY BOXUAN XU", adj = 1, col = ink, cex = .62, font = 2, family = "sans")
invisible(dev.off())

thumb <- file.path(dirname(output), "Thumbnails", "day06_thumbnail.png")
dir.create(dirname(thumb), showWarnings = FALSE, recursive = TRUE)
agg_png(thumb, 1000, 1000, background = paper)
grid::grid.raster(readPNG(output, native = TRUE),
                  width = grid::unit(.8, "npc"), height = grid::unit(1, "npc"))
invisible(dev.off())
