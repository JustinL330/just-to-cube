// Curated numeric Square-1 algorithms. Each record retains its exact source
// notation and attribution. alg adds only standard pair parentheses/spacing.
export const ALGORITHM_STAGES = Object.freeze(['CO','EO','CP','EP','Parity']);
export const SQ1_ALGORITHMS = Object.freeze(
[
  {
    "id": "sq1-co-1",
    "stage": "CO",
    "name": "2-2",
    "alg": "(1,0) / (-1,0)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1CO",
    "sourceAlg": "1,0 / -1,0"
  },
  {
    "id": "sq1-co-2",
    "stage": "CO",
    "name": "3-1",
    "alg": "(1,0) / (3,0) / (-1,0)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1CO",
    "sourceAlg": "1,0 / 3,0 / -1,0"
  },
  {
    "id": "sq1-co-3",
    "stage": "CO",
    "name": "Opp / Opp",
    "alg": "(1,0) / (3,3) / (-1,0)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1CO",
    "sourceAlg": "1,0 / 3,3 / -1,0"
  },
  {
    "id": "sq1-co-4",
    "stage": "CO",
    "name": "Adj / Opp",
    "alg": "(1,0) / (0,3) / (0,3) / (-1,0)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1CO",
    "sourceAlg": "1,0 / 0,3 / 0,3 / -1,0"
  },
  {
    "id": "sq1-co-5",
    "stage": "CO",
    "name": "Opp / Adj",
    "alg": "(1,0) / (-3,0) / (-3,0) / (-1,0)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1CO",
    "sourceAlg": "1,0 / -3,0 / -3,0 / -1,0"
  },
  {
    "id": "sq1-co-6",
    "stage": "CO",
    "name": "1-3",
    "alg": "(1,0) / (3,6) / (-1,0)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1CO",
    "sourceAlg": "1,0 / 3,6 / -1,0"
  },
  {
    "id": "sq1-co-7",
    "stage": "CO",
    "name": "0-4",
    "alg": "/ (6,6) / (-1,1)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1CO",
    "sourceAlg": "/ 6,6 / -1,1"
  },
  {
    "id": "sq1-eo-8",
    "stage": "EO",
    "name": "1 / 1",
    "alg": "(1,0) / (3,0) / (3,0) / (-1,-1) / (-2,1) / (-3,0) / (-1,0)",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-EO",
    "sourceAlg": "1,0 / 3,0 / 3,0 / -1,-1 / -2,1 / -3,0 / -1,0"
  },
  {
    "id": "sq1-eo-9",
    "stage": "EO",
    "name": "Opp / Opp",
    "alg": "(1,0) / (-1,-1) / (0,1)",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-EO",
    "sourceAlg": "1,0 / -1,-1 / 0,1"
  },
  {
    "id": "sq1-eo-10",
    "stage": "EO",
    "name": "4 / 4",
    "alg": "(1,0) / (-1,-1) / (-2,4) / (-1,-1) / (0,1)",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-EO",
    "sourceAlg": "1,0 / -1,-1 / -2,4 / -1,-1 / 0,1"
  },
  {
    "id": "sq1-eo-11",
    "stage": "EO",
    "name": "Adj / Adj",
    "alg": "(1,0) / (3,0) / (-1,-1) / (-3,0) / (0,1)",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-EO",
    "sourceAlg": "1,0 / 3,0 / -1,-1 / -3,0 / 0,1"
  },
  {
    "id": "sq1-eo-12",
    "stage": "EO",
    "name": "3 / 3",
    "alg": "(1,0) / (3,0) / (3,0) / (-1,-1) / (-3,0) / (-3,0) / (0,1)",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-EO",
    "sourceAlg": "1,0 / 3,0 / 3,0 / -1,-1 / -3,0 / -3,0 / 0,1"
  },
  {
    "id": "sq1-eo-13",
    "stage": "EO",
    "name": "Adj / Opp",
    "alg": "(1,0) / (0,-3) / (0,3) / (2,-1) / (-3,0) / (0,1)",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-EO",
    "sourceAlg": "1,0 / 0,-3 / 0,3 / 2,-1 / -3,0 / 0,1"
  },
  {
    "id": "sq1-eo-14",
    "stage": "EO",
    "name": "Opp / Adj",
    "alg": "(0,-1) / (3,0) / (-3,0) / (1,-2) / (0,3) / (-1,0)",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-EO",
    "sourceAlg": "0,-1 / 3,0 / -3,0 / 1,-2 / 0,3 / -1,0"
  },
  {
    "id": "sq1-cp-15",
    "stage": "CP",
    "name": "Adj / Adj",
    "alg": "/ (-3,0) / (3,3) / (0,-3) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ -3,0 / 3,3 / 0,-3 /"
  },
  {
    "id": "sq1-cp-16",
    "stage": "CP",
    "name": "Adj / Opp",
    "alg": "/ (0,-3) / (0,3) / (0,-3) / (0,3) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ 0,-3 / 0,3 / 0,-3 / 0,3 /"
  },
  {
    "id": "sq1-cp-17",
    "stage": "CP",
    "name": "Adj / Solved",
    "alg": "/ (3,-3) / (-3,0) / (0,3) / (0,-3) / (0,3) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ 3,-3 / -3,0 / 0,3 / 0,-3 / 0,3 /"
  },
  {
    "id": "sq1-cp-18",
    "stage": "CP",
    "name": "Opp / Opp",
    "alg": "/ (3,-3) / (-3,3) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ 3,-3 / -3,3 /"
  },
  {
    "id": "sq1-cp-19",
    "stage": "CP",
    "name": "Opp / Adj",
    "alg": "/ (-3,0) / (3,0) / (-3,0) / (3,0) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ -3,0 / 3,0 / -3,0 / 3,0 /"
  },
  {
    "id": "sq1-cp-20",
    "stage": "CP",
    "name": "Opp / Solved",
    "alg": "/ (-3,-3) / (-3,0) / (-3,-3) / (-3,0) / (-3,-3) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ -3,-3 / -3,0 / -3,-3 / -3,0 / -3,-3 /"
  },
  {
    "id": "sq1-cp-21",
    "stage": "CP",
    "name": "Solved / Adj",
    "alg": "/ (3,-3) / (0,3) / (-3,0) / (3,0) / (-3,0) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ 3,-3 / 0,3 / -3,0 / 3,0 / -3,0 /"
  },
  {
    "id": "sq1-cp-22",
    "stage": "CP",
    "name": "Solved / Opp",
    "alg": "/ (3,3) / (0,3) / (3,3) / (0,3) / (3,3) /",
    "sourceName": "CubingApp",
    "sourceUrl": "https://cubingapp.com/algorithms/SQ1-CP",
    "sourceAlg": "/ 3,3 / 0,3 / 3,3 / 0,3 / 3,3 /"
  },
  {
    "id": "sq1-ep-23",
    "stage": "EP",
    "name": "CwU on U",
    "alg": "/ (0,3) / (1,0) / (-3,0) / (-1,0) / (0,-3) / (1,0) / (3,0) / (-1,0)",
    "sourceName": "Sarah's Cubing Site",
    "sourceUrl": "https://sarah.cubing.net/square-1/ep",
    "sourceAlg": "/ (0,3) / (1,0) / (-3,0) / (-1,0) / (0,-3) / (1,0) / (3,0) / (-1,0)"
  },
  {
    "id": "sq1-ep-24",
    "stage": "EP",
    "name": "CcwU on U",
    "alg": "(1,0) / (-3,0) / (-1,0) / (0,3) / (1,0) / (3,0) / (-1,0) / (0,-3) /",
    "sourceName": "Sarah's Cubing Site",
    "sourceUrl": "https://sarah.cubing.net/square-1/ep",
    "sourceAlg": "(1,0) / (-3,0) / (-1,0) / (0,3) / (1,0) / (3,0) / (-1,0) / (0,-3) /"
  },
  {
    "id": "sq1-ep-25",
    "stage": "EP",
    "name": "H on U",
    "alg": "/ (3,-3) / (3,-3) / (0,1) / (-3,3) / (-3,3) / (-1,0)",
    "sourceName": "Sarah's Cubing Site",
    "sourceUrl": "https://sarah.cubing.net/square-1/ep",
    "sourceAlg": "/ (3,-3) / (3,-3) / (0,1) / (-3,3) / (-3,3) / (-1,0)"
  },
  {
    "id": "sq1-ep-26",
    "stage": "EP",
    "name": "Opp-Opp",
    "alg": "(1,0) / (-1,-1) / (6,0) / (1,1) / (5,0)",
    "sourceName": "Sarah's Cubing Site",
    "sourceUrl": "https://sarah.cubing.net/square-1/ep",
    "sourceAlg": "(1,0) / (-1,-1) / (6,0) / (1,1) / (5,0)"
  },
  {
    "id": "sq1-parity-27",
    "stage": "Parity",
    "name": "Adj Parity",
    "alg": "/ (-3,0) / (0,3) / (0,-3) / (0,3) / (2,0) / (0,2) / (-2,0) / (4,0) / (0,-2) / (0,2) / (-1,4) / (0,-3) / (0,3)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1Parity",
    "sourceAlg": "/ -3,0 / 0,3 / 0,-3 / 0,3 / 2,0 / 0,2 / -2,0 / 4,0 / 0,-2 / 0,2 / -1,4 / 0,-3 / 0,3"
  },
  {
    "id": "sq1-parity-28",
    "stage": "Parity",
    "name": "Opp Parity",
    "alg": "/ (3,3) / (-1,0) / (2,-4) / (4,-2) / (0,-2) / (-4,2) / (1,-5) / (3,0) / (3,3) / (3,0)",
    "sourceName": "SpeedCubeDB",
    "sourceUrl": "https://www.speedcubedb.com/a/SQ1/SQ1Parity",
    "sourceAlg": "/ 3,3 / -1,0 / 2,-4 / 4,-2 / 0,-2 / -4,2 / 1,-5 / 3,0 / 3,3 / 3,0"
  }
].map(record=>Object.freeze(record)));
