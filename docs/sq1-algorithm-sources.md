# SQ-1 algorithm library sources

The initial collection contains 28 numerical algorithms, checked against these public primary sources on 2026-11-13:

| Stage | Cases | Source |
| --- | ---: | --- |
| CO | 7 | [SpeedCubeDB — SQ1CO](https://www.speedcubedb.com/a/SQ1/SQ1CO) |
| EO | 7 | [CubingApp — SQ1-EO](https://cubingapp.com/algorithms/SQ1-EO) |
| CP | 8 | [CubingApp — SQ1-CP](https://cubingapp.com/algorithms/SQ1-CP) |
| EP | 4 | [Sarah Strong — EP](https://sarah.cubing.net/square-1/ep) |
| Parity | 2 | [SpeedCubeDB — SQ1Parity](https://www.speedcubedb.com/a/SQ1/SQ1Parity) |

Each record retains its source case name, source URL and original numerical sequence. Presentation normalization only adds parentheses and normalizes spacing. No source website prose, diagrams, screenshots or layout are copied. CubeRoot was consulted as a directory, but is not listed as the source of algorithms that were not independently retrieved there.

The setup is the inverse algorithm executed from the solved state. It creates one reproducible reference case, rather than every possible arrangement in that stage. Orientation algorithms may permute other pieces, and an odd number of slices flips the middle layer. These effects are disclosed in the UI. No optimality or completeness claim is made for this curated library.

Initial colored reference diagrams use the pinned, locally served cubing.js SVG model. Intermediate shape diagrams are generated from the full physical piece state with the existing Square-1 drawing engine; a fixed cube-shape SVG is not used to depict non-square intermediate states.

Tests check every intermediate wedge permutation and middle-layer bit against cubing.js, legal moves, source case patterns, final restoration, stage semantics and the separate equator effect.
