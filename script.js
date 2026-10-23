// --- プロリン(P)を除いた19種類の天然アミノ酸 ---
const AMINO_ACIDS = ["A", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "Q", "R", "S", "T", "V", "W", "Y"];

let targetSequence = "";
let peptideCounter = 0;
let availablePeptides = [];
let experimentCount = 0;
let actionLogs = [];
let wrongAnswerCount = 0;
let currentLang = "ja";

// --- Google フォームの設定 ---
const FORM_URL = "https://docs.google.com/forms/d/1CjkXITqSBwcBjhyIkuNuf4_eqqPed7NghJPAoAcAx6I/formResponse";
const ENTRY_STUDENT_ID = "entry.864028327";  // 質問1: 班番号・代表者氏名
const ENTRY_COUNT      = "entry.1441535192"; // 質問2: 総実験回数
const ENTRY_LOG_DETAIL = "entry.1640624802"; // 質問3: 実験ログ詳細

// --- 多言語テキスト辞書 ---
const I18N = {
  ja: {
    title: "🧪 アミノ酸配列推定パズル",
    langBtn: "🌐 English",
    sec1Title: "1. プレイヤー情報",
    sec1Label: "班番号・代表者氏名（必須）:",
    sec1Placeholder: "例: 3班 (名大 太郎・名大 花子)",
    sec1Sub: "※実験を開始・提出するために必要です。",
    sec2Title: "2. 初期標的ペプチド [P0]",
    sec2LenLabel: "ペプチド長:",
    sec2Unit: "残基",
    sec2CompLabel: "全体のアミノ酸組成:",
    sec3Title: "3. 酵素切断シミュレーション",
    cleaveBtn: "🧪 酵素を切断・反応させる",
    adviceInit: "💡 <strong>ヒント:</strong> 班員で役割分担（ノート記録・酵素の認識部位確認など）を行い、実験結果が得られるたびに「どの位置が確定したか」を議論しながら進めましょう！迷ったらTAにも相談してください。",
    adviceWarning: "💬 <strong>実験回数が残り少なくなってきました（現在: {count}/10回）:</strong> 無計画な酵素反応は避け、一度紙とペンで現在確定している部位を整理してみましょう。迷ったら遠慮なくTAにヒントを求めてみてください！",
    logTitle: "実験履歴 (ログ)",
    noLog: "まだ実験履歴はありません。",
    sec4Title: "4. 配列推測の解答提出",
    sec4Desc: "特定した12残基のアミノ酸配列を1文字表記の英大文字で入力してください。",
    submitBtn: "正解判定＆提出",
    modalTitle: "🧪 酵素反応の設定",
    modalP0Label: "[P0] 全体のアミノ酸組成:",
    modalPepLabel: "対象ペプチドを選択:",
    modalEnzLabel: "使用する消化酵素を選択:",
    cancelBtn: "キャンセル",
    runBtn: "実験実行",
    
    alertNoId: "実験を開始する前に、まず「班番号・代表者氏名」を入力してください。",
    alertNoAnsId: "班番号・代表者氏名を入力してください。",
    alertNoAns: "推測した配列を入力してください。",
    resNoCut: "<p><strong>結果:</strong> 切断できなかった</p><p style=\"font-size:0.85em; color:#d35400;\">💡「切断不能」という結果も重要な手がかりです！なぜ切れないのか酵素の認識部位を班員と再確認してみましょう。</p>",
    resFragsHeader: "<p><strong>結果:</strong> 以下の断片が得られた</p><ul>",
    labelResLen: "残基",
    labelStructure: "一次構造",
    labelComposition: "組成",
    alertLimit: "【実験回数上限】実験回数が10回に達しました。\n無計画な実験を防ぐため、一度リセットします。\n※これまでの失敗ログをTAへ送信しました。手元で解法や論理を整理してから再挑戦してください！",
    resSuccess: "🎉 正解です！見事に配列を論理的に特定しました！<br>（総実験回数: <strong>{count}回</strong>）<br><small style=\"color:#555;\">※実験ログをTAへ自動送信しました。</small>",
    resWrong1: "❌ 不正解です。ペナルティとして<strong>実験回数が +2 加算</strong>されました（現在の総実験回数: <strong>{count}回</strong>）。<br>誤答ログを送信しました。<br>⚠️ <strong>回答チャンスは残り【1回】です！</strong>ヤマ勘で押さず、一度班員やTAと推論プロセスをダブルチェックしてから最終回答してください。",
    resWrong2: "❌ 2回続けて不正解となりました。<br>無計画な総当たりを防ぐため、回答権がロックされました。<br>最初からやり直す場合はページを再読み込み（F5）してください。",
    
    enzTrypsin: "トリプシン (Trypsin) - K, R のC末端",
    enzChymo: "キモトリプシン (Chymotrypsin) - F, W, Y のC末端",
    enzElastase: "エラスターゼ (Elastase) - A, G, S, V のC末端",
    enzV8: "V8プロテアーゼ (Staphylococcal protease) - D, E のC末端",
    enzThermo: "サーモリシン (Thermolysin) - F, I, M, V, W, Y のN末端",
    enzHepsin: "ヘプシン (Hepsin) - F, L, W, Y のN末端"
  },
  en: {
    title: "🧪 Amino Acid Sequence Estimation Puzzle",
    langBtn: "🌐 日本語",
    sec1Title: "1. Player Information",
    sec1Label: "Group No. & Representative Name (Required):",
    sec1Placeholder: "e.g., Group 3 (John, Mary)",
    sec1Sub: "*Required to start experiments and submit answers.",
    sec2Title: "2. Initial Target Peptide [P0]",
    sec2LenLabel: "Peptide Length:",
    sec2Unit: "residues",
    sec2CompLabel: "Overall Amino Acid Composition:",
    sec3Title: "3. Enzyme Cleavage Simulation",
    cleaveBtn: "🧪 Cleave / React with Enzyme",
    adviceInit: "💡 <strong>Hint:</strong> Divide roles among group members (taking notes, checking enzyme recognition sites, etc.) and discuss 'which positions are confirmed' after each result! Feel free to ask the TA if you get stuck.",
    adviceWarning: "💬 <strong>Few experiment attempts remaining (Current: {count}/10):</strong> Avoid random attempts. Organize the confirmed sequence on paper with your team, or consult the TA!",
    logTitle: "Experiment History (Logs)",
    noLog: "No experiment history yet.",
    sec4Title: "4. Answer Submission",
    sec4Desc: "Enter the identified 12-residue amino acid sequence in single-letter uppercase codes.",
    submitBtn: "Submit Answer",
    modalTitle: "🧪 Enzyme Cleavage Settings",
    modalP0Label: "[P0] Overall Composition:",
    modalPepLabel: "Select Target Peptide:",
    modalEnzLabel: "Select Proteolytic Enzyme:",
    cancelBtn: "Cancel",
    runBtn: "Run Experiment",
    
    alertNoId: "Please enter your Group No. & Name before starting.",
    alertNoAnsId: "Please enter your Group No. & Name.",
    alertNoAns: "Please enter your guessed sequence.",
    resNoCut: "<p><strong>Result:</strong> Could not be cleaved</p><p style=\"font-size:0.85em; color:#d35400;\">💡 'No cleavage' is also crucial evidence! Recheck the cleavage sites with your team.</p>",
    resFragsHeader: "<p><strong>Result:</strong> Obtained the following fragments</p><ul>",
    labelResLen: "residues",
    labelStructure: "Primary Structure",
    labelComposition: "Composition",
    alertLimit: "[Limit Reached] You reached the 10-experiment limit.\nThe game will reset to prevent random guessing.\n*Failure logs have been sent to the TA. Re-organize your logic before trying again!",
    resSuccess: "🎉 Correct! You successfully identified the sequence!<br>(Total Experiments: <strong>{count}</strong>)<br><small style=\"color:#555;\">*Logs automatically sent to TA.</small>",
    resWrong1: "❌ Incorrect. Penalty applied: <strong>+2 added to experiment count</strong> (Current Total: <strong>{count}</strong>).<br>Error log sent.<br>⚠️ <strong>Only [1] attempt remaining!</strong> Double-check your logic with your team or TA before submitting again.",
    resWrong2: "❌ Incorrect on 2 consecutive attempts.<br>Answer submission locked to prevent random guessing.<br>Reload the page (F5) if you wish to start over from the beginning.",
    
    enzTrypsin: "Trypsin - C-term of K, R",
    enzChymo: "Chymotrypsin - C-term of F, W, Y",
    enzElastase: "Elastase - C-term of A, G, S, V",
    enzV8: "V8 Protease - C-term of D, E",
    enzThermo: "Thermolysin - N-term of F, I, M, V, W, Y",
    enzHepsin: "Hepsin - N-term of F, L, W, Y"
  }
};

