// danh sach cong viec du kien:
// 1. Populate a board with tiles/mines (done)
// 2. Left click on the titles
// a. reveal titles (Done)
// 3. Right click on titles
// a. Mark tiles (Partially done)
// b. Decrease the number of mines left on the display (done)
// 4. check for win/lose (Partially Done)
// 5. Make the first move to be always safe

const TILE_STATUSES = {
    HIDDEN: "hidden",
    MINE: "mine",
    NUMBER: "number",
    MARKED: "marked",
};

// varialbles declaration
let boardSize;
let NUMBER_OF_MINES;

let win;
let lose;
let gameHasEnded;

let board;
let boardElement;
const minesLeftText = document.querySelector("[data-mine-count]");
const messageText = document.querySelector(".subtext");
const moveHistory = [];
const thisClickHistory = [];

const startSound = new Audio("/sfx/Among-Us-Role-Reveal-Sound-Effect.mp3");
startSound.volume = 0.5;
const lostSound = new Audio("/sfx/Among-Us-Reporting-Body-Sound-Affect.mp3");
lostSound.volume = 0.5;

// initialize the game, the first move will always safe
start();

// change the board size
let data;
const dropdown = document.getElementById("board-size");
dropdown.addEventListener("change", (e) => {
    data = e.target.value;
    console.log(data);
    switch (data) {
        case "0x0":
            boardSize = 8;
            NUMBER_OF_MINES = 15;
            break;
        case "8x8":
            boardSize = 8;
            NUMBER_OF_MINES = 15;
            break;
        case "16x16":
            boardSize = 16;
            NUMBER_OF_MINES = 40;
            break;
        case "20x20":
            boardSize = 20;
            NUMBER_OF_MINES = 65;
            break;
    }

    localStorage.setItem("boardSize", boardSize);
    localStorage.setItem("numberOfMines", NUMBER_OF_MINES);

    board = createBoard(boardSize, NUMBER_OF_MINES);
    boardElement = document.querySelector(".board");
    minesLeftText.textContent = NUMBER_OF_MINES;

    render(board, boardElement, boardSize);
    checkGameEnd(board);
    window.location.reload();
});

function start() {
    const savedBoardSize = parseInt(localStorage.getItem("boardSize"));
    const savedNumberOfMines = parseInt(localStorage.getItem("numberOfMines"));
    if (savedBoardSize) {
        boardSize = savedBoardSize;
    } else {
        boardSize = 8;
    }
    if (savedNumberOfMines) {
        NUMBER_OF_MINES = savedNumberOfMines;
    } else {
        NUMBER_OF_MINES = 15;
    }

    win = false;
    lose = false;
    gameHasEnded = false;

    board = createBoard(boardSize, NUMBER_OF_MINES);
    boardElement = document.querySelector(".board");
    minesLeftText.textContent = NUMBER_OF_MINES;

    generate(board, boardElement, boardSize);
}

// generate the board
function generate(board, boardElement, boardSize) {
    startSound.play();
    board.forEach((row) => {
        row.forEach((tile) => {
            boardElement.append(tile.element);
            if (!gameHasEnded) {
                tile.element.addEventListener("click", () => {
                    revealTile(board, tile);
                    addMoveHistory();
                    checkGameEnd(board);
                });
            }
            if (!gameHasEnded) {
                tile.element.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    markTile(tile);
                    listMinesLeft(board);
                });
            }
        });
    });
    boardElement.style.setProperty("--size", boardSize);
}

// re-render the board
function render(board, boardElement, boardSize) {
    startSound.pause();
    lostSound.pause();
    document.getElementById("board").innerText = ""; // delete the old board
    messageText.textContent = "Mines left: " + minesLeftText.textContent;
    // render the new board
    generate(board, boardElement, boardSize);
}

// function to create the board
function createBoard(boardSize, numberOfMines) {
    const board = [];
    const minePositions = getMinePositions(boardSize, numberOfMines);

    for (let x = 0; x < boardSize; x++) {
        const row = [];

        for (let y = 0; y < boardSize; y++) {
            const element = document.createElement("div");
            element.dataset.status = TILE_STATUSES.HIDDEN;

            const tile = {
                element,
                x,
                y,
                mine: minePositions.some(positionMatch.bind(null, { x, y })),
                get status() {
                    return this.element.dataset.status;
                },
                set status(value) {
                    this.element.dataset.status = value;
                },
            };

            row.push(tile);
        }
        board.push(row);
    }

    return board;
}

const resetButton = document.getElementById("reset-button");
resetButton.addEventListener("click", () => {
    location.reload();
});

const undoButton = document.getElementById("undo-button");
undoButton.addEventListener("click", undoMove);

function markTile(tile) {
    if (
        tile.status !== TILE_STATUSES.HIDDEN &&
        tile.status !== TILE_STATUSES.MARKED
    ) {
        return;
    }

    const statusBefore = tile.status;
    const contentBefore = tile.element.textContent;

    if (tile.status === TILE_STATUSES.MARKED) {
        tile.status = TILE_STATUSES.HIDDEN;
    } else {
        tile.status = TILE_STATUSES.MARKED;
    }

    // Add the move to the moveHistory array
    moveHistory.push({ tile, statusBefore, contentBefore });
}

