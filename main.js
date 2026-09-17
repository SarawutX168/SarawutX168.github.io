const GRID_SIZE = 40;
let globalStepsData = [];
let isPracticeMode = false;
let network;
let nodes, edges;

// ตัวแปรสำหรับโหมดสร้างเส้นแบบคลิก (ไม่ต้องลาก)
let customAddEdgeMode = false;
let selectedNodeForEdge = null;

// ฟังก์ชันยกเลิกโหมดวาดกราฟต่างๆ
function cancelCustomModes() {
    customAddEdgeMode = false;
    selectedNodeForEdge = null;
    document.querySelectorAll('.graph-tool-btn').forEach(btn => btn.classList.remove('active'));
    if (network) network.unselectAll();
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-msg');

    msg.textContent = message;
    if(type === 'success') {
        icon.className = "fa-solid fa-circle-check text-emerald-400 text-base";
    } else if(type === 'warning') {
        icon.className = "fa-solid fa-triangle-exclamation text-amber-400 text-base";
    } else {
        icon.className = "fa-solid fa-circle-info text-cyan-400 text-base";
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

const defaultNodes = [
    { id: 'a', label: 'a', x: -160, y: -80 }, { id: 'b', label: 'b', x: 0, y: -80 }, { id: 'c', label: 'c', x: 160, y: -80 },
    { id: 'd', label: 'd', x: -160, y: 40 }, { id: 'e', label: 'e', x: 0, y: 40 }, { id: 'f', label: 'f', x: 160, y: 40 },
    { id: 'g', label: 'g', x: -160, y: 160 }, { id: 'h', label: 'h', x: 0, y: 160 }, { id: 'i', label: 'i', x: 160, y: 160 }
];

const defaultEdges = [
    { id: 'e1', from: 'a', to: 'b', label: '4' }, { id: 'e2', from: 'a', to: 'd', label: '1' }, { id: 'e3', from: 'a', to: 'e', label: '8' },
    { id: 'e4', from: 'b', to: 'c', label: '2' }, { id: 'e5', from: 'b', to: 'e', label: '6' }, { id: 'e6', from: 'b', to: 'f', label: '4' },
    { id: 'e7', from: 'c', to: 'f', label: '6' }, { id: 'e8', from: 'd', to: 'e', label: '9' }, { id: 'e9', from: 'd', to: 'g', label: '7' },
    { id: 'e10', from: 'e', to: 'f', label: '3' }, { id: 'e11', from: 'e', to: 'h', label: '1' }, { id: 'e12', from: 'f', to: 'i', label: '9' },
    { id: 'e13', from: 'g', to: 'h', label: '3' }, { id: 'e14', from: 'h', to: 'i', label: '5' }
];

function initNetwork() {
    nodes = new vis.DataSet(JSON.parse(JSON.stringify(defaultNodes)));
    edges = new vis.DataSet(JSON.parse(JSON.stringify(defaultEdges)));
    
    var container = document.getElementById('mynetwork');
    var options = {
        physics: false,
        interaction: { zoomView: true, dragView: true, selectConnectedEdges: false },
        nodes: {
            shape: 'dot',
            size: 16,
            font: { size: 17, color: '#f8fafc', face: 'Fira Code, monospace', bold: true },
            borderWidth: 2.5,
            color: {
                background: '#090e1c',
                border: '#0ea5e9',
                highlight: { background: '#0ea5e9', border: '#ffffff' }
            },
            shadow: {
                enabled: true,
                color: 'rgba(14, 165, 233, 0.35)',
                size: 10,
                x: 0,
                y: 0
            }
        },
        edges: {
            smooth: false,
            width: 2,
            arrows: '',
            color: { color: '#334155', highlight: '#0ea5e9' },
            font: {
                size: 15,
                color: '#34d399',
                align: 'horizontal',
                background: '#090e1c',
                strokeWidth: 0,
                face: 'Fira Code, monospace',
                bold: true
            }
        },
        manipulation: {
            enabled: true,
            initiallyActive: false,
            addNode: function(data, callback) {
                var label = prompt("ระบุชื่อโหนด (เช่น a, b, c หรือ X):", "");
                if (label && label.trim() !== "") {
                    const trimmed = label.trim().toLowerCase();
                    if(nodes.get(trimmed)) {
                        showToast("มีโหนด " + trimmed + " อยู่ในกราฟแล้ว", "warning");
                        callback(null);
                        return;
                    }
                    data.id = trimmed;
                    data.label = trimmed;
                    if (document.getElementById('snapToGrid').checked) {
                        data.x = Math.round(data.x / GRID_SIZE) * GRID_SIZE;
                        data.y = Math.round(data.y / GRID_SIZE) * GRID_SIZE;
                    }
                    callback(data);
                    showToast(`เพิ่มโหนด '${trimmed}' เรียบร้อย`, 'success');
                } else {
                    callback(null);
                }
            }
            // ปิดระบบ addEdge เดิมทิ้งไป เราจะใช้ระบบคลิกแทน
        }
    };

    network = new vis.Network(container, { nodes: nodes, edges: edges }, options);

    // =========================================================
    // NEW: ระบบคลิกเพื่อสร้างเส้นเชื่อม (คลิก 2 ครั้งแทนการลาก)
    // =========================================================
    network.on("click", function(params) {
        if (customAddEdgeMode) {
            if (params.nodes.length > 0) {
                let clickedNodeId = params.nodes[0];
                
                if (!selectedNodeForEdge) {
                    // คลิกครั้งที่ 1 (เลือกจุดเริ่มต้น)
                    selectedNodeForEdge = clickedNodeId;
                    showToast(`เลือกโหนด '${clickedNodeId}' แล้ว กรุณาคลิกโหนดเป้าหมาย`, "info");
                } else {
                    // คลิกครั้งที่ 2 (เลือกจุดปลายทาง)
                    if (selectedNodeForEdge === clickedNodeId) {
                        showToast("ไม่สามารถเชื่อมต่อโหนดเข้าหาตัวเองได้", "warning");
                        selectedNodeForEdge = null;
                        network.unselectAll();
                        return;
                    }

                    var weight = prompt("ระบุน้ำหนัก/ระยะทาง (ตัวเลข):", "1");
                    if (weight && !isNaN(weight) && weight.trim() !== "") {
                        edges.add({
                            from: selectedNodeForEdge,
                            to: clickedNodeId,
                            label: weight.trim()
                        });
                        showToast(`เชื่อมต่อเส้น ${selectedNodeForEdge} ↔ ${clickedNodeId} เรียบร้อย`, "success");
                        resetEdgeColors();
                    }
                    // หลังจากสร้างเสร็จ ยกเลิกโหมดเพื่อกลับสู่การทำงานปกติ
                    cancelCustomModes();
                }
            } else {
                // คลิกโดนพื้นที่ว่าง (ยกเลิกการเลือก)
                if (selectedNodeForEdge) {
                    selectedNodeForEdge = null;
                    showToast("ยกเลิกการเลือกจุดเริ่มต้นแล้ว", "info");
                } else {
                    cancelCustomModes();
                    showToast("ยกเลิกโหมดเชื่อมเส้น", "info");
                }
            }
        }
    });

    network.on("beforeDrawing", function(ctx) {
        ctx.save();
        ctx.strokeStyle = '#141d30';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x = -2000; x <= 2000; x += GRID_SIZE) {
            ctx.moveTo(x, -2000);
            ctx.lineTo(x, 2000);
        }
        for (var y = -2000; y <= 2000; y += GRID_SIZE) {
            ctx.moveTo(-2000, y);
            ctx.lineTo(2000, y);
        }
        ctx.stroke();
        ctx.restore();
    });

    network.on("dragEnd", function(params) {
        if (params.nodes.length > 0) {
            let updates = [];
            let snap = document.getElementById('snapToGrid').checked;
            params.nodes.forEach(nodeId => {
                let pos = network.getPositions([nodeId])[nodeId];
                updates.push({ 
                    id: nodeId, 
                    x: snap ? Math.round(pos.x / GRID_SIZE) * GRID_SIZE : pos.x, 
                    y: snap ? Math.round(pos.y / GRID_SIZE) * GRID_SIZE : pos.y 
                });
            });
            nodes.update(updates);
        }
    });
}

// Floating Toolbar Custom Triggers
function triggerAddNode() {
    if (!network) return;
    cancelCustomModes(); // เคลียร์โหมดอื่นๆ
    network.addNodeMode();
    showToast("คลิกบนกระดานเพื่อวางโหนดใหม่", "info");
}

function triggerAddEdge() {
    if (!network) return;
    cancelCustomModes(); 
    network.disableEditMode(); // ปิดระบบ native ของไลบรารี
    customAddEdgeMode = true; // เปิดใช้งานระบบคลิก 2 ครั้ง
    document.querySelector('.tool-btn-edge').classList.add('active'); // เพิ่มแสงให้ปุ่ม
    showToast("คลิกที่โหนดแรกที่ต้องการเชื่อมเส้น", "info");
}

function triggerEditEdge() {
    if (!network) return;
    cancelCustomModes();
    let selectedEdges = network.getSelectedEdges();
    if (selectedEdges && selectedEdges.length > 0) {
        let edge = edges.get(selectedEdges[0]);
        let currentWeight = edge.label || "1";
        let newWeight = prompt("แก้ไขระยะทางใหม่ (ตัวเลข):", currentWeight);
        if (newWeight && !isNaN(newWeight) && newWeight.trim() !== "") {
            edges.update({ id: edge.id, label: newWeight.trim() });
            showToast(`อัปเดตน้ำหนักเป็น ${newWeight.trim()}`, "success");
        }
    } else {
        showToast("กรุณาคลิกเลือกเส้นที่ต้องการแก้ไขก่อน", "warning");
    }
}

function triggerDeleteSelected() {
    if (!network) return;
    cancelCustomModes();
    let selectedNodes = network.getSelectedNodes();
    let selectedEdges = network.getSelectedEdges();

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        showToast("กรุณาคลิกเลือกโหนดหรือเส้นที่ต้องการลบก่อน", "warning");
        return;
    }

    if (selectedNodes.length > 0) {
        selectedNodes.forEach(id => nodes.remove(id));
    }
    if (selectedEdges.length > 0) {
        selectedEdges.forEach(id => edges.remove(id));
    }
    showToast("ลบรายการที่เลือกแล้ว", "info");
}

