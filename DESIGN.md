# Homework 1.1 Design

## A. 领域对象如何被消费

View 层现在直接消费的是一个 store adapter，而不是直接改二维数组。

- 领域对象层：`src/domain/index.js`
  - `createSudoku(...)`：持有谜题盘面和当前盘面，提供 `guess`、`getInvalidCells`、`isSolved`、`clone`、`toJSON`、`toString`。
  - `createGame(...)`：持有当前 `Sudoku`，管理 `undoStack/redoStack`，提供 `guess`、`undo`、`redo`。
- 适配层：`src/node_modules/@sudoku/stores/game.js`
  - `domainGame` store 内部持有 `Game` 对象。
  - 对 UI 暴露响应式状态：`puzzleGrid`、`userGrid`、`invalidCells`、`canUndo`、`canRedo`、`gameWon` (直接映射 domain 的 `isSolved`)。
  - 对 UI 暴露命令：`startNew`、`startCustom`、`guess`、`undo`、`redo`。

UI 流程映射：

1. 开始新局：`startNew/startCustom` -> 创建 `Sudoku` + `Game`。
2. 界面渲染：`Board` 读取 `userGrid` / `puzzleGrid` / `invalidCells`。
3. 用户输入：键盘事件调用 `userGrid.set(...)`，其内部转发到 `domainGame.guess(...)`。
4. Undo / Redo：按钮调用 `domainGame.undo()` / `domainGame.redo()`。
5. 游戏结束：`App.svelte` 订阅 `gameWon`，当其为 true 时显示 GameOver modal。

## B. 响应式机制说明

本实现依赖 Svelte 3 的 store 机制：

- **适配层驱动**：领域对象本身不直接响应式。响应式边界在 `domainGame` 适配层。
- **不可变性快照**：每次 `guess/undo/redo/start` 后，适配层都会重新 `set` 一个新的快照对象（包含最新 grid 和状态）。
- **响应式链条**：
  - `domainGame` (writable store) 变化 -> 触发所有 `derived` stores 更新。
  - 组件通过 `$store` 语法订阅这些 derived stores。
  - Svelte 3 的 `$store` 机制会自动处理订阅与取消订阅，并在值变更时触发组件重绘。
- **直接 Mutate 的后果**：如果改为“直接 mutate 领域对象内部数组但不触发 store.set”，Svelte 的引用检查会认为数据没变，从而不触发 UI 刷新。

## C. 相比 HW1 的改进

1. **职责边界更清晰**
   - `Sudoku` 负责单盘面状态和校验（包括 `isSolved`）；
   - `Game` 负责历史和操作编排；
   - UI 不再承载核心规则逻辑（如检查游戏是否胜利）。

2. **Undo/Redo 历史存储优化**
   - 改进了 snapshot 策略：`Game` 历史中仅存储 `grid` 数据，而不是完整的 `Sudoku` 快照。因为 `puzzle` 是常量，这样可以显著减少内存占用。

3. **领域对象深度集成**
   - 界面中的 `gameWon` 逻辑现在直接消费 `Sudoku.isSolved()`，确保领域模型是真相的唯一来源。
   - `toString()` 改进为更美观的棋盘格式，方便调试。

Trade-off：

- 每次操作会创建新快照对象并触发 store 更新，内存开销略高于原地修改，但对于 9x9 数独来说几乎无感。
- 换来的是更稳定的响应式行为和更清晰的职责分层。