// UI文言の表示更新
function updateUiText() {
  const t = I18N[currentLang];
  document.getElementById("ui-title").textContent = t.title;
  document.getElementById("lang-toggle-btn").textContent = t.langBtn;
  document.getElementById("ui-sec1-title").textContent = t.sec1Title;
  document.getElementById("ui-sec1-label").textContent = t.sec1Label;
  document.getElementById("student-id-input").placeholder = t.sec1Placeholder;
  document.getElementById("ui-sec1-sub").textContent = t.sec1Sub;
  document.getElementById("ui-sec2-title").textContent = t.sec2Title;
  document.getElementById("ui-sec2-len-label").textContent = t.sec2LenLabel;
  document.getElementById("ui-sec2-unit").textContent = t.sec2Unit;
  document.getElementById("ui-sec2-comp-label").textContent = t.sec2CompLabel;
  document.getElementById("ui-sec3-title").textContent = t.sec3Title;
  document.getElementById("open-cleave-dialog-btn").textContent = t.cleaveBtn;
  document.getElementById("ui-sec3-log-title").textContent = t.logTitle;
  document.getElementById("ui-sec4-title").textContent = t.sec4Title;
  document.getElementById("ui-sec4-desc").textContent = t.sec4Desc;
  document.getElementById("submit-answer-btn").textContent = t.submitBtn;
  document.getElementById("ui-modal-title").textContent = t.modalTitle;
  document.getElementById("ui-modal-p0-label").textContent = t.modalP0Label;
  document.getElementById("ui-modal-pep-label").textContent = t.modalPepLabel;
  document.getElementById("ui-modal-enz-label").textContent = t.modalEnzLabel;
  document.getElementById("cancel-dialog-btn").textContent = t.cancelBtn;
  document.getElementById("confirm-cleave-btn").textContent = t.runBtn;

  // ★ ヒント文章と言語毎の初期ログの更新
  const adviceElem = document.getElementById("general-advice");
  if (adviceElem) {
    if (experimentCount >= 7) {
      adviceElem.innerHTML = t.adviceWarning.replace("{count}", experimentCount);
    } else {
      adviceElem.innerHTML = t.adviceInit;
    }
  }

  // ★ 実験ログが0件の場合の「まだ履歴はありません」テキスト切り替え
  const logBox = document.getElementById("history-log");
  if (logBox && experimentCount === 0) {
    logBox.innerHTML = `<p style="color: #666;">${t.noLog}</p>`;
  }

  // 酵素選択肢の更新
  const enzSelect = document.getElementById("select-enzyme");
  if (enzSelect) {
    enzSelect.options[0].text = t.enzTrypsin;
    enzSelect.options[1].text = t.enzChymo;
    enzSelect.options[2].text = t.enzElastase;
    enzSelect.options[3].text = t.enzV8;
    enzSelect.options[4].text = t.enzThermo;
    enzSelect.options[5].text = t.enzHepsin;
  }
}