// =========================================================
// ระบบบันทึกและโหลดกราฟผ่าน LocalStorage
// =========================================================
function saveGraph() {
    const currentNodes = nodes.get();
    const currentEdges = edges.get();
    try {
        localStorage.setItem('dijkstra_nodes', JSON.stringify(currentNodes));
        localStorage.setItem('dijkstra_edges', JSON.stringify(currentEdges));
        showToast("บันทึกกราฟลงเบราว์เซอร์เรียบร้อยแล้ว!", "success");
    } catch (e) {
        alert("บันทึกกราฟเรียบร้อยแล้ว! 💾\n(คุณสามารถปิดหน้าเว็บนี้แล้วกลับมาเปิดใหม่ โครงสร้างกราฟนี้ก็ยังคงอยู่ครับ)");
    }
}

function loadSavedGraph() {
    const savedNodes = localStorage.getItem('dijkstra_nodes');
    const savedEdges = localStorage.getItem('dijkstra_edges');
    
    if (savedNodes && savedEdges) {
        if(confirm("ต้องการโหลดกราฟที่บันทึกไว้ใช่หรือไม่?\n(กราฟปัจจุบันบนกระดานจะถูกแทนที่)")) {
            nodes.clear();
            edges.clear();
            nodes.add(JSON.parse(savedNodes));
            edges.add(JSON.parse(savedEdges));
            document.getElementById('output-tables').innerHTML = '';
            resetEdgeColors();
            showToast("โหลดกราฟที่บันทึกไว้สำเร็จ", "info");
        }
    } else {
        showToast("ยังไม่มีกราฟถูกบันทึกไว้ในเบราว์เซอร์", "warning");
    }
}

