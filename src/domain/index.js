const GRID_SIZE = 9;

function cloneGrid(grid) {
	return grid.map((row) => [...row]);
}

function assertGrid(grid) {
	if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
		throw new Error('Sudoku grid must be a 9x9 array.');
	}
	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== GRID_SIZE) {
			throw new Error('Sudoku grid must be a 9x9 array.');
		}
		for (const cell of row) {
			if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
				throw new Error('Sudoku cells must be integers in [0, 9].');
			}
		}
	}
}

function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new Error('Move must be an object.');
	}
	const { row, col, value } = move;
	if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
		throw new Error('Move row out of range.');
	}
	if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
		throw new Error('Move col out of range.');
	}
	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new Error('Move value out of range.');
	}
	return { row, col, value };
}

function computeInvalidCells(grid) {
	const invalid = new Set();
	const addInvalid = (row, col) => invalid.add(`${col},${row}`);

	for (let row = 0; row < GRID_SIZE; row++) {
		for (let col = 0; col < GRID_SIZE; col++) {
			const value = grid[row][col];
			if (!value) {
				continue;
			}

			for (let i = 0; i < GRID_SIZE; i++) {
				if (i !== col && grid[row][i] === value) {
					addInvalid(row, col);
					addInvalid(row, i);
				}
				if (i !== row && grid[i][col] === value) {
					addInvalid(row, col);
					addInvalid(i, col);
				}
			}

			const startRow = Math.floor(row / 3) * 3;
			const startCol = Math.floor(col / 3) * 3;
			for (let r = startRow; r < startRow + 3; r++) {
				for (let c = startCol; c < startCol + 3; c++) {
					if ((r !== row || c !== col) && grid[r][c] === value) {
						addInvalid(row, col);
						addInvalid(r, c);
					}
				}
			}
		}
	}

	return [...invalid];
}

function createSudokuCore({ puzzleGrid, currentGrid }) {
	const puzzle = cloneGrid(puzzleGrid);
	let grid = cloneGrid(currentGrid);

	return {
		getGrid() {
			return cloneGrid(grid);
		},

		getPuzzleGrid() {
			return cloneGrid(puzzle);
		},

		guess(move) {
			const { row, col, value } = normalizeMove(move);
			if (puzzle[row][col] !== 0) {
				return false;
			}
			if (grid[row][col] === value) {
				return false;
			}
			grid[row][col] = value;
			return true;
		},

		getInvalidCells() {
			return computeInvalidCells(grid);
		},

		isSolved() {
			for (let row = 0; row < GRID_SIZE; row++) {
				for (let col = 0; col < GRID_SIZE; col++) {
					if (grid[row][col] === 0) {
						return false;
					}
				}
			}
			return this.getInvalidCells().length === 0;
		},

		clone() {
			return createSudokuCore({
				puzzleGrid: puzzle,
				currentGrid: grid,
			});
		},

		toJSON() {
			return {
				puzzle: cloneGrid(puzzle),
				grid: cloneGrid(grid),
			};
		},

		toString() {
			return grid
				.map((row) => row.map((n) => (n === 0 ? '.' : String(n))).join(' '))
				.join('\n');
		},
	};
}

export function createSudoku(inputGrid) {
	assertGrid(inputGrid);
	return createSudokuCore({
		puzzleGrid: inputGrid,
		currentGrid: inputGrid,
	});
}

export function createSudokuFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Invalid sudoku json.');
	}
	assertGrid(json.puzzle);
	assertGrid(json.grid);
	return createSudokuCore({
		puzzleGrid: json.puzzle,
		currentGrid: json.grid,
	});
}

function createGameCore({ sudoku, undoStack = [], redoStack = [] }) {
	let currentSudoku = sudoku;
	let past = [...undoStack];
	let future = [...redoStack];

	return {
		getSudoku() {
			return currentSudoku;
		},

		guess(move) {
			const before = currentSudoku.toJSON();
			const changed = currentSudoku.guess(move);
			if (!changed) {
				return false;
			}
			past.push(before);
			future = [];
			return true;
		},

		undo() {
			if (!past.length) {
				return false;
			}
			future.push(currentSudoku.toJSON());
			const previous = past.pop();
			currentSudoku = createSudokuFromJSON(previous);
			return true;
		},

		redo() {
			if (!future.length) {
				return false;
			}
			past.push(currentSudoku.toJSON());
			const next = future.pop();
			currentSudoku = createSudokuFromJSON(next);
			return true;
		},

		canUndo() {
			return past.length > 0;
		},

		canRedo() {
			return future.length > 0;
		},

		toJSON() {
			return {
				sudoku: currentSudoku.toJSON(),
				undoStack: past.map((entry) => ({
					puzzle: cloneGrid(entry.puzzle),
					grid: cloneGrid(entry.grid),
				})),
				redoStack: future.map((entry) => ({
					puzzle: cloneGrid(entry.puzzle),
					grid: cloneGrid(entry.grid),
				})),
			};
		},
	};
}

export function createGame({ sudoku }) {
	if (!sudoku || typeof sudoku.getGrid !== 'function' || typeof sudoku.toJSON !== 'function') {
		throw new Error('createGame requires a sudoku domain object.');
	}
	return createGameCore({ sudoku });
}

export function createGameFromJSON(json) {
	if (!json || typeof json !== 'object' || !json.sudoku) {
		throw new Error('Invalid game json.');
	}

	const undoStack = Array.isArray(json.undoStack) ? json.undoStack : [];
	const redoStack = Array.isArray(json.redoStack) ? json.redoStack : [];

	for (const entry of [...undoStack, ...redoStack]) {
		assertGrid(entry.puzzle);
		assertGrid(entry.grid);
	}

	return createGameCore({
		sudoku: createSudokuFromJSON(json.sudoku),
		undoStack,
		redoStack,
	});
}
