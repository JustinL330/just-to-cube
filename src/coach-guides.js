// Curated guides, intentionally separate from AI replies. No network or account data needed.
const languages=['en','zh_hk','zh_cn','ja','ko','fr','de'];
const guides={
 notation:[
 'Keep the same cube orientation. R turns the right face 90° clockwise when looking directly at that face; U turns the upper face the same way. A prime (′) means counterclockwise; 2 means 180°. R U R′ U′ means right, upper, right inverse, upper inverse. Move slowly and track one corner. Clockwise is always viewed from the face being turned.',
 '保持魔方方向不變。R：正對右面觀看，順時針轉 90°；U：正對頂面觀看，順時針轉 90°。′ 代表逆時針，2 代表 180°。R U R′ U′ 即右、上、右逆、上逆。先慢轉並觀察一個角塊。順逆時針均以正對正在轉動的面為準。',
 '保持魔方方向不变。R：正对右面观看，顺时针转 90°；U：正对顶面观看，顺时针转 90°。′ 代表逆时针，2 代表 180°。R U R′ U′ 即右、上、右逆、上逆。先慢转并观察一个角块。顺逆时针均以正对正在转动的面为准。',
 '向きを固定します。R は右面を正面から見て時計回りに90°、U は上面を正面から見て時計回りに90°回します。′ は反時計回り、2 は180°です。R U R′ U′ をゆっくり回し、1つのコーナーを追ってください。',
 '큐브 방향을 고정하세요. R은 오른쪽 면을 정면에서 봤을 때 시계 방향 90°, U는 윗면을 정면에서 봤을 때 시계 방향 90°입니다. ′는 반시계 방향, 2는 180°입니다. R U R′ U′를 천천히 돌리며 코너 하나를 추적하세요.',
 'Gardez la même orientation. R tourne la face droite de 90° dans le sens horaire vue de face ; U fait de même pour la face supérieure. Une prime (′) signifie antihoraire, 2 signifie 180°. Faites R U R′ U′ lentement en suivant un coin.',
 'Halte die Würfelausrichtung fest. R dreht die rechte Seite um 90° im Uhrzeigersinn, direkt auf diese Seite gesehen; U entsprechend die Oberseite. ′ bedeutet gegen den Uhrzeigersinn, 2 bedeutet 180°. Drehe R U R′ U′ langsam und verfolge eine Ecke.'
 ],
 f2l:[
 '15-minute F2L practice: 0–3 min: solve one corner–edge pair without a timer and explain where both pieces go. 3–8 min: repeat three familiar cases slowly, preserving solved slots. 8–12 min: solve all four pairs at a steady pace; look for the next pair before finishing the current one. 12–15 min: do three timed solves and record where you paused. Prioritize fewer pauses over faster turns.',
 '15 分鐘 F2L 練習：0–3 分鐘不計時配一組角稜，說出兩塊的位置及目標。3–8 分鐘慢練三種熟悉情況，保護已完成槽位。8–12 分鐘均速完成四組，在當前一組結束前尋找下一組。12–15 分鐘計時還原三次，記下停頓位置。先減少停頓，再提高轉速。',
 '15 分钟 F2L 练习：0–3 分钟不计时配一组角棱，说出两块的位置及目标。3–8 分钟慢练三种熟悉情况，保护已完成槽位。8–12 分钟匀速完成四组，在当前一组结束前寻找下一组。12–15 分钟计时还原三次，记下停顿位置。先减少停顿，再提高转速。',
 '15分のF2L練習：0–3分は計測せず1ペアを作ります。3–8分は慣れた3ケースをゆっくり反復。8–12分は一定速度で4ペアを解き、次のペアを探します。12–15分は3回計測し、止まった箇所を記録。回転速度より停止を減らしましょう。',
 '15분 F2L 연습: 0–3분은 타이머 없이 한 쌍을 맞추세요. 3–8분은 익숙한 세 가지 케이스를 천천히 반복하세요. 8–12분은 일정한 속도로 네 쌍을 풀며 다음 쌍을 찾으세요. 12–15분은 세 번 측정하고 멈춘 부분을 기록하세요. 회전 속도보다 멈춤을 줄이세요.',
 'F2L en 15 minutes : 0–3 min, formez une paire sans chronomètre. 3–8 min, répétez lentement trois cas connus. 8–12 min, résolvez les quatre paires à vitesse régulière en cherchant la suivante. 12–15 min, chronométrez trois résolutions et notez vos pauses. Réduisez les pauses avant d’accélérer.',
 '15 Minuten F2L: 0–3 Min. ein Paar ohne Timer lösen. 3–8 Min. drei bekannte Fälle langsam wiederholen. 8–12 Min. alle vier Paare gleichmäßig lösen und nach dem nächsten suchen. 12–15 Min. drei Lösungen messen und Pausen notieren. Erst Pausen verringern, dann schneller drehen.'
 ],
 clock:[
 'Clock 7-Simul combines simultaneous wheel turns to reduce separate actions. There are flip and no-flip variants, so use a tutorial matching your method and pin conventions. Practice one step at a time: name the pin state, predict which dials move, then turn slowly and check. Keep memo items 3 and 4 separate while learning. This guide cannot calculate a solution from a scramble.',
 'Clock 7-Simul 透過同時轉動表輪減少獨立操作。有翻面及不翻面版本，請配合所學版本及立柱定義使用教程。逐步練習：先說出立柱狀態，預測受影響表面，再慢轉檢查。學習時可將記憶第 3、4 項分開。此指南不能由打亂計算解法。',
 'Clock 7-Simul 通过同时转动表轮减少独立操作。有翻面及不翻面版本，请配合所学版本及立柱定义使用教程。逐步练习：先说出立柱状态，预测受影响表面，再慢转检查。学习时可将记忆第 3、4 项分开。此指南不能由打乱计算解法。',
 'Clock 7-Simulは同時回転で操作をまとめます。反転あり・なしの方式があるため、方式とピンの定義が一致する教材を使ってください。ピン状態を確認し、動く文字盤を予測してからゆっくり回します。このガイドはスクランブルから解答を計算しません。',
 'Clock 7-Simul은 동시 회전으로 동작을 줄입니다. 뒤집는 방식과 뒤집지 않는 방식이 있으므로 핀 정의가 일치하는 자료를 사용하세요. 핀 상태를 확인하고 움직일 시계판을 예측한 뒤 천천히 돌리세요. 이 가이드는 스크램블의 해답을 계산하지 않습니다.',
 'Clock 7-Simul regroupe des rotations simultanées. Il existe des variantes avec et sans retournement : suivez un tutoriel correspondant à votre méthode et aux conventions des boutons. Vérifiez les boutons, prédisez les cadrans affectés, puis tournez lentement. Ce guide ne calcule pas de solution à un mélange.',
 'Clock 7-Simul bündelt gleichzeitige Raddrehungen. Es gibt Varianten mit und ohne Wenden. Nutze eine Anleitung mit passenden Pin-Konventionen. Prüfe die Pins, sage die betroffenen Zifferblätter voraus und drehe langsam. Dieser Leitfaden berechnet keine Lösung für einen Scramble.'
 ],
 beginner:[
 'For a first 3×3 solve, learn in stages: cross → first-layer corners → middle-layer edges → last layer. Use a complete beginner tutorial with diagrams rather than guessing algorithms from text. Centers define the face colors. For a faster method later, CFOP uses cross, F2L, OLL and PLL. Learn intuitive F2L and two-look OLL/PLL before large algorithm sets.',
 '初學 3×3 可分階段：十字 → 第一層角塊 → 中層稜塊 → 頂層。請使用有圖示的完整初學教程，避免只憑文字猜公式。中心塊決定各面顏色。之後可學 CFOP：十字、F2L、OLL、PLL；先學直覺 F2L 及兩步 OLL／PLL，再擴充公式。',
 '初学 3×3 可分阶段：十字 → 第一层角块 → 中层棱块 → 顶层。请使用有图示的完整初学教程，避免只凭文字猜公式。中心块决定各面颜色。之后可学 CFOP：十字、F2L、OLL、PLL；先学直觉 F2L 及两步 OLL／PLL，再扩充公式。',
 '3×3はクロス→第1層のコーナー→中段エッジ→最終層の順で学べます。図入りの初心者向け教材を使いましょう。センターが各面の色を決めます。CFOPに進むなら、直感的F2Lと2-look OLL/PLLから始めてください。',
 '3×3은 크로스→첫 층 코너→중간 층 엣지→마지막 층 순서로 배우세요. 그림이 있는 초급 튜토리얼을 사용하세요. 센터가 각 면의 색을 결정합니다. CFOP으로 넘어갈 때는 직관적 F2L과 2-look OLL/PLL부터 배우세요.',
 'Pour débuter en 3×3 : croix → coins de la première couche → arêtes du milieu → dernière couche. Suivez un tutoriel illustré complet. Les centres définissent les couleurs des faces. Pour passer au CFOP, commencez par le F2L intuitif et les OLL/PLL en deux étapes.',
 'Für den ersten 3×3: Kreuz → Ecken der ersten Ebene → Kanten der mittleren Ebene → letzte Ebene. Nutze eine vollständige bebilderte Anleitung. Die Mittelsteine bestimmen die Seitenfarben. Lerne für CFOP zunächst intuitives F2L und 2-Look OLL/PLL.'
 ],
 practice:[
 'Try a focused session: 5 minutes on one weak stage without timing, 5 minutes of slow solves with steady turns, then five timed solves. Record one recurring pause and one change to test next time. Compare averages under similar conditions, not only your best single. For current records or competitions, use Explore and official WCA sources.',
 '試試專注練習：5 分鐘不計時練一個弱項，5 分鐘均速慢解，最後計時還原五次。記下一個經常停頓的位置及下次要測試的改變。在相近條件下比較平均，別只看單次最佳。最新紀錄及比賽請用 Explore 查閱 WCA 官方資料。',
 '试试专注练习：5 分钟不计时练一个弱项，5 分钟匀速慢解，最后计时还原五次。记下一个经常停顿的位置及下次要测试的改变。在相近条件下比较平均，别只看单次最佳。最新纪录及比赛请用 Explore 查阅 WCA 官方资料。',
 '5分は苦手な段階を計測せず練習、5分は一定速度のスローソルブ、最後に5回計測。よく止まる箇所と次回試す改善点を1つずつ記録しましょう。同条件の平均を比較してください。最新記録はExploreとWCA公式で確認。',
 '약한 단계 5분, 일정한 속도의 느린 풀이 5분, 마지막으로 다섯 번 측정하세요. 자주 멈추는 지점과 다음에 시도할 개선점 하나를 기록하세요. 비슷한 조건의 평균을 비교하세요. 최신 기록은 Explore와 WCA 공식 자료를 확인하세요.',
 'Travaillez un point faible sans chrono pendant 5 minutes, faites 5 minutes de résolutions lentes et régulières, puis cinq essais chronométrés. Notez une pause récurrente et une amélioration à tester. Comparez des moyennes dans des conditions similaires. Consultez Explore et la WCA pour les records actuels.',
 'Übe fünf Minuten eine Schwachstelle ohne Timer, fünf Minuten langsame Lösungen mit gleichmäßigem Tempo und danach fünf gemessene Lösungen. Notiere eine häufige Pause und eine Verbesserung. Vergleiche Durchschnitte unter ähnlichen Bedingungen. Aktuelle Rekorde findest du bei Explore und der WCA.'
 ]};