function clearGraph() {
    if(confirm("ยืนยันการล้างกราฟทั้งหมด?")) {
        nodes.clear();
        edges.clear();
        document.getElementById('output-tables').innerHTML = '';
        showToast("ล้างกระดานกราฟแล้ว", "info");
    }
}

function loadDefaultGraph() {
    if(confirm("รีเซ็ตเป็นโจทย์เริ่มต้น?")) {
        nodes.clear();
        edges.clear();
        nodes.add(JSON.parse(JSON.stringify(defaultNodes)));
        edges.add(JSON.parse(JSON.stringify(defaultEdges)));
        document.getElementById('output-tables').innerHTML = '';
        resetEdgeColors();
        showToast("รีเซ็ตเป็นกราฟโจทย์มาตรฐานแล้ว", "info");
    }
}

function resetEdgeColors() {
    let updates = [];
    edges.getIds().forEach(id => {
        updates.push({ id: id, color: { color: '#334155' }, width: 2 });
    });
    edges.update(updates);
}

function highlightPathOnGraph(pathArray) {
    if(pathArray.length < 2) return;
    let allEdges = edges.get();
    let edgeUpdates = [];
    
    for(let i = 0; i < pathArray.length - 1; i++) {
        let u = pathArray[i];
        let v = pathArray[i+1];
        let matchingEdge = allEdges.find(e => (e.from === u && e.to === v) || (e.from === v && e.to === u));
        if(matchingEdge) {
            edgeUpdates.push({
                id: matchingEdge.id,
                color: { color: '#f43f5e', highlight: '#f43f5e' },
                width: 5
            });
        }
    }
    edges.update(edgeUpdates);
}

