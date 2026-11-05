# Day 06 — Philadelphia, Capital of a Young Republic

The map is an annotated reproduction of John Hills's This plan of the city of Philadelphia and its environs (showing the improved parts), published in Philadelphia in 1796.

- Library of Congress item and rights information. https://www.loc.gov/item/2007625050/
- Full scan resource. https://www.loc.gov/resource/g3824p.ct001369/
- Cached JPEG. https://tile.loc.gov/image-services/iiif/service:gmd:gmd382:g3824:g3824p:ct001369/full/pct:50/0/default.jpg

Credit — Library of Congress, Geography and Map Division. The catalog states that its digitized Geography and Map Division collections are free to use and reuse unless a restrictive Rights Advisory is present.

## Files and method

hills1796.jpg is the 5714 × 4080 pixel source scan, downloaded November 5, 2026. loc.json preserves the catalog response. landmarks.csv records four manually located annotation anchors in source-image pixels, with x increasing right and y increasing down from the top left. These are approximate points identifying building sites on the historical engraving. They are not surveyed coordinates or building footprints.

The script crops and tones the scan without warping the geography. It normalizes uneven scanned-paper brightness and renders the engraving in a warm brown palette. The main crop is x=1400–5660, y=780–3540. The inset is x=3940–4760, y=2020–2570. The red rectangle on the main map shows the same inset extent. Both crops preserve their source aspect ratios. The detail is approximately 2.6 times the main map's display scale. Native source labels and their original numerical references remain in the engraving. The larger red numbered callouts are new annotations, identified by the separate guide.

The city geography represents Hills's 1796 plan. The timeline and landmark roles cover the full 1790–1800 capital decade. The historic scan depicts the mapped and planned streets, not a modern reconstruction or an independently verified inventory of occupied buildings.

## Landmark and timeline sources

- Congress Hall and both inaugural ceremonies. https://www.nps.gov/places/000/congress-hall.htm
- Congress convened December 6, 1790. https://history.house.gov/Historical-Highlights/1700s/The-interim-federal-capital-in-Philadelphia/
- Independence Hall's February 1791 court term. https://www.fjc.gov/history/spotlight-judicial-history/supreme-court-meeting-places
- Old City Hall as the principal Supreme Court venue. https://www.supremecourt.gov/visiting/activities/meetingsites.aspx
- Washington and Adams at the President's House, including the nine people Washington enslaved there. https://home.nps.gov/inde/learn/historyculture/history-of-the-presidents-house-site.htm
- Adams's inauguration on March 4, 1797. https://home.nps.gov/places/john-adams-inauguration.htm
- Philadelphia's temporary capital period. https://www.senate.gov/about/historic-buildings-spaces/meeting-places/philadelphia.htm

## Reproduce

Install jpeg, png, and ragg, then run source("Scripts/day06_vintage_philadelphia_capital.R") from the repository root. The script also accepts data-directory and output-path arguments when called through Rscript. It creates the full poster and square thumbnail from the bundled files.
