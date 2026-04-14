# Homework 1.1 Design

## A. 领域对象如何被消费

View 层现在直接消费的是一个 store adapter，而不是直接改二维数组。

- 领域对象层：`src/domain/index.js`
  - `createSudoku(...)`：持有谜题盘面和当前盘面，提供 `guess`、`getInvalidCells`、`clone`、`toJSON`。
  - `createGame(...)`：持有当前 `Sudoku`，管理 `undoStack/redoStack`，提供 `guess`、`undo`、`redo`。
- 适配层：`src/node_modules/@sudoku/stores/game.js`
  - `domainGame` store 内部持有 `Game` 对象。
  - 对 UI 暴露响应式状态：`puzzleGrid`、`userGrid`、`invalidCells`、`canUndo`、`canRedo`、`gameWon`。
  - 对 UI 暴露命令：`startNew`、`startCustom`、`guess`、`undo`、`redo`。

UI 流程映射：

1. 开始新局：`startNew/startCustom` -> 创建 `Sudoku` + `Game`。
2. 界面渲染：`Board` 读取 `userGrid` / `puzzleGrid` / `invalidCells`。
3. 用户输入：键盘事件调用 `userGrid.set(...)`，其内部转发到 `domainGame.guess(...)`。
4. Undo / Redo：按钮调用 `domainGame.undo()` / `domainGame.redo()`。

## B. 响应式机制说明

本实现依赖 Svelte 3 的 store 机制。

- 领域对象本身不直接响应式；响应式边界在 `domainGame` 适配层。
- 每次 `guess/undo/redo/start` 后，适配层都会重新 `set` 一个新的快照对象（包含最新 grid 和状态）。
- 组件通过 `$store` 读取这些状态，所以会自动刷新。
- 如果改为“直接 mutate 领域对象内部数组但不触发 store.set”，Svelte 不知道引用变更，UI 可能不刷新或刷新时机错误。

## C. 相比 HW1 的改进

1. **职责边界更清晰**
   - `Sudoku` 负责单盘面状态和校验；
   - `Game` 负责历史和操作编排；
   - UI 不再承载核心规则。

2. **Undo/Redo 真正进入真实流程**
   - 不再只在测试中可用，界面按钮直接调用领域层能力。

3. **快照与序列化更统一**
   - `Game` 历史以 `Sudoku.toJSON()` 快照存储；
   - 支持 `createSudokuFromJSON` 和 `createGameFromJSON` 恢复。

Trade-off：

- 每次操作会创建新快照，内存开销高于原地修改；
- 但换来的是更稳定的响应式行为和更清晰的职责分层。