function toggleMode() {
    isPracticeMode = document.querySelector('input[name="appMode"]:checked').value === 'practice';
    document.getElementById('btn-auto').style.display = isPracticeMode ? 'none' : 'inline-flex';
    document.getElementById('btn-practice').style.display = isPracticeMode ? 'inline-flex' : 'none';
    
    const banner = document.getElementById('practice-rules-banner');
    if (isPracticeMode) {
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }

    document.getElementById('practice-controls').style.display = 'none';
    document.getElementById('practice-controls').classList.remove('flex');
    document.getElementById('output-tables').innerHTML = '';
    resetEdgeColors();
}

function calculateAndRender(forPractice) {
    resetEdgeColors(); 
    const startId = document.getElementById('startNode').value.trim().toLowerCase();
    const endId = document.getElementById('endNode').value.trim().toLowerCase();
    let allNodes = nodes.getIds().map(x => x.toString().toLowerCase()).sort();
    
    if (!allNodes.includes(startId)) {
        return alert("ไม่พบจุดเริ่มต้น (" + startId + ") ที่ระบุในกราฟ");
    }
    let graph = {};
    allNodes.forEach(n => graph[n] = {});
    edges.get().forEach(e => {
        let u = e.from.toString().toLowerCase();
        let v = e.to.toString().toLowerCase();
        let w = parseFloat(e.label);
        if (!graph[u][v] || w < graph[u][v]) graph[u][v] = w;
        if (!graph[v][u] || w < graph[v][u]) graph[v][u] = w;
    });

    let dist = {}, prev = {};
    let unvisited = new Set(allNodes);
    allNodes.forEach(n => { dist[n] = Infinity; prev[n] = "null"; });
    dist[startId] = 0;

    let stepsData = [];
    stepsData.push(createStepRecord(0, "-", dist, prev, unvisited));

    let round = 0;
    while (unvisited.size > 0) {
        let current = null, minDist = Infinity;
        unvisited.forEach(n => {
            if (dist[n] < minDist) {
                minDist = dist[n];
                current = n;
            }
        });
        
        if (current === null) break;
        
        unvisited.delete(current);
        round++;

        for (let neighbor in graph[current]) {
            if (unvisited.has(neighbor)) {
                let newDist = dist[current] + graph[current][neighbor];
                if (newDist < dist[neighbor]) {
                    dist[neighbor] = newDist;
                    prev[neighbor] = current;
                }
            }
        }
        stepsData.push(createStepRecord(round, current, dist, prev, unvisited));
    }

    globalStepsData = stepsData;

    if (forPractice) {
        renderPracticeUI(stepsData, allNodes);
    } else {
        renderAutoUI(stepsData, allNodes, startId, endId, dist, prev);
    }
}

