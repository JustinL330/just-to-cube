export const EXTRA_PUZZLES=['fto','baby_fto','master_tetraminx','kilominx','redi_cube'];
export const BIG_CUBES={'888':8,'999':9,'101010':10,'111111':11};
export const TRAINING={'333ru':['R','U'],'333rul':['R','U','L'],'333mu':['M','U']};
export function scrambleGroup(event){return TRAINING[event]?'trainingTypes':BIG_CUBES[event]||EXTRA_PUZZLES.includes(event)?'otherPuzzles':'wcaTypes'}
export const randomMoves=event=>!!(BIG_CUBES[event]||TRAINING[event]);
function rand(n){const a=new Uint32Array(1),limit=2**32-(2**32%n);do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%n}
export function practiceScramble(event){
  const size=BIG_CUBES[event],faces=TRAINING[event]||['R','L','U','D','F','B'];
  if(!size&&!TRAINING[event])throw Error('Unsupported practice puzzle');
  const length=size?size*20-40:25,moves=[];let lastFace='',lastAxis=-1;
  const axes={R:0,L:0,U:1,D:1,F:2,B:2};
  while(moves.length<length){const face=faces[rand(faces.length)];
    if(size?axes[face]===lastAxis:face===lastFace)continue;
    const width=size?1+rand(Math.floor(size/2)):1;
    const move=width===1?face:width===2?face+'w':width+face+'w';
    moves.push(move+['',"'",'2'][rand(3)]);lastFace=face;lastAxis=axes[face];
  }
  return moves.join(' ');
}
export async function generateScramble(event,library){return randomMoves(event)?practiceScramble(event):(await library.randomScrambleForEvent(event)).toString()}
export function previewPuzzle(event){
  if(BIG_CUBES[event])return null;
  if(TRAINING[event])return '3x3x3';
  return ({'222':'2x2x2','333':'3x3x3','444':'4x4x4','555':'5x5x5','666':'6x6x6','777':'7x7x7','333oh':'3x3x3','333bf':'3x3x3','333fm':'3x3x3','333mbf':'3x3x3','444bf':'4x4x4','555bf':'5x5x5','clock':'clock','minx':'megaminx','pyram':'pyraminx','skewb':'skewb','sq1':'square1',...Object.fromEntries(EXTRA_PUZZLES.map(id=>[id,id]))})[event];
}