// ゲーム初期化
function initGame() {
  targetSequence = "FQGFKDQVTRLA";
  peptideCounter = 0;
  experimentCount = 0;
  wrongAnswerCount = 0;
  actionLogs = [];

  availablePeptides = [
    { id: "p_0", code: "[P0]", sequence: targetSequence, label: `[P0] Initial Target Peptide (${targetSequence.length} residues)` }
  ];

  const submitBtn = document.getElementById("submit-answer-btn");
  const cleaveBtn = document.getElementById("open-cleave-dialog-btn");
  if (submitBtn) submitBtn.disabled = false;
  if (cleaveBtn) cleaveBtn.disabled = false;

  const targetCompStr = getCompositionString(targetSequence);

  document.getElementById("target-length").textContent = targetSequence.length;
  document.getElementById("target-composition").textContent = targetCompStr;
  
  const modalCompElem = document.getElementById("modal-p0-composition");
  if (modalCompElem) modalCompElem.textContent = targetCompStr;

  document.getElementById("answer-input").value = "";
  document.getElementById("answer-result").textContent = "";

  updateUiText();
}

function getCompositionString(seq) {
  const counts = {};
  for (const aa of seq) {
    counts[aa] = (counts[aa] || 0) + 1;
  }
  return Object.keys(counts).sort().map(aa => `${aa}:${counts[aa]}`).join(", ");
}