export function guideReply(question,language='en'){
 const q=String(question).toLowerCase();
 let topic=/clock|7.?simul/.test(q)?'clock':/f2l/.test(q)?'f2l':/notation|r\s+u|符[號号]|記号|표기|notación/.test(q)?'notation':/beginner|cfop|roux|初[學学]|初心|초[급보]|début|anfänger|oll|pll/.test(q)?'beginner':/practice|train|練習|练习|練習|연습|entraîn|üben|training/.test(q)?'practice':null;
 const i=Math.max(0,languages.indexOf(language));
 if(topic)return guides[topic][i];
 return [
 'This is a built-in guide, not generative AI. I can help with notation, a 15-minute F2L plan, Clock 7-Simul, beginner methods or practice habits. Choose a suggestion or include one of those topics. I cannot interpret a cube photo or answer arbitrary follow-up questions.',
 '目前是內建指南，並非生成式 AI。可查詢轉動符號、15 分鐘 F2L 計劃、Clock 7-Simul、初學解法或練習建議。請選擇建議問題，或在問題中包含以上主題。不能辨識魔方照片或回答任意追問。',
 '目前是内置指南，并非生成式 AI。可查询转动符号、15 分钟 F2L 计划、Clock 7-Simul、初学解法或练习建议。请选择建议问题，或在问题中包含以上主题。不能识别魔方照片或回答任意追问。',
 '生成AIではなく内蔵ガイドです。回転記号、F2L、Clock 7-Simul、初心者向け解法、練習に対応します。候補を選ぶか、テーマを入力してください。写真の認識や自由な追加質問には対応しません。',
 '생성형 AI가 아닌 내장 가이드입니다. 표기법, F2L, Clock 7-Simul, 초급 해법, 연습을 다룹니다. 제안된 질문을 선택하거나 주제를 입력하세요. 사진 인식이나 임의의 후속 질문은 지원하지 않습니다.',
 'Ceci est un guide intégré, pas une IA générative. Sujets : notation, F2L, Clock 7-Simul, méthodes débutantes et entraînement. Choisissez une suggestion ou indiquez un sujet. Les photos et les questions libres ne sont pas prises en charge.',
 'Dies ist ein integrierter Leitfaden, keine generative KI. Themen: Notation, F2L, Clock 7-Simul, Anfängermethoden und Training. Wähle einen Vorschlag oder nenne ein Thema. Fotos und beliebige Rückfragen werden nicht unterstützt.'
 ][i];
}
