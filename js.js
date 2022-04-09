document.querySelectorAll(`div[class*="piece w"]`).forEach(element =>{element.addEventListener('mousedown', moveFigure);}); //dodavanje dogadjaja za pomeranje svakoj figuri

passage = true;   //sprecanje bugova i pokretanja pomeranja nove figure dok se proslo jos nije zavrsilo 
elpeasant="";     //ako je odigran en passant zadnji potez -> zapamti ovde lokaciju
counter=0;        //brojac poteza od odigranog  en passant 
wcastleLeft=false;//da li je moguce uraditi rokadu
wcastleRight=false;    
history=[];       //pamcenje poteza, tj trenutnog izgleda table svaki potez
hcounter=-1;      //pocetna vrednost, koriste se kao indeks za history niz
hlength=-1;       //predstavlja max vrednost hcountera, posto mu se tokom kretanja menja vrednost
botArray=[];      //sluzi kao zbir mogucih poteza, koji se kasnije rangiraju
promotionActive=false; //sluzi da pauzira bota dok se ne odabere figura
playPause=false;  //za dvojaku funcionalnost dugmeta, pri pozivanju playHistory() funkcije

function moveFigure(e) {                      
  if(!passage)return; passage=false;   
  let figure=e.target;                                
  let startingPosition = figure.classList.item(2); //"square-81"
  figure.style.zIndex="6666";                                     
  //sprecavanje preklapanja prikaza div elementa (tj figure) koji se prevlaci sa ostalim stacioniranim elementima
  figure.classList.add("grabbable");                              
  //dodavanje klase za promenu ikonice kada se prevlaci figure
  moveFigureHint(e);
  move(e); 
  document.addEventListener('mousemove', move);
  figure.onmouseup = function () {      
      document.removeEventListener('mousemove', move);
      figure.classList.remove("grabbable");
      let row = Math.round(parseInt(figure.style.top)/100)+1;     
      //zaokruzivanje vrednosti: 573px -> 5
      let col = Math.round(parseInt(figure.style.left)/100)+1;                 
      let currentPosition = `square-${row}${col}`;
      if(positionCheckAndRemove(currentPosition)){ 
        figure.classList.remove(startingPosition);  
        figure.classList.add(currentPosition);
        if(typeOfFigure=="p" && (row==8 || row==1)){              
          //kada pijun dodje do 8/1 reda pozovi promotion() funkciju
          promotion(row,col);
          promotionActive=true;
        } 
        else if(typeOfFigure=="k"){ 
          //kontrola rokade 
          wcastleLeft=true;
          wcastleRight=true;
        }
        else if(typeOfFigure=="r"){
          let rcol = startingPosition.slice(-1);                 
          if(rcol==1){
            wcastleLeft=true;
          }else if(rcol==8){
            wcastleRight=true;
          }
        }
        moveHistory();
        kingUnderCheckSound();
        if(!promotionActive)bot();  
      }   
      moveFigureRemove("hint");      
      figure.style = null;                                   
      figure.onmouseup = null;                                  
      passage = true; 
  };
  function move(e) { //funkcija za pomeranje div elementa prilikom prevlacenja istog
    figure.style.left = e.pageX - figure.offsetWidth / 2 - ((document.body.offsetWidth-800)/2)+ 'px';
    figure.style.top = e.pageY - figure.offsetHeight / 2 - 50 + 'px';    
  }  
};
/** Funkcija koja proverava postojanje grafickog prikaza ("hint"), koji predstavlja dozvoljenu poziciju, i izvrsava brisanje suparnicke figure ("capture-hint") ako je potrebno */
function positionCheckAndRemove(currentPosition){ 
  if(startingPosition==currentPosition){return false;}  
  //ako se pozicija figure nije promenila vraca false
  if(elpeasant!="")counter++;
  if(counter>=1){elpeasant="";counter=0;}               
  //kontrola da en passant moze da se odigra samo u prvom sledecem potezu
  let checkCaptureHint = document.querySelector(`div[class*="capture-hint"][class*="${currentPosition}"]`); 
  let row = currentPosition.slice(-2,-1);
  let col = currentPosition.slice(-1);
  
  if(checkCaptureHint!=null && checkCaptureHint!=undefined){    
    if(checkCaptureHint.classList.item(0)=="elpeasantStage1"){ 
      //specificno brisanje kada je odigran en passant potez
      if(row==3){
        moveFigureRemove((parseInt(row)+1)+""+col);
      }else if(row==6){
        moveFigureRemove((parseInt(row)-1)+""+col);
      }
      document.querySelector("#audio-capture").play();
      return true;
    } 
    playSound("#audio-capture");
    moveFigureRemove(currentPosition);
    return true;
  }
  let checkHint = document.querySelector(`div[class*="hint"][class*="${currentPosition}"]`);    
  if(checkHint!=null && checkHint!=undefined){
    playSound("#audio-move");
    if(checkHint.classList.item(0)=="elpeasantStage0"){   
      //specifican uslov koji se aktivira kada je odigran en passant     
      elpeasant=row+""+col;                               
      //pamti se pozicija pijuna sa kojim je odigran en passant  
    }else if(checkHint.classList.item(0)=="castleLeft"){  
      //specificno brisanje/dodavanje topa kada je odigrana rokada
      moveFigureRemove(row+""+1);
      moveFigureAdd(row,4,"piece wr");
      playSound("#audio-castle");
    }else if(checkHint.classList.item(0)=="castleRight"){ 
      moveFigureRemove(row+""+8);
      moveFigureAdd(row,6,"piece wr");
      playSound("#audio-castle");
    }
    return true;
  }
  return false;                                                                                        
}
/** Funkcija preko koje se izvrsavaju sve provere pozicija i dodaje graficki prikaz mogucih/dozvoljenih poteza */
function moveFigureHint(element){ 
  let figure = element.target.classList.item(1);             
  colorAttacker = figure.slice(0,1); 
  //u ovom slucaju -> globalne promenljive koriscene radi lakseg rada i sprecavanje stalnog slanja istih kao argumente pod-funkcijama
  colorDefender = "b";
  typeOfFigure = figure.slice(1,2);
  startingPosition = element.target.classList.item(2);
  let row = parseInt(startingPosition.slice(-2,-1));
  let col = parseInt(startingPosition.slice(-1));

  let kingPosition =  document.querySelector(`div[class*="piece wk"]`).classList.item(2);
  kingRow = kingPosition.slice(-2,-1);
  kingCol = kingPosition.slice(-1);

  if(typeOfFigure=="p"){     
    let rowUp = row-1, rowUpTwo = row-2, rowElpeasant=7
    let up = document.querySelector(`.square-${rowUp}${col}`);
    let upTwo = document.querySelector(`.square-${rowUpTwo}${col}`);
    let upLeft = document.querySelector(`div[class*="piece"][class*="square-${rowUp}${col-1}"]`);
    let upRight = document.querySelector(`div[class*="piece"][class*="square-${rowUp}${col+1}"]`);
    if(up==null || up==undefined){checkPosition(rowUp,col);} 
    //provera da je pozicija prazna
    if((up==null || up==undefined) && (upTwo==null || upTwo==undefined) && row==rowElpeasant){checkPositionElpeasant(rowUpTwo,col,0);}
    if(upLeft!=null && upLeft!=undefined){checkPosition(rowUp,col-1);} 
    //provera da se na poziciji nalazi figura
    if(upRight!=null && upRight!=undefined){checkPosition(rowUp,col+1);}
    if(elpeasant!=""){ 
      //ako je odigran en passant, proveri jos da li je bio odigran pored "mene"
      let rowEP = elpeasant.slice(0,1);
      let colEP = elpeasant.slice(-1);
      if(Math.abs(colEP-col)==1 && rowEP==row)checkPositionElpeasant(rowEP,colEP);
    }
    return;
  }
  if(typeOfFigure=="n"){
    checkPosition(row-2, col-1);  //upLeft
    checkPosition(row-2, col+1);  //upRight
    checkPosition(row+1, col-2);  //leftUp
    checkPosition(row-1, col-2);  //leftDown
    checkPosition(row+1, col+2);  //rightUp
    checkPosition(row-1, col+2);  //rightDown
    checkPosition(row+2, col-1);  //downLeft
    checkPosition(row+2, col+1);  //downRight
    return;
  }
  if(typeOfFigure=="b" || typeOfFigure=="q"){
    for(let i=row-1, j=col-1; (i>=1)&&(j>=1); i--,j--){if(!checkPosition(i,j))break;} //upLeft
    for(let i=row-1, j=col+1; (i>=1)&&(j<=8); i--,j++){if(!checkPosition(i,j))break;} //upRight
    for(let i=row+1, j=col-1; (i<=8)&&(j>=1); i++,j--){if(!checkPosition(i,j))break;} //downLeft
    for(let i=row+1, j=col+1; (i<=8)&&(j<=8); i++,j++){if(!checkPosition(i,j))break;} //downRight
  }
  if(typeOfFigure=="r" || typeOfFigure=="q"){
    for(let i=row-1;i>=0; i--){if(!checkPosition(i,col))break;} //up
    for(let i=col-1;i>=0; i--){if(!checkPosition(row,i))break;} //right
    for(let i=row+1;i<=8; i++){if(!checkPosition(i,col))break;} //down
    for(let i=col+1;i<=8; i++){if(!checkPosition(row,i))break;} //left
    return;
  }
  if(typeOfFigure=="k"){
    checkPosition(row-1, col);      //up
    checkPosition(row-1, col-1);    //upLeft
    checkPosition(row-1, col+1);    //upRight
    checkPosition(row+1, col);      //down
    checkPosition(row+1, col-1);    //downLeft
    checkPosition(row+1, col+1);    //downRight
    checkPosition(row, col-1);      //left
    checkPosition(row, col+1);      //right
    checkPositionCastle();
    return;
  }
}
/** Funkcija koja dodaje elemenata (figure, "hint" blokove i sl) */
function moveFigureAdd(row,col,type){  
  if(row>=1 && row<=8 && col>=1 && col<=8) {                         
    let board = document.querySelector("#pieces");                 
    let hint = document.createElement('div');                     
    const attr = document.createAttribute('class');
    attr.value = `${type} square-${row}${col}`;
    hint.setAttributeNode(attr);
    if(type.slice(-2,-1)=="w")hint.addEventListener('mousedown', moveFigure); 
    board.appendChild(hint);
  }
}
/** Funkcija koja brise sve elemente koji se poklapaju sa uslovima dostavljenog parametra */
function moveFigureRemove(type){
  document.querySelectorAll(`div[class*="${type}"]`).forEach(element => {element.parentElement.removeChild(element);}); 
}
/** Funkcija koja proverava mogucnosti kretanja figure na datu poziciju */
function checkPosition(row, col){
  let figureAlly = document.querySelector(`div[class*="piece w"][class*="square-${row}${col}"]`);
  if(figureAlly!=null && figureAlly!=undefined){return false;} 
  //ako se na kordinatama vec nalazi "prijateljska" figura vrati false (false ima znacaj i kao break u petljama)
  let figureCapture = document.querySelector(`div[class*="piece b"][class*="square-${row}${col}"]`); 
  //ako se na kordinatama vec nalazi "neprijateljska" figura
  if(typeOfFigure!="k"){                        
    if((figureCapture!=null && figureCapture!=undefined)){
      let type = figureCapture.classList.item(1);  
      moveFigureRemove(row+""+col);  
      moveFigureAdd(row,col,"piece bait-hint");
      if(kingUnderCheck(kingRow,kingCol)){      
        moveFigureAdd(row,col,"piece "+type);    
        moveFigureRemove("piece bait-hint"); 
        return false;
      }
      moveFigureAdd(row,col,"piece "+type);     
      moveFigureAdd(row,col,"capture-hint");    
      return false;
    }else{                                      
      //ako na poziciji nije figura
      moveFigureAdd(row,col,"piece bait-hint"); 
      if(kingUnderCheck(kingRow,kingCol)){      
        moveFigureRemove("piece bait-hint");   
        return true;
      }
      moveFigureRemove("piece bait-hint");   
      moveFigureAdd(row,col,"hint"); 
      return true;
    }
  }else{                                        
    //ako je figura kralj
    if(kingUnderCheck(row,col))return false;     
    if(figureCapture!=null && figureCapture!=undefined){
      moveFigureAdd(row,col,"capture-hint");   
      return false;
    }
    moveFigureAdd(row,col,"hint"); 
    return true;
  }
}
/** Funkcija specificno napravljena za odigravanje en passant poteza zbog svoje specificnosti */
function checkPositionElpeasant(row,col,value){
  if(value=="0"){                                                
    //predstavlja poziv klasicne provere da li ce kralj biti pod sahom nakon odigranog poteza
    moveFigureAdd(row,col,"piece bait-hint");                    
    //i ako nije dodaje se regularan "hint" sa dodatnom elpeasantStage0 klasom
    if(kingUnderCheck(kingRow,kingCol)){moveFigureRemove("piece bait-hint"); return true;}
    // koja ce se kasnije iskoristiti za proveru unutar positionCheckAndRemove() funkcije
    moveFigureRemove("piece bait-hint");                         
    //gde ukoliko se odigra potez pijuna za dva mesta unapred bice zapamcene te kordinate u 
    moveFigureAdd(row,col,"elpeasantStage0 hint"); return true;  
    //slucaju da budu potrebne za kasnije odigravanje en passant poteza 
  }else{
    value=-1;
    let figureCapture = document.querySelector(`div[class*="piece b"][class*="square-${row}${col}"]`);
    let type = figureCapture.classList.item(1); 
    moveFigureRemove(row+""+col);
    moveFigureAdd(parseInt(row)+value,col,"piece bait-hint");
    if(kingUnderCheck(kingRow,kingCol)){              
      moveFigureAdd(row,col,"piece "+type); 
      moveFigureRemove("piece bait-hint");            
      return true;
    }else{
      moveFigureAdd(row,col,"piece "+type); 
      moveFigureRemove("piece bait-hint");
    }
    moveFigureAdd((parseInt(row)+parseInt(value)),col,"elpeasantStage1 capture-hint");
    //dodaje se i elpeasantStage1 klasa koja ce se kasnije iskoristiti za proveru unutar positionCheckAndRemove() funkcije
    //gde se usled odigranog en passant poteza odredjuje pozicija figure koju treba obrisati
    return true;  
  }
}
/** Funkcija specificno napravljena za odigravanje rokade zbog svoje specificnosti */
function checkPositionCastle(){  
  if(wcastleLeft==false || wcastleRight==false){ 
    //provera da li je rokada moguca test1
    if(wcastleLeft==false){
      let ln = document.querySelector(`div[class*="piece"][class*="square-82"]`);
      let lb = document.querySelector(`div[class*="piece"][class*="square-83"]`);    
      let q = document.querySelector(`div[class*="piece"][class*="square-84"]`);
      if((ln==null || ln==undefined) && (lb==null || lb==undefined) && (q==null || q==undefined)){ 
        //provera da li je leva rokada moguca test2
        if(!(kingUnderCheck(kingRow,kingCol) || kingUnderCheck(8,3) || kingUnderCheck(8,4))) moveFigureAdd(8,3,"castleLeft hint");  
      }
    }
    if(wcastleRight==false){ 
      //provera da li je desna rokada moguca test3
      let rb = document.querySelector(`div[class*="piece"][class*="square-86"]`);
      let rn = document.querySelector(`div[class*="piece"][class*="square-87"]`);
      if((rn==null || rn==undefined) && (rb==null || rb==undefined)){
        if(!(kingUnderCheck(kingRow,kingCol) || kingUnderCheck(8,6) || kingUnderCheck(8,7))) moveFigureAdd(8,7,"castleRight hint");
      }
    } 
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Funkcija koja uzima kordinate kralja i proverava da li je pod sahom */
function kingUnderCheck(kingRow, kingCol){
  let allFigures = document.querySelectorAll(`div[class*="piece ${colorDefender}"]`); 
  //skeniranje svih dostupnih suparnickih figura 
  for (var x=0, max=allFigures.length; x < max; x++){                                 
    //za svaku figuru proveri da li izaziva sah
    let element = allFigures[x];
    let typeOfFigure = element.classList.item(1).slice(1,2);
    let startingPosition =element.classList.item(2);
    let row = parseInt(startingPosition.slice(-2,-1));    
    let col = parseInt(startingPosition.slice(-1));  
    if(typeOfFigure=="p"){    
        if(colorAttacker=="b"){
            if(kingRow==(row-1) && kingCol==(col-1))return true; 
            if(kingRow==(row-1) && kingCol==(col+1))return true;
        }else{ 
            if(kingRow==(row+1) && kingCol==(col-1))return true;
            if(kingRow==(row+1) && kingCol==(col+1))return true;  
        }
        continue;
    }    
    if(typeOfFigure=="n"){
        if((kingRow==row-2 && kingCol==col-1) || //upLeft
        (kingRow==row-2 && kingCol==col+1) ||    //upRight
        (kingRow==row+1 && kingCol==col-2) ||    //leftUp
        (kingRow==row-1 && kingCol==col-2) ||    //leftDown
        (kingRow==row+1 && kingCol==col+2) ||    //rightUp
        (kingRow==row-1 && kingCol==col+2) ||    //rightDown
        (kingRow==row+2 && kingCol==col-1) ||    //downLeft
        (kingRow==row+2 && kingCol==col+1))      //downRight
        return true;
        continue;
    }    
    if(typeOfFigure=="b" || typeOfFigure=="q"){
      let i,j,rez;
      for(i=row-1, j=col-1; (i>=kingRow)&&(j>=kingCol); i--,j--){rez=kingUnderCheckFinal(i,j,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}  //upLeft
      for(i=row-1, j=col+1; (i>=kingRow)&&(j<=kingCol); i--,j++){rez=kingUnderCheckFinal(i,j,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}  //upRight
      for(i=row+1, j=col-1; (i<=kingRow)&&(j>=kingCol); i++,j--){rez=kingUnderCheckFinal(i,j,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}  //downLeft
      for(i=row+1, j=col+1; (i<=kingRow)&&(j<=kingCol); i++,j++){rez=kingUnderCheckFinal(i,j,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}  //downRight
    }
    if(typeOfFigure=="r" || typeOfFigure=="q"){
      let i, rez;
      for(i=row+1;i<=kingRow;i++){rez=kingUnderCheckFinal(i,col,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}     //down
      for(i=row-1;i>=kingRow;i--){rez=kingUnderCheckFinal(i,col,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}     //up
      for(i=col-1;i>=kingCol;i--){rez=kingUnderCheckFinal(row,i,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}     //right
      for(i=col+1;i<=kingCol;i++){rez=kingUnderCheckFinal(row,i,kingRow,kingCol);if(rez==1){return true;}else if(rez==2){break;}}     //left
      continue;
    }
    if(typeOfFigure=="k"){
      if((kingRow==row-1 && kingCol==col) ||  //up
      (kingRow==row-1 && kingCol==col-1) ||   //upLeft
      (kingRow==row-1 && kingCol==col+1) ||   //upRight
      (kingRow==row+1 && kingCol==col-1) ||   //down
      (kingRow==row+1 && kingCol==col-1) ||   //downLeft
      (kingRow==row+1 && kingCol==col+1) ||   //downRight
      (kingRow==row && kingCol==col-1) ||     //left
      (kingRow==row && kingCol==col+1))       //right
      return true;
      continue;
    }       
  }
  return false;
}  
/** Funkcija koja izvrsava dodatne provere pozicije u sklopu kingUnderCheck() funkcije */
function kingUnderCheckFinal(row,col,kingRow,kingCol){   
  if(row==kingRow && col==kingCol){return 1};                    
  //ako su kordinate ekvivalent poziciji kralja vraca 1, odnosno kralj je pod sahom
  let figure = document.querySelector(`div[class*="piece"][class*="square-${row}${col}"]`); 
  if(figure!=null && figure!=undefined){ 
    if(figure.classList.item(2)==startingPosition)return 0; 
    //ako se na datim kordinatama nalazi figura sa pocetnom pozicijom tj figura koja se trenutno pomera vrati 0 tj obican continue                 
    if(figure.classList.item(1)!=colorAttacker+"k")return 2;  
     //ako se na datim kordinatama nalazi figura koja nije "nas" kralj vrati 2 tj break, posto ta figura blokira sah 
  }
  return 0;                                                      
  //inace vrati 0 za continue
}
function kingUnderCheckSound(){
  let enemyKingPosition =  document.querySelector(`div[class*="piece ${colorDefender}k"]`).classList.item(2); 
  enemyKingRow = enemyKingPosition.slice(-2,-1); 
  enemyKingCol = enemyKingPosition.slice(-1);
  temp=colorAttacker;
  colorAttacker=colorDefender;
  colorDefender=temp;
  if(kingUnderCheck(enemyKingRow,enemyKingCol)){
    playSound("#audio-check");  
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Funkcija za dodavanje grafickog prikaza za promociju pijuna */
function promotion(row,col){
  let arraySquare=[row+""+col,parseInt(row)+1+""+col,parseInt(row)+2+""+col,parseInt(row)+3+""+col]
  let board = document.querySelector("#board");                  
  let hint = document.createElement("div");                     
  const attr = document.createAttribute("class");
  attr.value = "promote-block";
  hint.innerHTML=`
    <div class="promotion wq square-${arraySquare[0]}" onmousedown="promotionChoice(this)"></div>
    <div class="promotion wr square-${arraySquare[1]}" onmousedown="promotionChoice(this)"></div>
    <div class="promotion wb square-${arraySquare[2]}" onmousedown="promotionChoice(this)"></div>
    <div class="promotion wn square-${arraySquare[3]}" onmousedown="promotionChoice(this)"></div>`;
  hint.setAttributeNode(attr);
  board.appendChild(hint);
  board.classList.add("blur");
}
/** Funkcija koja vrsi zamenu klase pijuna u klasu figure po izboru */
function promotionChoice(element){  
  let col = element.classList.item(2).slice(-1);
  document.querySelector(`div[class*="piece"][class*="square-1${col}"]`).className = `piece ${element.classList.item(1)} square-1${col}`;
  moveFigureRemove("promote-block");
  document.querySelector("#board").classList.remove("blur");
  document.querySelector("#audio-promote").play();
  colorDefender = "b";
  if(kingUnderCheck(enemyKingRow,enemyKingCol)){
    playSound("#audio-check");
  }
  --hcounter; moveHistory(); 
  //redefinisanje poslednjeg unosa da se ne bi prikazivao pijun na poslednjem ranku
  setTimeout(bot,500)
  promotionActive=false;
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Funkcija koja resetuje pocetne vrednosti globalnih promenljivih i izgled same table */
function startNewGame(){
  moveFigureRemove("endMessage"); 
  //brisanje poruke koja se pojavljuje na kraju meca
  document.querySelector("#pieces").innerHTML=`
  <div class="piece wr square-81"></div><div class="piece br square-11"></div>
  <div class="piece wn square-82"></div><div class="piece bn square-12"></div>
  <div class="piece wb square-83"></div><div class="piece bb square-13"></div>
  <div class="piece wq square-84"></div><div class="piece bq square-14"></div>
  <div class="piece wk square-85"></div><div class="piece bk square-15"></div>
  <div class="piece wb square-86"></div><div class="piece bb square-16"></div>
  <div class="piece wn square-87"></div><div class="piece bn square-17"></div>
  <div class="piece wr square-88"></div><div class="piece br square-18"></div>
  <div class="piece wp square-71"></div><div class="piece bp square-21"></div>
  <div class="piece wp square-72"></div><div class="piece bp square-22"></div>
  <div class="piece wp square-73"></div><div class="piece bp square-23"></div>
  <div class="piece wp square-74"></div><div class="piece bp square-24"></div>
  <div class="piece wp square-75"></div><div class="piece bp square-25"></div>
  <div class="piece wp square-76"></div><div class="piece bp square-26"></div>
  <div class="piece wp square-77"></div><div class="piece bp square-27"></div>
  <div class="piece wp square-78"></div><div class="piece bp square-28"></div>
  `;  
  document.querySelectorAll(`div[class*="piece w"]`).forEach(element =>{element.addEventListener('mousedown', moveFigure);}); 

  passage = true;    
  wcastleLeft=false;   
  wcastleRight=false;    
  history=[];       
  hcounter=-1;      
  promotionActive=false;

  playSound("#audio-new-game");
}
/** Funkcija koja pamti listu klasa svih elemenata na tabli u vidu istorije poteza */
function moveHistory(){  
  let currentBoard=[];
  document.querySelectorAll(`div[class*="piece"]`).forEach(element=>{
    currentBoard.push(element.className);
  })
  history[++hcounter]=currentBoard;
  hlength=hcounter;
}
moveHistory();
function prevHistory(arg){
  if(hcounter!=undefined && hcounter!=null && hcounter>0){
    let board = document.querySelector("#pieces");
    board.innerHTML="";  
    if(arg==true){hcounter=0;}else{hcounter--;}      
    for(let i=0, max=history[hcounter].length;i<max;i++){
      board.innerHTML+=`<div class="${history[hcounter][i]}"></div>`;
    }
    document.querySelector("#history-info").innerHTML="Кретање кроз историју потеза је активно!";
  }
}
function nextHistory(arg){
  if(hcounter!=undefined && hcounter!=null && hcounter<hlength){
    let board = document.querySelector("#pieces");
    board.innerHTML="";     
    if(arg==true){hcounter=hlength;}else{hcounter++;} 
    for(let i=0, max=history[hcounter].length;i<max;i++){
      board.innerHTML+=`<div class="${history[hcounter][i]}"></div>`;
    }
    if(hcounter==hlength){
      if(playPause)playHistory(document.querySelector("#playHistory"));
      document.querySelectorAll(".piece").forEach(element =>{element.addEventListener('mousedown', moveFigure);});  
      document.querySelector("#history-info").innerHTML="";     
    }
    playSound("#audio-move");
  }
}
function playHistory(arg){  
  if(playPause){
    arg.innerHTML="PLAY";
    clearInterval(play);
    playPause=false;
  }else{
    if(hcounter==hlength){return;}
    arg.innerHTML="PAUSE";
    play = setInterval(nextHistory, 1000);
    playPause=true;
  }  
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Funkcija za automatsko odigravanje poteza na suparnickoj strani */
function bot(){
  let allFigures = document.querySelectorAll(`div[class*="piece b"]`); //+56: rangiranje poteza po vrednosti  
  for (var x=0, max=allFigures.length; x < max; x++){
    let element = allFigures[x];
    typeOfFigure = element.classList.item(1).slice(1,2);               //resetovanje globalnih promenljivi za rad sa crnim figurama
    startingPosition = element.classList.item(2);
    let row = parseInt(startingPosition.slice(-2,-1));    
    let col = parseInt(startingPosition.slice(-1)); 

    let kingPosition =  document.querySelector(`div[class*="piece bk"]`).classList.item(2); 
    kingRow = kingPosition.slice(-2,-1); 
    kingCol = kingPosition.slice(-1);
    colorDefender = "w";
    colorAttacker = "b";

    if(elpeasant!="")counter++;
    if(counter>=1){elpeasant="";counter=0;}
    
    if(typeOfFigure=="p"){    
      let up = document.querySelector(`.square-${row+1}${col}`); 
      let upTwo = document.querySelector(`.square-${row+2}${col}`);
      let upLeft = document.querySelector(`div[class*="piece"][class*="square-${row+1}${col-1}"]`);
      let upRight = document.querySelector(`div[class*="piece"][class*="square-${row+1}${col+1}"]`);
      if(up==null || up==undefined){botFinal(10,row,col,row+1,col);}      
      if((up==null || up==undefined) && (upTwo==null || upTwo==undefined) && row==2){botFinal(10,row,col,row+2,col);}
      if(upLeft!=null && upLeft!=undefined){botFinal(10,row,col,row+1,col-1);}
      if(upRight!=null && upRight!=undefined){botFinal(10,row,col,row+1,col+1);}   
      continue;
    }    
    if(typeOfFigure=="n"){
      botFinal(30,row,col,row-2,col-1);
      botFinal(30,row,col,row-2,col+1);
      botFinal(30,row,col,row+1,col-2);
      botFinal(30,row,col,row-1,col-2);
      botFinal(30,row,col,row+1,col+2);
      botFinal(30,row,col,row-1,col+2);
      botFinal(30,row,col,row+2,col-1);
      botFinal(30,row,col,row+2,col+1);
      continue;
    }    
    if(typeOfFigure=="b" || typeOfFigure=="q"){
      let i,j; 
      let val=30; if(typeOfFigure=="q")val=90;
      for(i=row-1, j=col-1; (i>=1)&&(j>=1); i--,j--){if(!botFinal(val,row,col,i,j))break;}  
      for(i=row-1, j=col+1; (i>=1)&&(j<=8); i--,j++){if(!botFinal(val,row,col,i,j))break;}  
      for(i=row+1, j=col-1; (i<=8)&&(j>=1); i++,j--){if(!botFinal(val,row,col,i,j))break;}  
      for(i=row+1, j=col+1; (i<=8)&&(j<=8); i++,j++){if(!botFinal(val,row,col,i,j))break;} 
    }
    if(typeOfFigure=="r" || typeOfFigure=="q"){
      let i;
      let val=50; if(typeOfFigure=="q")val=90;
      for(i=row+1;i<=8;i++){if(!botFinal(val,row,col,i,col))break;}     
      for(i=row-1;i>=1;i--){if(!botFinal(val,row,col,i,col))break;}     
      for(i=col-1;i>=1;i--){if(!botFinal(val,row,col,row,i))break;}     
      for(i=col+1;i<=8;i++){if(!botFinal(val,row,col,row,i))break;}  
      continue;   
    }
    if(typeOfFigure=="k"){
      botFinal(0,row,col,row,col-1);
      botFinal(0,row,col,row,col+1);
      botFinal(0,row,col,row+1,col-1);
      botFinal(0,row,col,row+1,col+1);
      botFinal(0,row,col,row+1,col);
      botFinal(0,row,col,row-1,col);
      botFinal(0,row,col,row-1,col-1);
      botFinal(0,row,col,row-1,col+1);
      continue;
    }       
  }
  for(let i=0, max=botArray.length; i<max; i++){                       
    //sortiranje niza po vrednosti poteza
    for(let j=i+1; j<max; j++){if(botArray[i][0]<botArray[j][0]){let temp =botArray[i];botArray[i]=botArray[j];botArray[j]=temp;}}
  }
  try{                                                                 
    //error proizlazi samo kada je niz prazan, sto znaci da nema dostupnih poteza tj kraj partije                                                                            
    let typeAlley = document.querySelector(`div[class*="piece"][class*="square-${botArray[0][1]}${botArray[0][2]}"]`).classList.item(1); 
    let typeCapture =  document.querySelector(`div[class*="piece"][class*="square-${botArray[0][3]}${botArray[0][4]}"]`); 
    moveFigureRemove(botArray[0][1]+""+botArray[0][2]);             
    //najvredniji potez ce uvek biti na indeksu 0
    if(typeCapture!=null && typeCapture!=undefined){
      if(botArray[0][3]==8 && botArray[0][4]==1)wcastleLeft=true;
      if(botArray[0][3]==8 && botArray[0][4]==8)wcastleRight=true;
      moveFigureRemove(botArray[0][3]+""+botArray[0][4]);   
      playSound("#audio-capture");
    }else{
      playSound("#audio-move");
    }
    if(typeAlley=="bp"){
      if(botArray[0][3]==8){typeAlley="bq";playSound("#audio-promote");}
      if(botArray[0][3]==botArray[0][1]+2){elpeasant=botArray[0][3]+""+botArray[0][4];}
    }
    moveFigureAdd(botArray[0][3],botArray[0][4],`piece ${typeAlley}`);
    console.log(botArray);
    botArray=[];  
  }catch(ex){
    if(kingUnderCheck(kingRow,kingCol)){
      endMessage("БРАВО ПУТНИЧЕ НА ОСТВАРЕНОЈ ПОБЕДИ, ЖЕЛИМО ТИ ПУНО УСПЕХА У БУДУЋИМ ПУСТОЛОВИНАМА!!!");
    }else{
      endMessage("ПАРТИЈА ЈЕ ЗАВРШЕНА. РЕЗУЛТАТ: НЕРЕШЕНО!!!");
    }
  }  
  moveHistory(); 
  kingUnderCheckSound();
}
/** Funkcija koja izvrsava dodatne provere pozicije u sklopu bot() funkcije */
function botFinal(val,row,col,toRow,toCol){
  if(toRow<1 || toRow>8 || toCol<1 || toCol>8)return false; 
  let valueDiff=0;                                                  
  //defaultna vrednost po kojoj se rangira kasnije potez koji ce se odabrati
  let figureAlly = document.querySelector(`div[class*="piece b"][class*="square-${toRow}${toCol}"]`);  
  if(figureAlly!=null && figureAlly!=undefined){ 
    if(figureAlly.classList.item(2)==startingPosition)return true;  
    //ako je prijateljska figura ujedno ona koju pomeramo vrati true (predstavlja continue u petljama)
    return false;                                                   
    //inace vrati false tj break posto smo "uradili u zid" koji blokira dalje kretanje figure
  }
  let figureCapture = document.querySelector(`div[class*="piece w"][class*="square-${toRow}${toCol}"]`);
  if(typeOfFigure!="k"){ 
    if((figureCapture!=null && figureCapture!=undefined)){
      let type = figureCapture.classList.item(1); //"wq"
      moveFigureRemove(toRow+""+toCol); 
      moveFigureAdd(toRow,toCol,"piece bait-hint"); 
      if(kingUnderCheck(kingRow,kingCol)){        
        moveFigureAdd(toRow,toCol,"piece "+type); 
        moveFigureRemove("piece bait-hint");     
        return false;                             
      }
      moveFigureAdd(toRow,toCol,"piece "+type); 
      moveFigureRemove("piece bait-hint");      
      if(type=="wp"){valueDiff=10}else if(type=="wb" || type=="wn"){valueDiff=30}else if(type=="wr"){valueDiff=50}else if(type=="wq"){valueDiff=90}              
      if(kingUnderCheck(toRow,toCol)){valueDiff-=val+1;}else{valueDiff*=2;}
      if(kingUnderCheck(row,col)){if(!kingUnderCheck(toRow,toCol))valueDiff=val;} 
      botArray.push([valueDiff,row,col,toRow,toCol])      
      return false;                                               
      //izadji iz funkcije/petlje, posto je ta figura opet bila "zid"
    }else{                                                        
      //ako na poziciji nije figura
      moveFigureAdd(toRow,toCol,"piece bait-hint");  
      if(kingUnderCheck(kingRow,kingCol)){moveFigureRemove("piece bait-hint");return true;}
      moveFigureRemove("piece bait-hint");            
      if(kingUnderCheck(toRow,toCol)){valueDiff=-1;}
      if(kingUnderCheck(row,col)){if(!kingUnderCheck(toRow,toCol))valueDiff=val;} 
      botArray.push([valueDiff,row,col,toRow,toCol]) 
      return true;                                   
    }
  }else{                                                          
    //ako je figura koju zelimo da pomerimo kralj 
    if(kingUnderCheck(toRow,toCol))return false;      
    if((figureCapture!=null && figureCapture!=undefined)){
      let type = figureCapture.classList.item(1); //"wq"
      if(type=="wp"){valueDiff=10;}else if(type=="wb" || type=="wn"){valueDiff=30;}else if(type=="wr"){valueDiff=50;}else if(type=="wq"){valueDiff=90;}
    }
    botArray.push([valueDiff,row,col,toRow,toCol]);  
  }
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Funkcija koja prikazuje poruku na kraju partije zajedno sa dugmetom za startovanje nove */
function endMessage(message){ 
  board.innerHTML+=`<div class="endMessage"><div>${message}<br><br><button class="hbuttons" onclick='startNewGame()'>Почни нову партију!</button></div></div>`;
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function playSound(arg){
  document.querySelector(arg).play();
}
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

