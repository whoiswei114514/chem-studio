# Additional Laboratory Artwork

All 55 vector illustrations in `assets/laboratory/` are generated deterministically by
`scripts/generate-laboratory-art.cjs` in Chem Studio's classic flat scientific line-art style
(Qt `QSvgRenderer` / pure vector SVG 1.1 compatible, zero gradients, zero embedded rasters, zero filters or clipPaths).

- **Author**: Chem Studio contributors
- **License**: WTFPL-2.0
- **Source & Verification**: Exact file dimensions, connection ports, and SHA-256 digests are recorded in `manifest.json`.

## Historical Provenance Note
Prior versions of the 6 seed entries (`ground-glass-stopper`, `clear-reagent-bottle`, `amber-reagent-bottle`,
`ball-joint`, `socket-joint`, `friedrich-condenser`) were adapted from OpenClipart (CC0), Wikimedia Commons
(Public Domain / CC BY-SA 3.0), and Bioicons. All 6 entries have now been completely redrawn from scratch as
clean original Chem Studio vector paths while preserving their exact IDs and port compatibility (and fixing
`friedrich-condenser` so coolant ports sit on opposite sides with lower inlet and upper outlet).

No external third-party path geometry remains in `assets/laboratory/*.svg`. Connection ports represent
graphical assembly anchors only and do not simulate fluid or chemical reactions.