document.addEventListener("DOMContentLoaded", () => {
  initGame();

  // 言語切替ボタン
  document.getElementById("lang-toggle-btn").addEventListener("click", () => {
    currentLang = (currentLang === "ja") ? "en" : "ja";
    updateUiText();
  });
});

const dialog = document.getElementById("cleave-dialog");
const openDialogBtn = document.getElementById("open-cleave-dialog-btn");
const cancelDialogBtn = document.getElementById("cancel-dialog-btn");
const selectPeptide = document.getElementById("select-peptide");

openDialogBtn.addEventListener("click", () => {
  const studentIdInput = document.getElementById("student-id-input");
  const t = I18N[currentLang];

  if (!studentIdInput || !studentIdInput.value.trim()) {
    alert(t.alertNoId);
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

function getAllCutPositions(seq, enzyme) {
  const cuts = [];
  const len = seq.length;

  for (let i = 0; i < len - 1; i++) {
    const current = seq[i];
    const next = seq[i + 1];
    let isCut = false;

    switch (enzyme) {
      case "trypsin": if (["K", "R"].includes(current)) isCut = true; break;
      case "chymotrypsin": if (["F", "W", "Y"].includes(current)) isCut = true; break;
      case "elastase": if (["A", "G", "S", "V"].includes(current)) isCut = true; break;
      case "v8": if (["D", "E"].includes(current)) isCut = true; break;
      case "thermolysin": if (["F", "I", "M", "V", "W", "Y"].includes(next)) isCut = true; break;
      case "hepsin": if (["F", "L", "W", "Y"].includes(next)) isCut = true; break;
    }
    if (isCut) cuts.push(i + 1);
  }
  return cuts;
}

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
  const enzymeNameJa = document.getElementById("select-enzyme").selectedOptions[0].text;

  const targetObj = availablePeptides.find(p => p.id === selectedPeptideId);
  if (!targetObj) return;

  experimentCount++;
  const res = simulateCleavage(targetObj.sequence, enzyme);
  const t = I18N[currentLang];

  let resultHtml = "";
  let logText = `[実験#${experimentCount}] 対象:${targetObj.code} / 酵素:${enzyme} -> `;

  if (!res.success) {
    resultHtml = t.resNoCut;
    logText += "切断不可";
  } else {
    resultHtml = t.resFragsHeader;
    const generatedFrags = [];

    const sortedFragments = [...res.fragments].sort((a, b) => {
      const lenA = a.length;
      const lenB = b.length;
      const isStructA = (lenA >= 2 && lenA <= 3);
      const isStructB = (lenB >= 2 && lenB <= 3);

      if (isStructA && !isStructB) return -1;
      if (!isStructA && isStructB) return 1;

      if (isStructA && isStructB) {
        return a.localeCompare(b);
      } else {
        const compA = getCompositionString(a);
        const compB = getCompositionString(b);
        return compA.localeCompare(compB);
      }
    });

    sortedFragments.forEach(frag => {
      const len = frag.length;
      if (len >= 2 && len <= 3) {
        resultHtml += `<li>【${len}${t.labelResLen}】${t.labelStructure}: <strong>${frag}</strong></li>`;
        generatedFrags.push(`${frag}(構造)`);
      } else if (len >= 4) {
        peptideCounter++;
        const pCode = `[P${peptideCounter}]`;
        const comp = getCompositionString(frag);
        
        resultHtml += `<li><strong>${pCode}</strong> 【${len}${t.labelResLen}】${t.labelComposition}: <strong>${comp}</strong></li>`;
        generatedFrags.push(`${pCode}(組成:${comp})`);

        availablePeptides.push({
          id: `pep_${peptideCounter}`,
          code: pCode,
          sequence: frag,
          label: `${pCode} Fragment (${len} res - Comp: ${comp})`
        });
      }
    });
    resultHtml += `</ul>`;
    logText += generatedFrags.join(", ");
  }

  actionLogs.push(logText);

  const adviceElem = document.getElementById("general-advice");
  if (adviceElem && experimentCount >= 7) {
    adviceElem.innerHTML = t.adviceWarning.replace("{count}", experimentCount);
  }

  const logBox = document.getElementById("history-log");
  if (experimentCount === 1) logBox.innerHTML = "";

  const item = document.createElement("div");
  item.className = "log-item";
  item.innerHTML = `
    <strong>[Exp #${experimentCount}]</strong><br>
    Target: ${targetObj.code}<br>
    Enzyme: ${enzymeNameJa}<br>
    ${resultHtml}
  `;
  logBox.prepend(item);

  dialog.close();

  if (experimentCount >= 10) {
    alert(t.alertLimit);
    const failLogSummary = "【10回上限到達により失敗】 " + actionLogs.join(" | ");
    sendLogToGoogleForm(studentId, experimentCount, failLogSummary);
    initGame();
  }
});

// 解答判定 & ログ送信
document.getElementById("submit-answer-btn").addEventListener("click", () => {
  const studentIdInput = document.getElementById("student-id-input");
  const studentId = studentIdInput ? studentIdInput.value.trim() : "";
  const userAns = document.getElementById("answer-input").value.trim().toUpperCase();
  const resElem = document.getElementById("answer-result");
  const t = I18N[currentLang];

  if (!studentId) {
    alert(t.alertNoAnsId);
    if (studentIdInput) studentIdInput.focus();
    return;
  }

  if (!userAns) {
    alert(t.alertNoAns);
    return;
  }

  if (userAns === targetSequence) {
    resElem.style.color = "green";
    resElem.innerHTML = t.resSuccess.replace("{count}", experimentCount);
    
    const logSummary = "【正解クリア】 " + actionLogs.join(" | ");
    sendLogToGoogleForm(studentId, experimentCount, logSummary);

    document.getElementById("submit-answer-btn").disabled = true;
    document.getElementById("open-cleave-dialog-btn").disabled = true;

  } else {
    wrongAnswerCount++;
    experimentCount += 2;

    const failAnsSummary = `【誤答 #${wrongAnswerCount}回目(ペナルティ+2加算): 推測配列[${userAns}]】 ` + actionLogs.join(" | ");
    sendLogToGoogleForm(studentId, experimentCount, failAnsSummary);

    if (wrongAnswerCount === 1) {
      resElem.style.color = "red";
      resElem.innerHTML = t.resWrong1.replace("{count}", experimentCount);

      if (experimentCount >= 10) {
        alert(t.alertLimit);
        initGame();
      }

    } else {
      resElem.style.color = "red";
      resElem.innerHTML = t.resWrong2;

      document.getElementById("submit-answer-btn").disabled = true;
      document.getElementById("open-cleave-dialog-btn").disabled = true;
    }
  }
});