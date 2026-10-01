// --- プロリン(P)を除いた19種類の天然アミノ酸 ---
const AMINO_ACIDS = ["A", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "Q", "R", "S", "T", "V", "W", "Y"];

let targetSequence = "";
let peptideCounter = 0;
let availablePeptides = [];
let experimentCount = 0;
let actionLogs = []; // 実験ログ保持用
let wrongAnswerCount = 0; // 誤答カウント用

// --- Google フォームの設定 ---
const FORM_URL = "https://docs.google.com/forms/d/1CjkXITqSBwcBjhyIkuNuf4_eqqPed7NghJPAoAcAx6I/formResponse";
const ENTRY_STUDENT_ID = "entry.864028327";  // 質問1: 班番号・代表者氏名
const ENTRY_COUNT      = "entry.1441535192"; // 質問2: 総実験回数
const ENTRY_LOG_DETAIL = "entry.1640624802"; // 質問3: 実験ログ詳細

// ゲームの初期化/リセット
function initGame() {
  targetSequence = "FQGFKDQVTRLA"; // 標的配列（12残基固定）
  peptideCounter = 0;
  experimentCount = 0;
  wrongAnswerCount = 0;
  actionLogs = [];

  availablePeptides = [
    { id: "p_0", code: "[P0]", sequence: targetSequence, label: `[P0] 初期標的ペプチド (${targetSequence.length}残基)` }
  ];

  // ボタンの無効化を解除
  const submitBtn = document.getElementById("submit-answer-btn");
  const cleaveBtn = document.getElementById("open-cleave-dialog-btn");
  if (submitBtn) submitBtn.disabled = false;
  if (cleaveBtn) cleaveBtn.disabled = false;

  const targetCompStr = getCompositionString(targetSequence);

  document.getElementById("target-length").textContent = targetSequence.length;
  document.getElementById("target-composition").textContent = targetCompStr;
  
  // モーダル内のP0組成常時表示エリアにも反映
  const modalCompElem = document.getElementById("modal-p0-composition");
  if (modalCompElem) modalCompElem.textContent = targetCompStr;

  document.getElementById("history-log").innerHTML = '<p style="color: #666;">まだ実験履歴はありません。</p>';
  document.getElementById("answer-input").value = "";
  document.getElementById("answer-result").textContent = "";
}

// アミノ酸組成計算関数（例: "A:1, D:1..."）
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
});

// モーダルダイアログ制御
const dialog = document.getElementById("cleave-dialog");
const openDialogBtn = document.getElementById("open-cleave-dialog-btn");
const cancelDialogBtn = document.getElementById("cancel-dialog-btn");
const selectPeptide = document.getElementById("select-peptide");

openDialogBtn.addEventListener("click", () => {
  const studentIdInput = document.getElementById("student-id-input");
  if (!studentIdInput || !studentIdInput.value.trim()) {
    alert("実験を開始する前に、まず「班番号・代表者氏名」を入力してください。");
    if (studentIdInput) studentIdInput.focus();
    return;
  }

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

// 切断部位検索関数
function getAllCutPositions(seq, enzyme) {
  const cuts = [];
  const len = seq.length;

  for (let i = 0; i < len - 1; i++) {
    const current = seq[i];
    const next = seq[i + 1];
    let isCut = false;

    switch (enzyme) {
      case "trypsin":
        if (["K", "R"].includes(current)) isCut = true;
        break;
      case "chymotrypsin":
        if (["F", "W", "Y"].includes(current)) isCut = true;
        break;
      case "elastase":
        if (["A", "G", "S", "V"].includes(current)) isCut = true;
        break;
      case "v8":
        if (["D", "E"].includes(current)) isCut = true;
        break;
      case "thermolysin":
        if (["F", "I", "M", "V", "W", "Y"].includes(next)) isCut = true;
        break;
      case "hepsin":
        if (["F", "L", "W", "Y"].includes(next)) isCut = true;
        break;
    }

    if (isCut) cuts.push(i + 1);
  }
  return cuts;
}

// 切断シミュレーション関数
function simulateCleavage(seq, enzyme) {
  const possibleCuts = getAllCutPositions(seq, enzyme);
  if (possibleCuts.length === 0) return { success: false, reason: "no_site" };

  const validFragmentsSet = new Set();
  const n = possibleCuts.length;

  for (let mask = 1; mask < (1 << n); mask++) {
    const activeCuts = [];
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) activeCuts.push(possibleCuts[i]);
    }

    const fragments = [];
    let start = 0;
    for (const pos of activeCuts) {
      fragments.push(seq.substring(start, pos));
      start = pos;
    }
    fragments.push(seq.substring(start));

    if (!fragments.some(f => f.length === 1)) {
      fragments.forEach(f => validFragmentsSet.add(f));
    }
  }

  if (validFragmentsSet.size === 0) return { success: false, reason: "all_monomers" };

  const allValidFragments = Array.from(validFragmentsSet).filter(f => f !== seq);

  const finalFragments = allValidFragments.filter(subSeq => {
    const subCuts = getAllCutPositions(subSeq, enzyme);
    if (subCuts.length === 0) return true;

    const subN = subCuts.length;
    let canBeCleavedFurther = false;

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

      if (!frags.some(f => f.length === 1)) {
        canBeCleavedFurther = true;
        break;
      }
    }
    return !canBeCleavedFurther;
  });

  if (finalFragments.length === 0) return { success: false, reason: "no_valid_cut" };

  return { success: true, fragments: finalFragments };
}

