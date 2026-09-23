// --- プロリン(P)を除いた19種類の天然アミノ酸 ---
const AMINO_ACIDS = ["A", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "Q", "R", "S", "T", "V", "W", "Y"];

let targetSequence = "";
let peptideCounter = 0;
let availablePeptides = [];
let experimentCount = 0;

// 10〜12残基のランダムなアミノ酸配列を生成
function generateRandomSequence() {
  const length = Math.floor(Math.random() * 3) + 10; // 10, 11, 12のいずれか
  let seq = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * AMINO_ACIDS.length);
    seq += AMINO_ACIDS[randomIndex];
  }
  return seq;
}

// ゲームの初期化/リセット
function initGame() {
  targetSequence = generateRandomSequence();
  peptideCounter = 0;
  experimentCount = 0;

  availablePeptides = [
    { id: "p_0", code: "[P0]", sequence: targetSequence, label: `[P0] 初期標的ペプチド (${targetSequence.length}残基)` }
  ];

  // 画面表示のリセット
  document.getElementById("target-length").textContent = targetSequence.length;
  document.getElementById("target-composition").textContent = getCompositionString(targetSequence);
  document.getElementById("history-log").innerHTML = '<p style="color: #666;">まだ実験履歴はありません。</p>';
  document.getElementById("answer-input").value = "";
  document.getElementById("answer-result").textContent = "";
}

// アミノ酸組成計算関数（例: "A:4, C:1..."）
function getCompositionString(seq) {
  const counts = {};
  for (const aa of seq) {
    counts[aa] = (counts[aa] || 0) + 1;
  }
  return Object.keys(counts).sort().map(aa => `${aa}:${counts[aa]}`).join(", ");
}

// 初期表示処理
document.addEventListener("DOMContentLoaded", () => {
  initGame();

  // 「新しい問題を生成」ボタンのイベント
  document.getElementById("new-game-btn").addEventListener("click", () => {
    if (confirm("現在の進行状態を破棄して、新しい問題を開始しますか？")) {
      initGame();
    }
  });
});

// --- ダイアログ関連 ---
const dialog = document.getElementById("cleave-dialog");
const openDialogBtn = document.getElementById("open-cleave-dialog-btn");
const cancelDialogBtn = document.getElementById("cancel-dialog-btn");
const selectPeptide = document.getElementById("select-peptide");

openDialogBtn.addEventListener("click", () => {
  selectPeptide.innerHTML = "";
  availablePeptides.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    selectPeptide.appendChild(opt);
  });
  dialog.showModal();
});

cancelDialogBtn.addEventListener("click", () => {
  dialog.close();
});

// --- 切断ロジック ---

// 指定酵素で「切断可能なすべての境界（インデックス）」を配列で返す
function getAllCutPositions(seq, enzyme) {
  const cuts = [];
  const len = seq.length;

  for (let i = 0; i < len - 1; i++) {
    const current = seq[i];
    const next = seq[i + 1];
    let isCut = false;

    switch (enzyme) {
      case "trypsin": // K, R の C側
        if (["K", "R"].includes(current)) isCut = true;
        break;
      case "chymotrypsin": // F, W, Y の C側
        if (["F", "W", "Y"].includes(current)) isCut = true;
        break;
      case "elastase": // A, G, S, V の C側
        if (["A", "G", "S", "V"].includes(current)) isCut = true;
        break;
      case "v8": // D, E の C側
        if (["D", "E"].includes(current)) isCut = true;
        break;
      case "thermolysin": // F, I, M, V, W, Y の N側
        if (["F", "I", "M", "V", "W", "Y"].includes(next)) isCut = true;
        break;
      case "hepsin": // F, L, W, Y の N側
        if (["F", "L", "W", "Y"].includes(next)) isCut = true;
        break;
    }

    if (isCut) {
      cuts.push(i + 1);
    }
  }
  return cuts;
}

