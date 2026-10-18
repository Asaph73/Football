const POSITIONS = ["GK","LB","CB","RB","DM","CM","AM","LM","RM","LW","RW","ST"];

const FORMATIONS = {
  "4-3-3":[
    ["GK",50,92],["LB",14,72],["CB",38,74],["CB",62,74],["RB",86,72],
    ["CM",30,54],["CM",50,51],["CM",70,54],["LW",18,29],["ST",50,22],["RW",82,29]
  ],
  "4-2-3-1":[
    ["GK",50,92],["LB",14,72],["CB",38,74],["CB",62,74],["RB",86,72],
    ["DM",38,57],["DM",62,57],["LW",18,38],["AM",50,34],["RW",82,38],["ST",50,19]
  ],
  "4-4-2":[
    ["GK",50,92],["LB",14,72],["CB",38,74],["CB",62,74],["RB",86,72],
    ["LM",14,51],["CM",38,53],["CM",62,53],["RM",86,51],["ST",41,25],["ST",59,25]
  ],
  "4-1-4-1":[
    ["GK",50,92],["LB",14,72],["CB",38,74],["CB",62,74],["RB",86,72],
    ["DM",50,61],["LM",14,42],["CM",38,45],["CM",62,45],["RM",86,42],["ST",50,20]
  ],
  "3-5-2":[
    ["GK",50,92],["CB",25,74],["CB",50,76],["CB",75,74],
    ["LM",12,52],["CM",34,53],["CM",50,48],["CM",66,53],["RM",88,52],
    ["ST",41,24],["ST",59,24]
  ],
  "3-4-3":[
    ["GK",50,92],["CB",25,74],["CB",50,76],["CB",75,74],
    ["LM",14,51],["CM",38,54],["CM",62,54],["RM",86,51],
    ["LW",20,28],["ST",50,22],["RW",80,28]
  ],
  "5-3-2":[
    ["GK",50,92],["LB",9,70],["CB",30,74],["CB",50,76],["CB",70,74],["RB",91,70],
    ["CM",30,52],["CM",50,49],["CM",70,52],["ST",41,25],["ST",59,25]
  ]
};

let players = JSON.parse(localStorage.getItem("bestXIPlayers") || "[]");
let currentXI = [];
let activeSlot = null;
let dragState = null;

const $ = id => document.getElementById(id);

function savePlayers(){
  localStorage.setItem("bestXIPlayers", JSON.stringify(players));
}

function renderPlayerList(){
  $("playerCount").textContent = `${players.length}명`;
  $("playerList").innerHTML = "";

  if(!players.length){
    $("playerList").innerHTML = `<div class="hint">아직 등록된 선수가 없습니다.</div>`;
    return;
  }

  players.forEach((p,i)=>{
    const el=document.createElement("div");
    el.className="player-item";
    el.innerHTML=`
      <div class="player-info">
        <strong>${escapeHtml(p.name)}</strong>
        <span>주: ${p.mainPosition} · 가능: ${p.positions.join(", ")}</span>
      </div>
      <button class="delete" data-index="${i}">삭제</button>`;
    el.querySelector(".delete").onclick=()=>{
      players.splice(i,1);
      savePlayers();
      renderPlayerList();
      currentXI = [];
      renderPitch();
    };
    $("playerList").appendChild(el);
  });
}

$("addPlayer").onclick=()=>{
  const name=$("playerName").value.trim();
  const main=$("mainPosition").value;
  const checked=[...document.querySelectorAll("#positionChecks input:checked")].map(x=>x.value);

  if(!name){ alert("선수 이름을 입력해주세요."); $("playerName").focus(); return; }
  if(!main){ alert("주 포지션을 선택해주세요."); return; }
  if(!checked.length){ alert("뛸 수 있는 포지션을 하나 이상 선택해주세요."); return; }
  if(!checked.includes(main)) checked.unshift(main);

  players.push({id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),name,mainPosition:main,positions:[...new Set(checked)]});
  savePlayers();
  $("playerName").value="";
  $("mainPosition").value="";
  document.querySelectorAll("#positionChecks input").forEach(x=>x.checked=false);
  renderPlayerList();
};

$("playerName").addEventListener("keydown",e=>{
  if(e.key==="Enter") $("addPlayer").click();
});

function positionScore(player, slotPos){
  if(!player) return -1;
  const p=player.positions;
  const main=player.mainPosition;

  if(main===slotPos) return 100;
  if(p.includes(slotPos)) return 70;

  const equivalents = {
    GK:["GK"],
    LB:["LB","LM","LW"],
    RB:["RB","RM","RW"],
    CB:["CB"],
    DM:["DM","CM"],
    CM:["CM","DM","AM"],
    AM:["AM","CM","RW","LW"],
    LM:["LM","LW","LB"],
    RM:["RM","RW","RB"],
    LW:["LW","LM","ST","AM"],
    RW:["RW","RM","ST","AM"],
    ST:["ST","LW","RW","AM"]
  };

  if((equivalents[slotPos]||[]).some(x=>p.includes(x))) return 30;
  return 0;
}