// Google フォームへのバックグラウンド送信関数
function sendLogToGoogleForm(studentId, totalCount, logDetails) {
  const formData = new FormData();
  formData.append(ENTRY_STUDENT_ID, studentId);
  formData.append(ENTRY_COUNT, totalCount);
  formData.append(ENTRY_LOG_DETAIL, logDetails);

  fetch(FORM_URL, {
    method: "POST",
    mode: "no-cors",
    body: formData
  }).then(() => {
    console.log("Log successfully sent to Google Form");
  }).catch(err => {
    console.error("Failed to send log:", err);
  });
}

// 実験実行イベント
document.getElementById("confirm-cleave-btn").addEventListener("click", (e) => {
  e.preventDefault();

  const studentIdInput = document.getElementById("student-id-input");
  const studentId = studentIdInput ? studentIdInput.value.trim() : "未入力";

  const selectedPeptideId = selectPeptide.value;
  const enzyme = document.getElementById("select-enzyme").value;
  const enzymeName = document.getElementById("select-enzyme").selectedOptions[0].text;

  const targetObj = availablePeptides.find(p => p.id === selectedPeptideId);
  if (!targetObj) return;

  experimentCount++;
  const res = simulateCleavage(targetObj.sequence, enzyme);

  let resultHtml = "";
  let logText = `[実験#${experimentCount}] 対象:${targetObj.code} / 酵素:${enzymeName} -> `;

  if (!res.success) {
    resultHtml = `<p><strong>結果:</strong> 切断できなかった</p><p style="font-size:0.85em; color:#d35400;">💡「切断不能」という結果も重要な手がかりです！なぜ切れないのか酵素の認識部位を班員と再確認してみましょう。</p>`;
    logText += "切断不可";
  } else {
    resultHtml = `<p><strong>結果:</strong> 以下の断片が得られた</p><ul>`;
    const generatedFrags = [];

    res.fragments.forEach(frag => {
      const len = frag.length;
      if (len >= 2 && len <= 3) {
        resultHtml += `<li>【${len}残基】一次構造: <strong>${frag}</strong></li>`;
        generatedFrags.push(`${frag}(構造)`);
      } else if (len >= 4) {
        peptideCounter++;
        const pCode = `[P${peptideCounter}]`;
        const comp = getCompositionString(frag);
        
        resultHtml += `<li><strong>${pCode}</strong> 【${len}残基】組成: <strong>${comp}</strong></li>`;
        generatedFrags.push(`${pCode}(組成:${comp})`);

        availablePeptides.push({
          id: `pep_${peptideCounter}`,
          code: pCode,
          sequence: frag,
          label: `${pCode} 断片 (${len}残基 - 組成: ${comp})`
        });
      }
    });
    resultHtml += `</ul>`;
    logText += generatedFrags.join(", ");
  }

  actionLogs.push(logText);

  // アドバイス表示の更新（回数に応じてTA相談を促進）
  const adviceElem = document.getElementById("general-advice");
  if (adviceElem) {
    if (experimentCount >= 7) {
      adviceElem.innerHTML = `💬 <strong>実験回数が残り少なくなってきました（現在: ${experimentCount}/10回）:</strong> 無計画な酵素反応は避け、一度紙とペンで現在確定している部位を整理してみましょう。迷ったら遠慮なくTAにヒントを求めてみてください！`;
    }
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

  // ★ 10回上限チェック（過剰ガチャ対策）
  if (experimentCount >= 10) {
    alert("【実験回数上限】実験回数が10回に達しました。\n無計画な実験を防ぐため、一度リセットします。\n※これまでの失敗ログをTAへ送信しました。手元で解法や論理を整理してから再挑戦してください！");
    
    const failLogSummary = "【10回上限到達により失敗】 " + actionLogs.join(" | ");
    sendLogToGoogleForm(studentId, experimentCount, failLogSummary);

    initGame();
  }
});

// 解答判定 & ログ送信 (誤答ペナルティ +2 加算 ＆ 回答最大2回制限 ＆ TA相談誘導)
document.getElementById("submit-answer-btn").addEventListener("click", () => {
  const studentIdInput = document.getElementById("student-id-input");
  const studentId = studentIdInput ? studentIdInput.value.trim() : "";
  const userAns = document.getElementById("answer-input").value.trim().toUpperCase();
  const resElem = document.getElementById("answer-result");

  if (!studentId) {
    alert("班番号・代表者氏名を入力してください。");
    if (studentIdInput) studentIdInput.focus();
    return;
  }

  if (!userAns) {
    alert("推測した配列を入力してください。");
    return;
  }

  // 正解判定
  if (userAns === targetSequence) {
    resElem.style.color = "green";
    resElem.innerHTML = `🎉 正解です！見事に配列を論理的に特定しました！<br>（総実験回数: <strong>${experimentCount}回</strong>）<br><small style="color:#555;">※実験ログをTAへ自動送信しました。</small>`;
    
    const logSummary = "【正解クリア】 " + actionLogs.join(" | ");
    sendLogToGoogleForm(studentId, experimentCount, logSummary);

    document.getElementById("submit-answer-btn").disabled = true;
    document.getElementById("open-cleave-dialog-btn").disabled = true;

  } else {
    wrongAnswerCount++;

    // ★ 誤答ペナルティ：実験回数を +2 加算
    experimentCount += 2;

    // 誤答ログをGoogleフォームへ送信
    const failAnsSummary = `【誤答 #${wrongAnswerCount}回目(ペナルティ+2加算): 推測配列[${userAns}]】 ` + actionLogs.join(" | ");
    sendLogToGoogleForm(studentId, experimentCount, failAnsSummary);

    if (wrongAnswerCount === 1) {
      resElem.style.color = "red";
      resElem.innerHTML = `❌ 不正解です。ペナルティとして<strong>実験回数が +2 加算</strong>されました（現在の総実験回数: <strong>${experimentCount}回</strong>）。<br>誤答ログを送信しました。<br>⚠️ <strong>回答チャンスは残り【1回】です！</strong>ヤマ勘で押さず、一度班員やTAと推論プロセスをダブルチェックしてから最終回答してください。`;

      // ★ ペナルティ加算によって10回上限を超過・到達した場合の自動リセット
      if (experimentCount >= 10) {
        alert("【実験回数上限到達】ペナルティ加算により実験回数が10回以上に達しました。\n無計画な解答を防ぐため、一度リセットします。\n※これまでの失敗ログをTAへ送信しました。手元で解法を整理してから再挑戦してください。");
        initGame();
      }

    } else {
      resElem.style.color = "red";
      resElem.innerHTML = `❌ 2回続けて不正解となりました。<br>無計画な総当たりを防ぐため、回答権がロックされました。<br>最初からやり直す場合はページを再読み込み（F5）してください。`;

      document.getElementById("submit-answer-btn").disabled = true;
      document.getElementById("open-cleave-dialog-btn").disabled = true;
    }
  }
});