function revealTile(board, tile) {
    if (tile.status !== TILE_STATUSES.HIDDEN) {
        return;
    }

    const statusBefore = tile.status;
    const contentBefore = tile.element.textContent;

    // Check if it's the first move
    const isFirstMove =
        moveHistory.length === 0 && thisClickHistory.length === 0;

    if (isFirstMove && tile.mine) {
        // If the first move is a mine, regenerate the board
        regenerateBoard(board, tile);
        return;
    }

    tile.status = TILE_STATUSES.NUMBER;
    const nearbyTiles = adjacentTiles(board, tile);
    const mines = nearbyTiles.filter((t) => t.mine);
    thisClickHistory.push({ tile, statusBefore, contentBefore });

    if (tile.mine) {
        tile.status = TILE_STATUSES.MINE;
        return;
    }

    if (mines.length === 0) {
        nearbyTiles.forEach(revealTile.bind(null, board));
    } else {
        tile.element.textContent = mines.length;
    }
}

// Function to regenerate the board if the first move is a mine
function regenerateBoard(board, firstMineTile) {
    const x = firstMineTile.x;
    const y = firstMineTile.y;

    // Remove the mine from the first clicked tile
    firstMineTile.mine = false;

    // Find a new position for the mine
    let newMinePosition;
    do {
        newMinePosition = getMinePositions(1)[0];
    } while (newMinePosition.x === x && newMinePosition.y === y);

    // Set the mine in the new position
    const newMineTile = board[newMinePosition.x][newMinePosition.y];
    newMineTile.mine = true;

    // Reveal the new position
    revealTile(board, newMineTile);
}

// Add the move to the moveHistory array
function addMoveHistory() {
    let copy = [...thisClickHistory];
    moveHistory.push(copy);
    thisClickHistory.splice(0, thisClickHistory.length);
}

// function to calculate the number of bombs surround the square
function adjacentTiles(board, { x, y }) {
    const tiles = [];

    for (let xOff = -1; xOff <= 1; xOff++) {
        //nearby postions on left and right
        for (let yOff = -1; yOff <= 1; yOff++) {
            //nearby positions upper and bellow
            const tile = board[x + xOff]?.[y + yOff];
            if (tile) {
                tiles.push(tile);
            }
        }
    }

    return tiles;
}

// display the number of mine left
function listMinesLeft(board) {
    const markedTilesCount = board.reduce((count, row) => {
        return (
            count +
            row.filter((tile) => tile.status === TILE_STATUSES.MARKED).length
        );
    }, 0);

    minesLeftText.textContent = NUMBER_OF_MINES - markedTilesCount;
    messageText.textContent = "Mines left: " + minesLeftText.textContent;
}

//function to generate Mines positions
function getMinePositions(boardSize, bombAmount) {
    const positions = [];

    //Loop until enough Mines
    while (positions.length < bombAmount) {
        const position = {
            x: random(boardSize),
            y: random(boardSize),
        };

        if (!positions.some((p) => positionMatch(p, position))) {
            positions.push(position);
        }
    }

    return positions;
}

//return true if the two positions are the same
function positionMatch(a, b) {
    return a.x === b.x && a.y === b.y;
}

//return a random integer
function random(size) {
    return Math.floor(Math.random() * size);
}

//Thắng
function checkWin(board) {
    return board.every((row) => {
        return row.every((tile) => {
            return (
                tile.status === TILE_STATUSES.NUMBER ||
                (tile.mine && // Nói tóm gọn là nếu số mìn bị dấu = số mìn ban đầu khi đã hết lượt bấm thì thắng
                    (tile.status === TILE_STATUSES.HIDDEN ||
                        tile.status === TILE_STATUSES.MARKED))
            );
        });
    });
}

//Thua
function checkLose(board) {
    return board.some((row) => {
        return row.some((tile) => {
            return tile.status === TILE_STATUSES.MINE; //Có mìn thì thua
        });
    });
}

//function to check game is over
function checkGameEnd(board) {
    win = checkWin(board);
    lose = checkLose(board);
    //Ngăn người dùng thao tác thêm
    if (win || lose) {
        boardElement.addEventListener("click", stop, { capture: true });
        boardElement.addEventListener("contextmenu", stop, { capture: true });
        gameHasEnded = true;
    }
    //Thắng
    if (win) {
        messageText.textContent = "You Win !!!";
        window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }
    //Thua
    else if (lose) {
        startSound.pause();
        messageText.textContent = "You Lost :<<";
        lostSound.play();
    }
}

function stop(e) {
    e.stopPropagation();
}

//Reset cái page lại
function resetGame() {
    location.reload();
}

function undoMove() {
    if (moveHistory.length === 0 || gameHasEnded) {
        gameHasEnded = false;
        win = false;
        lose = false;
        listMinesLeft(board);
        boardElement.removeEventListener("click", stop, { capture: true });
        boardElement.removeEventListener("contextmenu", stop, {
            capture: true,
        });
    }

    const lastMove = moveHistory.pop();

    while (lastMove) {
        const { tile, statusBefore, contentBefore } = lastMove.pop();
        tile.status = statusBefore;
        tile.element.textContent = contentBefore;
    }
    // Check game end after undoing the move
    checkGameEnd(board);
}
