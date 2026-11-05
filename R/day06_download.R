# Refresh the pinned 1796 source scan from the Library of Congress.
# Run from the repository root. Existing files are replaced after validation.
dir.create("Data/day06_vintage", recursive = TRUE, showWarnings = FALSE)
root <- "https://tile.loc.gov/image-services/iiif/service:gmd:gmd382:g3824:g3824p:ct001369"
dest <- "Data/day06_vintage/hills1796.jpg"
temp <- tempfile(fileext = ".jpg")
download.file(paste0(root, "/full/pct:50/0/default.jpg"), temp, mode = "wb")
image <- jpeg::readJPEG(temp)
stopifnot(dim(image)[1] == 4080L, dim(image)[2] == 5714L)
stopifnot(file.copy(temp, dest, overwrite = TRUE))
unlink(temp)
