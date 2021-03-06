import { GridSelector } from '../constants';
import keycode from 'keycode';
import tabbable from 'tabbable';

// ie
if (global.Element && !Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector;
}

if (typeof NodeList !== 'undefined' && NodeList.prototype && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

export default class GridManager {
    constructor(options = {}) {
        this.attachTo(options);
    }

    attachTo({
        gridNode = null,
        firstFocusedElement = null, // first DOM element to be focused, if it exists in the grid. Takes priority over firstFocusedCoordinates
        firstFocusedCoordinates = { row: 0, col: 0 }, // first coordinates in the grid to attempt to focus
        firstCellSearchDirection = { directionX: 0, directionY: 0 }, // direction to search for an initial cell if provided coordinates are invalid
        enableHeaderCells = true,
        focusOnInit = false,
        wrapRows = false,
        wrapCols = false,
        onFocusCell = () => {},
        onPassBoundary = () => {},
        onToggleEditMode = () => {},
        disabledCells = []
    }) {
        if (gridNode) {
            this.gridNode = gridNode;
            this.enableHeaderCells = enableHeaderCells;
            this.cellSelector = `${GridSelector.CELL}, ${this.enableHeaderCells && GridSelector.HEADER}`;
            this.wrapRows = wrapRows;
            this.wrapCols = wrapCols;
            this.onFocusCell = onFocusCell;
            this.onPassBoundary = onPassBoundary;
            this.onToggleEditMode = onToggleEditMode;
            this.disabledCells = disabledCells;
            this.focusedRow = 0;
            this.focusedCol = 0;
            this.editMode = false;
            this.setupFocusGrid();

            if (this.grid.length) {
                let firstFocusedCell = firstFocusedElement ? this.getCellProperties(firstFocusedElement) : {
                    row: firstFocusedCoordinates.row,
                    col: firstFocusedCoordinates.col,
                    element: this.grid[firstFocusedCoordinates.row] ?
                        this.grid[firstFocusedCoordinates.row][firstFocusedCoordinates.col] : null
                };

                if (!this.isValidCell(firstFocusedCell) || this.isDisabledCell(firstFocusedCell.element)) {
                    firstFocusedCell = this.getNextCell(
                        firstFocusedCell,
                        firstCellSearchDirection.directionX,
                        firstCellSearchDirection.directionY
                    );
                }

                if (firstFocusedCell) {
                    this.setFocusPointer(firstFocusedCell.row, firstFocusedCell.col);

                    if (focusOnInit) {
                        this.focusCell(firstFocusedCell);
                    }

                    this.registerEvents();
                }
            }
        }
    }

    setupFocusGrid = () => {
        this.grid = [];

        this.gridNode && Array.prototype.forEach.call(
            this.gridNode.querySelectorAll(GridSelector.ROW), (row) => {
                const rowCells = [];

                Array.prototype.forEach.call(
                    row.querySelectorAll(this.cellSelector), (cell) => {
                        let colSpan = cell.colSpan;
                        cell.setAttribute('tabindex', -1);
                        cell.addEventListener('focus', this.handleFocusCell);

                        colSpan > 0 ? rowCells.push(...this.createFilledArray(colSpan, cell)) : rowCells.push(cell);
                    }
                );

                if (rowCells.length) {
                    this.grid.push(rowCells);
                }
            }
        );
        this.toggleTabbableElements(false);
    };

    createFilledArray = (length, value) => {
        const array = [];
        while (length--) {
            array.push(value);
        }
        return array;
    }

    clearEvents = () => {
        this.gridNode.removeEventListener('keydown', this.handleKeyDown);
        this.gridNode.removeEventListener('mouseup', this.handleClickCell);
    };

    registerEvents = () => {
        this.clearEvents();
        this.gridNode.addEventListener('keydown', this.handleKeyDown);
        this.gridNode.addEventListener('mouseup', this.handleClickCell);
    };

    getCellProperties = (element, knownCoordinates) => {
        const cellCoordinates = knownCoordinates ? knownCoordinates : this.getCellCoordinates(element);
        let cell;
        if (cellCoordinates) {
            cell = {
                row: cellCoordinates.row,
                col: cellCoordinates.col,
                element: element
            };
            if (element) {
                cell.focusableElements = cell.element.querySelectorAll(GridSelector.FOCUSABLE);
                cell.editableElement = cell.element.querySelector(GridSelector.EDITABLE);
            }
        }

        return cell;
    }

    getCellCoordinates = (element) => {
        for (let row = 0; row < this.grid.length; row++) {
            for (let col = 0; col < this.grid[row].length; col++) {
                if (element && (
                    this.grid[row][col] === element ||
                    this.grid[row][col].contains(element) ||
                    element.contains(this.grid[row][col])
                )) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    getCurrentCellProperties = () => {
        return this.getCellProperties(
            this.grid[this.focusedRow][this.focusedCol],
            { row: this.focusedRow, col: this.focusedCol }
        );
    }

    setFocusPointer = (row, col) => {
        if (this.isValidCell({ row, col })) {
            const currentCellElement = this.grid[this.focusedRow][this.focusedCol];
            const nextCellElement = this.grid[row][col];

            currentCellElement.setAttribute('tabindex', -1);
            nextCellElement.setAttribute('tabindex', 0);

            this.focusedRow = row;
            this.focusedCol = col;
        }
    };

    isValidCell = ({ row, col }) => {
        return (
            !isNaN(row) &&
            !isNaN(col) &&
            row >= 0 &&
            col >= 0 &&
            this.grid &&
            this.grid.length &&
            row < this.grid.length &&
            col < this.grid[row].length
        );
    };

    isDisabledCell(element) {
        let isDisabled = false;
        this.disabledCells.forEach((cell) => {
            if (cell.contains(element)) {
                isDisabled = true;
            }
        });

        return isDisabled;
    }

    isEditableCell = ({ focusableElements, editableElement }) => {
        return (focusableElements?.length > 1 || editableElement);
    }

    focusCell = (currentCell, event) => {
        const { row, col, element, focusableElements } = currentCell;
        this.setFocusPointer(row, col);
        const posX = window.pageXOffset;
        const posY = window.pageYOffset;

        if (this.editMode) {
            element.setAttribute('tabindex', -1);
            // only redirect focus upon clicking or entering edit mode on table cell element
            if (event.target === element) {
                focusableElements[0]?.focus();
            }
        } else {
            element.focus();
        }

        window.scrollTo(posX, posY);
        this.onFocusCell(currentCell, event);
    };

    handleFocusCell = (event) => {
        if (event.target.matches && event.target.matches(this.cellSelector)) {
            const { focusableElements } = this.getCellProperties(event.target);
            if (
                focusableElements?.length === 1 &&
                !focusableElements[0].matches(GridSelector.EDITABLE)
            ) {
                focusableElements[0].focus();
            }
        }
    }

    toggleEditMode = (currentCell, enable) => {
        this.editMode = !!enable;
        currentCell.element.setAttribute('tabindex', enable ? -1 : 0);
        this.toggleTabbableElements(enable);
        this.onToggleEditMode(enable);
    }

    toggleTabbableElements = (enable) => {
        let focusableElements = [];
        const cells = this.gridNode.querySelectorAll(this.cellSelector);
        cells.forEach(cell => {
            focusableElements = [...focusableElements, ...cell.querySelectorAll(GridSelector.FOCUSABLE)];
        });

        if (focusableElements.length) {
            focusableElements.forEach(element => {
                element.setAttribute('tabindex', enable ? 0 : -1);
            });
        }
    }

    handleKeyDown = (event) => {
        this.syncFocusPointerToActiveElement(event.target);

        const key = event.which || event.keyCode;
        const currentCell = this.getCurrentCellProperties();

        let nextCell = currentCell;
        let pressedArrowKey = false;

        switch (key) {
            case keycode.codes.up:
                nextCell = this.getNextCell(currentCell, 0, -1);
                pressedArrowKey = true;
                break;
            case keycode.codes.down:
                nextCell = this.getNextCell(currentCell, 0, 1);
                pressedArrowKey = true;
                break;
            case keycode.codes.left:
                nextCell = this.getNextCell(currentCell, -1, 0);
                pressedArrowKey = true;
                break;
            case keycode.codes.right:
                nextCell = this.getNextCell(currentCell, 1, 0);
                pressedArrowKey = true;
                break;
            case keycode.codes.home:
                nextCell = this.getNextCell(
                    this.getCellProperties(
                        this.grid[this.focusedRow][this.grid[this.focusedRow].length],
                        { row: this.focusedRow, col: -1 }
                    ), 1, 0
                );
                break;
            case keycode.codes.end:
                nextCell = this.getNextCell(
                    this.getCellProperties(
                        this.grid[this.focusedRow][this.grid[this.focusedRow].length],
                        { row: this.focusedRow, col: this.grid[this.focusedRow].length }
                    ), -1, 0
                );
                break;
            case keycode.codes.enter:
                if (event.target.matches(this.cellSelector)) {
                    event.preventDefault();
                }
                if (this.isEditableCell(currentCell) && !event.target.matches(GridSelector.HAS_ENTER_KEY_HANDLING)) {
                    this.toggleEditMode(currentCell, !this.editMode);
                }
                if (!this.editMode) {
                    nextCell = this.getParentCell(event.target);
                }
                break;
            case keycode.codes.esc:
                this.toggleEditMode(currentCell, false);
                nextCell = this.getParentCell(event.target);
                break;
            case keycode.codes.tab:
                if (!this.editMode) {
                    const nextElement = this.getNextOutsideTabbableElement(event.shiftKey);
                    nextElement?.focus();
                    event.preventDefault();
                }
                return;
            default:
                return;
        }

        if (nextCell) {
            this.focusCell(nextCell, event);
        }

        if (!this.editMode && pressedArrowKey) {
            event.preventDefault();
        }
    };

    syncFocusPointerToActiveElement = (focusedTarget) => {
        const focusedCell = this.getCellProperties(
            this.grid[this.focusedRow][this.focusedCol],
            { row: this.focusedRow, col: this.focusedCol }
        ).element;

        if (focusedCell === focusedTarget || focusedCell.contains(focusedTarget)) {
            return;
        }

        this.setFocusPointer(focusedCell.row, focusedCell.col);
    };

    handleClickCell = (event) => {
        // reset current edit state
        const currentCell = this.getCurrentCellProperties();

        if (this.isEditableCell(currentCell) && this.editMode) {
            this.toggleEditMode(currentCell, false);
        }

        const clickedGridCell = this.getParentCell(event.target);

        if (this.isEditableCell(clickedGridCell)) {
            this.toggleEditMode(clickedGridCell, true);
        }

        if (clickedGridCell) {
            this.focusCell({
                row: clickedGridCell.row,
                col: clickedGridCell.col,
                element: clickedGridCell.element,
                focusableElements: clickedGridCell.focusableElements,
                editableElement: clickedGridCell.editableElement
            }, event);
        }
    };

    didPassBoundary = (rowLength, candidateRow, candidateCol, directionX, directionY) => {
        if (directionX === -1) {
            return (
                (candidateRow < 0) ||
                (!this.wrapRows && (candidateCol < 0))
            );
        } else if (directionX === 1) {
            return (
                (candidateRow >= this.grid.length) ||
                (!this.wrapRows && (candidateCol >= rowLength))
            );
        } else if (directionY === -1) {
            return (
                (candidateCol < 0) ||
                (!this.wrapCols && (candidateRow < 0))
            );
        } else if (directionY === 1) {
            return (
                (candidateCol >= rowLength) ||
                (!this.wrapCols && (candidateRow >= this.grid.length))
            );
        }
        return false;
    }

    getNextCell = (currentCell, directionX, directionY) => {
        // directionX: 1 = right, -1 = left
        // directionY: 1 = down, -1 = up

        if (this.editMode) {
            return null;
        }

        let nextCellElement = currentCell;

        if (directionX !== 0) { // horizontal
            let candidateRow = currentCell.row;
            let candidateCol = currentCell.col;
            do {
                candidateCol += directionX;

                if (candidateRow > this.grid.length - 1) {
                    candidateRow = this.grid.length - 1;
                }

                let rowLength = this.grid[candidateRow].length;

                if (this.wrapRows) {
                    if (directionX === 1 && candidateCol >= rowLength) {
                        candidateRow++;
                        candidateCol = 0;
                    } else if (directionX === -1 && candidateCol < 0) {
                        candidateRow--;
                        candidateCol = rowLength - 1;
                    }
                }

                if (this.didPassBoundary(rowLength, candidateRow, candidateCol, directionX, directionY)) {
                    this.onPassBoundary({ currentCell, directionX, directionY });

                    return null;
                }
            } while (
                !this.isValidCell({ row: candidateRow, col: candidateCol }) ||
                this.isDisabledCell(this.grid[candidateRow][candidateCol]) ||
                this.grid[candidateRow][candidateCol] === currentCell.element
            );

            nextCellElement = this.getCellProperties(
                this.grid[candidateRow][candidateCol],
                { row: candidateRow, col: candidateCol }
            );
        } else if (directionY !== 0) { // vertical
            let candidateRow = currentCell.row;
            let candidateCol = currentCell.col;
            do {
                candidateRow += directionY;

                let rowLength = this.grid[currentCell.row] ? this.grid[currentCell.row].length : 0;

                if (this.wrapCols) {
                    if (directionY === 1 && candidateRow >= this.grid.length) {
                        candidateCol++;
                        candidateRow = 0;
                    } else if (directionY === -1 && candidateRow < 0) {
                        candidateCol--;
                        candidateRow = this.grid.length - 1;
                    }
                }

                if (this.didPassBoundary(rowLength, candidateRow, candidateCol, directionX, directionY)) {
                    this.onPassBoundary({ currentCell, directionX, directionY });

                    return null;
                }
            } while (
                !this.isValidCell({ row: candidateRow, col: candidateCol }) ||
                this.isDisabledCell(this.grid[candidateRow][candidateCol]) ||
                this.grid[candidateRow][candidateCol] === currentCell.element
            );

            nextCellElement = this.getCellProperties(
                this.grid[candidateRow][candidateCol],
                { row: candidateRow, col: candidateCol }
            );
        }

        return {
            row: nextCellElement.row,
            col: nextCellElement.col,
            element: nextCellElement.element,
            focusableElements: nextCellElement.focusableElements,
            editableElement: nextCellElement.editableElement
        };
    };

    getNextOutsideTabbableElement = (shiftKey) => {
        const tabbableElements = tabbable(document);
        let nextElement;

        tabbableElements.forEach((element, index) => {
            if (element.contains(document.activeElement)) {
                let currIndex = index;
                while (
                    currIndex >= 0 &&
                    currIndex < tabbableElements.length &&
                    this.gridNode.contains(tabbableElements[currIndex])
                ) {
                    currIndex += shiftKey ? -1 : 1;
                }
                nextElement = tabbableElements[currIndex];
            }
        });
        return nextElement;
    }

    getParentCell = (element) => {
        return this.getCellProperties(this.findClosestMatch(element, this.cellSelector));
    }

    findClosestMatch = (element, selector) => {
        if (element.matches && element.matches(selector)) {
            return element;
        }

        if (element.parentNode) {
            return this.findClosestMatch(element.parentNode, selector);
        }

        return null;
    };
}