function createStepRecord(round, selected, dist, prev, unvisited) {
    return { round: round, selected: selected, dist: {...dist}, prev: {...prev}, T: Array.from(unvisited).sort() };
}

function renderAutoUI(steps, allNodes, start, end, finalDist, finalPrev) {
    let html = "";
    steps.forEach(step => {
        let selectedLabel = step.round === 0 
            ? '<span class="text-slate-500 font-mono text-xs">- (จุดเริ่มต้น)</span>' 
            : `<span class="text-cyan-400 font-mono font-bold uppercase bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/30">${step.selected}</span>`;
            
        html += `
            <div class="step-card">
                <div class="step-header">
                    <i class="fa-solid fa-layer-group text-sky-400 text-xs"></i>
                    <span>รอบที่ ${step.round}</span>
                </div>
                <div class="step-subheader">
                    <span>เลือกโหนด:</span> ${selectedLabel}
                </div>
                <table class="step-table">
                    <tr><th>v</th><th>dist</th><th>prev</th></tr>`;
        allNodes.forEach(n => {
            let d = step.dist[n] === Infinity ? "inf" : step.dist[n];
            let isSel = (n === step.selected);
            let rowBg = isSel ? 'style="background:rgba(6,182,212,0.12)"' : '';
            html += `<tr ${rowBg}><td class="${isSel ? 'text-cyan-300 font-bold' : 'text-slate-300'}">${n}</td><td class="text-rose-400">${d}</td><td class="text-emerald-400">${step.prev[n]}</td></tr>`;
        });
        html += `</table><div class="step-footer"><span class="text-slate-500">T:</span> { <span class="text-slate-300">${step.T.join(', ')}</span> }</div></div>`;
    });

    if (finalDist[end] !== undefined && finalDist[end] !== Infinity) {
        let path = [], curr = end;
        while (curr !== "null" && curr !== undefined) {
            path.unshift(curr);
            curr = finalPrev[curr];
        }
        html += `
            <div class="path-result">
                <span class="text-slate-400 text-xs uppercase tracking-widest block mb-2 font-bold">
                    <i class="fa-solid fa-route mr-1 text-rose-400"></i> เส้นทางที่สั้นที่สุด (Shortest Path)
                </span>
                <div class="text-2xl font-bold font-mono text-white tracking-wide">
                    ${path.join(' <span class="text-rose-400 text-lg">&rarr;</span> ')}
                </div>
                <div class="text-base text-cyan-300 font-mono mt-3 font-semibold">
                    ระยะทางรวม: <span class="text-white bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">${finalDist[end]}</span>
                </div>
            </div>`;
        highlightPathOnGraph(path);
    } else {
        html += `
            <div class="path-result" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.08);">
                <div class="text-amber-400 font-bold text-lg">ไม่พบเส้นทางที่เชื่อมต่อไปยังโหนด ${end}</div>
            </div>`;
    }

    document.getElementById('output-tables').innerHTML = html;
}

function renderPracticeUI(steps, allNodes) {
    let html = "";
    steps.forEach(step => {
        let nodeSubheader = "";
        if (step.round === 0) {
            nodeSubheader = `<div class="step-subheader text-slate-400">
                <span>เลือกโหนด:</span> 
                <span class="text-slate-400 font-mono font-medium px-2 py-0.5 rounded bg-slate-800/80 text-[11.5px] border border-slate-700/50">- (จุดเริ่มต้น)</span>
            </div>`;
        } else {
            nodeSubheader = `<div class="step-subheader">
                <span>เลือกโหนด:</span> 
                <input type="text" id="p_sel_${step.round}" class="prac-node-input" placeholder="?" maxlength="3" autocomplete="off" spellcheck="false">
            </div>`;
        }

        html += `
            <div class="step-card">
                <div class="step-header">
                    <i class="fa-solid fa-pen-nib text-cyan-400 text-xs"></i>
                    <span>รอบที่ ${step.round}</span>
                </div>
                ${nodeSubheader}
                <table class="step-table">
                    <thead>
                        <tr>
                            <th style="width: 28%;">v</th>
                            <th style="width: 36%;">dist</th>
                            <th style="width: 36%;">prev</th>
                        </tr>
                    </thead>
                    <tbody>`;
        allNodes.forEach(n => {
            html += `
                <tr>
                    <td class="font-bold text-slate-300 text-xs uppercase">${n}</td>
                    <td><input type="text" id="p_dist_${step.round}_${n}" class="prac-cell-input" placeholder="inf" autocomplete="off" spellcheck="false"></td>
                    <td><input type="text" id="p_prev_${step.round}_${n}" class="prac-cell-input" placeholder="null" autocomplete="off" spellcheck="false"></td>
                </tr>`;
        });
        html += `
                    </tbody>
                </table>
                <div class="step-footer">
                    <span class="text-slate-400 text-xs">T:</span> 
                    <span class="text-slate-500 font-mono text-xs">{</span>
                    <input type="text" id="p_T_${step.round}" class="prac-set-input" placeholder="a, b, c..." autocomplete="off" spellcheck="false">
                    <span class="text-slate-500 font-mono text-xs">}</span>
                </div>
            </div>`;
    });

    document.getElementById('output-tables').innerHTML = html;
    const practiceCtrl = document.getElementById('practice-controls');
    practiceCtrl.style.display = 'flex';
    practiceCtrl.classList.add('flex');
}