// 切断処理（全探索 ＋「さらにモノマーを出さずに分割できる親断片」を消去）
function simulateCleavage(seq, enzyme) {
  const possibleCuts = getAllCutPositions(seq, enzyme);
  
  if (possibleCuts.length === 0) {
    return { success: false, reason: "no_site" };
  }

  const validFragmentsSet = new Set();
  const n = possibleCuts.length;

  // 1. 全探索（2^n パターン）でモノマーが出ない切断から得られる全断片を集める
  for (let mask = 1; mask < (1 << n); mask++) {
    const activeCuts = [];
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) {
        activeCuts.push(possibleCuts[i]);
      }
    }

    const fragments = [];
    let start = 0;
    for (const pos of activeCuts) {
      fragments.push(seq.substring(start, pos));
      start = pos;
    }
    fragments.push(seq.substring(start));

    // パターン内にモノマー（1残基）が含まれていなければ採用
    const hasMonomer = fragments.some(f => f.length === 1);
    if (!hasMonomer) {
      fragments.forEach(f => validFragmentsSet.add(f));
    }
  }

  if (validFragmentsSet.size === 0) {
    return { success: false, reason: "all_monomers" };
  }

  // 元の配列そのものは除外
  const allValidFragments = Array.from(validFragmentsSet).filter(f => f !== seq);

  // 2. 「自身の中にさらにモノマーを出さずに切れる部位がある親断片」を消去する
  const finalFragments = allValidFragments.filter(subSeq => {
    const subCuts = getAllCutPositions(subSeq, enzyme);
    if (subCuts.length === 0) return true; // 切断部位がなければそのまま残す

    // subSeq の内部でモノマーが出ない有効な切断が1つでも可能か検証
    const subN = subCuts.length;
    let canBeCleavedFurtherWithoutMonomer = false;

    for (let mask = 1; mask < (1 << subN); mask++) {
      const activeCuts = [];
      for (let i = 0; i < subN; i++) {
        if ((mask >> i) & 1) activeCuts.push(subCuts[i]);
      }

      const frags = [];
      let start = 0;
      for (const pos of activeCuts) {
        frags.push(subSeq.substring(start, pos));
        start = pos;
      }
      frags.push(subSeq.substring(start));

      // モノマーが発生しない分解の組み合わせが存在した場合
      if (!frags.some(f => f.length === 1)) {
        canBeCleavedFurtherWithoutMonomer = true;
        break; // 1つでもさらに分解できるパターンがあれば抜け出す
      }
    }

    // さらに分解可能なら false（消去）、これ以上分解不能なら true（残す）
    return !canBeCleavedFurtherWithoutMonomer;
  });

  if (finalFragments.length === 0) {
    return { success: false, reason: "no_valid_cut" };
  }

  return { success: true, fragments: finalFragments };
}

// 実験実行
document.getElementById("confirm-cleave-btn").addEventListener("click", (e) => {
  e.preventDefault();

  const selectedPeptideId = selectPeptide.value;
  const enzyme = document.getElementById("select-enzyme").value;
  const enzymeName = document.getElementById("select-enzyme").selectedOptions[0].text;

  const targetObj = availablePeptides.find(p => p.id === selectedPeptideId);
  if (!targetObj) return;

  experimentCount++;
  const res = simulateCleavage(targetObj.sequence, enzyme);

  let resultHtml = "";

  if (!res.success) {
    resultHtml = `<p><strong>結果:</strong> ペプチドは切断できなかった</p>`;
  } else {
    resultHtml = `<p><strong>結果:</strong> 以下の断片が得られた</p><ul>`;

    res.fragments.forEach(frag => {
      const len = frag.length;
      if (len >= 2 && len <= 3) {
        // 2-3残基: 一次構造 (配列そのもの)
        resultHtml += `<li>【${len}残基】一次構造: <strong>${frag}</strong></li>`;
      } else if (len >= 4) {
        // 4残基以上: 通し番号（P1, P2...）を発行して保存
        peptideCounter++;
        const pCode = `[P${peptideCounter}]`;
        const comp = getCompositionString(frag);
        
        resultHtml += `<li><strong>${pCode}</strong> 【${len}残基】組成式: <strong>${comp}</strong></li>`;

        const newId = `pep_${peptideCounter}`;
        availablePeptides.push({
          id: newId,
          code: pCode,
          sequence: frag,
          label: `${pCode} 断片 (${len}残基 - 組成: ${comp})`
        });
      }
    });
    resultHtml += `</ul>`;
  }

  const logBox = document.getElementById("history-log");
  if (experimentCount === 1) logBox.innerHTML = "";

  const item = document.createElement("div");
  item.className = "log-item";
  item.innerHTML = `
    <strong>[実験 #${experimentCount}]</strong><br>
    対象: ${targetObj.label}<br>
    酵素: ${enzymeName}<br>
    ${resultHtml}
  `;
  logBox.prepend(item);

  dialog.close();
});

// 解答判定
document.getElementById("submit-answer-btn").addEventListener("click", () => {
  const userAns = document.getElementById("answer-input").value.trim().toUpperCase();
  const resElem = document.getElementById("answer-result");

  if (!userAns) return;

  if (userAns === targetSequence) {
    resElem.style.color = "green";
    resElem.innerHTML = `🎉 正解です！見事に配列を特定しました！<br>（総酵素反応回数: <strong>${experimentCount}回</strong>）`;
  } else {
    resElem.style.color = "red";
    resElem.textContent = "❌ 不正解です。もう一度推測してみてください。";
  }
});