function autoBuild(){
  if(players.length<11){
    alert(`선수가 ${11-players.length}명 부족합니다. 최소 11명을 등록해주세요.`);
    return;
  }

  const slots=FORMATIONS[$("formationSelect").value];
  const remaining=[...players];
  const result=[];

  // 희소 포지션을 먼저 배치해 멀티 포지션 선수가 자리를 차지하는 문제를 줄인다.
  const counts={};
  slots.forEach(s=>counts[s[0]]=(counts[s[0]]||0)+1);
  const ordered=[...slots].sort((a,b)=>(counts[a[0]]-counts[b[0]]) || a[2]-b[2]);

  ordered.forEach(slot=>{
    const pos=slot[0];
    let bestIndex=-1, bestScore=-1;

    remaining.forEach((p,i)=>{
      const score=positionScore(p,pos);
      if(score>bestScore){
        bestScore=score;
        bestIndex=i;
      }
    });

    if(bestIndex>=0 && bestScore>0){
      const player=remaining.splice(bestIndex,1)[0];
      result.push({pos,x:slot[1],y:slot[2],playerId:player.id});
    }else{
      result.push({pos,x:slot[1],y:slot[2],playerId:null});
    }
  });

  // 원래 포메이션 순서로 복원
  currentXI=slots.map(slot=>result.find(r=>r.pos===slot[0] && Math.abs(r.x-slot[1])<0.01 && Math.abs(r.y-slot[2])<0.01) || {pos:slot[0],x:slot[1],y:slot[2],playerId:null});
  renderPitch();
}

$("buildTeam").onclick=autoBuild;

$("resetXI").onclick=()=>{
  currentXI=[];
  renderPitch();
};

$("formationSelect").onchange=()=>{
  currentXI=[];
  renderPitch();
};

function renderPitch(){
  const container=$("playersOnPitch");
  container.innerHTML="";
  if(!currentXI.length) return;

  currentXI.forEach((slot,index)=>{
    const p=players.find(x=>x.id===slot.playerId);
    const el=document.createElement("div");
    el.className=`pitch-player ${p?"":"empty"}`;
    el.style.left=`${slot.x}%`;
    el.style.top=`${slot.y}%`;
    el.dataset.index=index;
    el.innerHTML=`
      <div class="player-circle">${slot.pos}</div>
      <div class="player-name">${p?escapeHtml(p.name):"선수 선택"}</div>
      <div class="player-position">${slot.pos}</div>`;

    el.addEventListener("pointerdown",e=>startDrag(e,el,index));
    el.addEventListener("click",e=>{
      if(dragState && dragState.moved) return;
      openCandidateModal(index);
    });

    container.appendChild(el);
  });
}

function startDrag(e,el,index){
  dragState={el,index,startX:e.clientX,startY:e.clientY,origX:currentXI[index].x,origY:currentXI[index].y,moved:false};
  el.classList.add("dragging");
  el.setPointerCapture(e.pointerId);

  const move=ev=>{
    if(!dragState) return;
    const dx=ev.clientX-dragState.startX;
    const dy=ev.clientY-dragState.startY;
    if(Math.abs(dx)+Math.abs(dy)>6) dragState.moved=true;

    const rect=$("pitch").getBoundingClientRect();
    let x=dragState.origX+(dx/rect.width)*100;
    let y=dragState.origY+(dy/rect.height)*100;
    x=Math.max(3,Math.min(97,x));
    y=Math.max(4,Math.min(96,y));
    currentXI[index].x=x;
    currentXI[index].y=y;
    el.style.left=`${x}%`;
    el.style.top=`${y}%`;
  };

  const end=()=>{
    el.classList.remove("dragging");
    el.releasePointerCapture?.(e.pointerId);
    el.removeEventListener("pointermove",move);
    el.removeEventListener("pointerup",end);
    setTimeout(()=>{ if(dragState) dragState=null; },0);
  };

  el.addEventListener("pointermove",move);
  el.addEventListener("pointerup",end);
}

function openCandidateModal(index){
  activeSlot=index;
  const slot=currentXI[index];
  const used=new Set(currentXI.map((s,i)=>i===index?null:s.playerId).filter(Boolean));

  const candidates=players
    .filter(p=>!used.has(p.id) && positionScore(p,slot.pos)>0)
    .sort((a,b)=>positionScore(b,slot.pos)-positionScore(a,slot.pos));

  $("modalTitle").textContent=`${slot.pos} 선수 선택`;
  const list=$("candidateList");
  list.innerHTML="";

  if(!candidates.length){
    list.innerHTML=`<div class="hint">이 포지션에 배치할 수 있는 선수가 없습니다.</div>`;
  }else{
    candidates.forEach(p=>{
      const b=document.createElement("button");
      b.className="candidate";
      b.innerHTML=`<strong>${escapeHtml(p.name)}</strong><small>주: ${p.mainPosition} · 가능: ${p.positions.join(", ")}</small>`;
      b.onclick=()=>{
        currentXI[activeSlot].playerId=p.id;
        closeModal();
        renderPitch();
      };
      list.appendChild(b);
    });
  }

  $("modal").classList.remove("hidden");
}

function closeModal(){
  $("modal").classList.add("hidden");
  activeSlot=null;
}

$("closeModal").onclick=closeModal;
$("modal").addEventListener("click",e=>{
  if(e.target===$("modal")) closeModal();
});

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

renderPlayerList();