function checkAnswers() {
    let allNodes = nodes.getIds().map(x => x.toString().toLowerCase());
    let correctCount = 0;
    let totalCount = 0;

    globalStepsData.forEach(step => {
        if (step.round > 0) {
            let selInput = document.getElementById(`p_sel_${step.round}`);
            if (selInput) {
                totalCount++;
                if (checkMatch(selInput, step.selected)) correctCount++;
            }
        }

        allNodes.forEach(n => {
            let distInput = document.getElementById(`p_dist_${step.round}_${n}`);
            let prevInput = document.getElementById(`p_prev_${step.round}_${n}`);
            let expectDist = step.dist[n] === Infinity ? "inf" : step.dist[n].toString();
            let expectPrev = step.prev[n] === "null" ? "null" : step.prev[n];

            if (distInput) {
                totalCount++;
                if (checkMatch(distInput, expectDist)) correctCount++;
            }
            if (prevInput) {
                totalCount++;
                if (checkMatch(prevInput, expectPrev, true)) correctCount++;
            }
        });

        let tInput = document.getElementById(`p_T_${step.round}`);
        let expectT = step.T.join(',');
        if (tInput) {
            totalCount++;
            if (checkMatch(tInput, expectT, false, true)) correctCount++;
        }
    });

    if(correctCount === totalCount && totalCount > 0) {
        showToast(`ยอดเยี่ยมมาก! ถูกต้องทั้งหมด ${correctCount}/${totalCount} ช่อง 🎉`, 'success');
    } else {
        showToast(`ตรวจคำตอบเสร็จสิ้น: ถูกต้อง ${correctCount}/${totalCount} ช่อง`, correctCount > (totalCount * 0.7) ? 'warning' : 'info');
    }
}

function checkMatch(inputElement, expectedValue, isPrev = false, isSet = false) {
    let userVal = inputElement.value.trim().toLowerCase();
    let expectedVal = expectedValue.toLowerCase();

    let isCorrect = false;

    if (isSet) {
        let userTokens = userVal.split(',').map(s => s.trim()).filter(Boolean).sort();
        let expTokens = expectedVal.split(',').map(s => s.trim()).filter(Boolean).sort();
        if (userTokens.join(',') === expTokens.join(',')) {
            isCorrect = true;
        }
    } else if (isPrev) {
        if (expectedVal === "null" || expectedVal === "-") {
            if (userVal === "null" || userVal === "-" || userVal === "") isCorrect = true;
        } else {
            if (userVal === expectedVal) isCorrect = true;
        }
    } else {
        if (expectedVal === "inf" || expectedVal === "infinity") {
            if (userVal === "inf" || userVal === "infinity" || userVal === "∞") isCorrect = true;
        } else {
            if (userVal === expectedVal) isCorrect = true;
        }
    }

    inputElement.classList.remove('prac-input-correct', 'prac-input-error');
    inputElement.classList.add(isCorrect ? 'prac-input-correct' : 'prac-input-error');
    return isCorrect;
}

window.onload = initNetwork;
