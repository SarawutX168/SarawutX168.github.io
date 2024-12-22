const playgrid = document.getElementById('playgrid');
const infostatus = document.getElementById('infostatus');
const selectModeDiv = document.getElementById('SelectMode');
const botdifficultyDiv = document.getElementById('botdifficulty');
const selectGameModeButton = document.querySelectorAll('.btnGamemode');
const selectModeButton = document.querySelectorAll('.btnmode');
const botdifficultyButtons = document.querySelectorAll('.btndifficulty');
const btnReset = document.getElementById('btnreset');
const botButton = document.querySelector('.btnmode[data-mode="pwb"]');
botButton.disabled = true;

let board = Array(9).fill(null);
let currentPlayer = "X";
let isBot = false;
let whoWin = null;
infostatus.textContent = "Select Game Mode";

const patternWin = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

selectGameModeButton.forEach(button => {
    button.addEventListener('click', () => {
        selectModeDiv.style.display = "block";
        disableBoard()
    });
});

selectModeButton.forEach(button => {
    button.addEventListener('click', () => {
        selectModeButton.forEach(btn => btn.classList.remove('selectedbtnm'));
        button.classList.add('selectedbtnm');
        const selectedMode = button.getAttribute('data-mode');
        isBot = selectedMode === "pwb";
        console.log("Is Bot Mode:", isBot);
        selectModeDiv.style.display = "none";

        playgrid.style.display = "gird";
        if (isBot) {
            botdifficultyDiv.style.display = "block";
        } else {
            startNewGame();


        }
    });
});

botdifficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        botdifficultyButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        botdifficultyDiv.style.display = "none";
        startNewGame();
    });
});

function startNewGame() {
    board = Array(9).fill(null);
    currentPlayer = "X";
    whoWin = null;
    infostatus.textContent = "X Turn";
    createGrid();
}

function createGrid() {
    playgrid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const div = document.createElement("div");
        div.classList.add("box");
        div.setAttribute("data-index", i);
        div.addEventListener("click", handleCellClick);
        playgrid.appendChild(div);
    }
}

function handleCellClick(e) {
    const index = e.target.getAttribute("data-index");
    if (board[index] || whoWin) return;

    board[index] = currentPlayer;
    e.target.textContent = currentPlayer;
    e.target.classList.add(currentPlayer === "X" ? "mark_x" : "mark_o");

    checkWin();
    if (!whoWin) {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        infostatus.textContent = `${currentPlayer} Turn`;
    }
}

function checkWin() {
    patternWin.forEach(patt => {
        const [a, b, c] = patt;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            whoWin = board[a];
            infostatus.textContent = `${whoWin} Wins!`;
            highlightWinningCells(patt);
            disableBoard();
            return;
        }
    });

    if (board.every(cell => cell !== null) && !whoWin) {
        whoWin = "Draw";
        infostatus.textContent = "Draw!";
        disableBoard();
        makeAllCellsBlue();
    }
}

function highlightWinningCells(patt) {
    patt.forEach(index => {
        const box = document.querySelector(`[data-index='${index}']`);
        box.style.backgroundColor = '#4CAF50';
    });
}

function makeAllCellsBlue() {
    const allDivs = document.querySelectorAll(".box");
    allDivs.forEach(div => {
        div.style.backgroundColor = 'blue';
    });
}

function disableBoard() {
    const allDiv = document.querySelectorAll(".box");
    allDiv.forEach(d => {
        d.removeEventListener("click", handleCellClick);
        d.style.pointerEvents = 'none';
    });
}
