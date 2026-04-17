# con-oo-muxue0915-1 - Review

## Review 结论

代码已经完成了“领域对象通过 store adapter 接入 Svelte 主流程”的核心目标：开始新局、界面渲染、用户输入、Undo/Redo 都能走到 `Game`/`Sudoku`。但从设计质量看，`Game` 的封装边界仍然偏松，部分数独业务规则还停留在 Svelte adapter 层，说明领域模型已经可用，但还没有完全成为唯一可信的业务核心。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. adapter 把 live Game 暴露给了 view

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/game.js:17-26
- 原因：`snapshotState()` 直接把 `game` 放进 store state，而 `Game` 本身又能通过 `getSudoku()` 取到 live `Sudoku`。这样一旦组件使用 `$domainGame.game.guess(...)` 或 `$domainGame.game.getSudoku().guess(...)`，就会绕过 adapter 的快照刷新与历史管理，破坏 `Game` 作为唯一 UI 操作入口的职责边界。

### 2. 反序列化没有维护数独不变式

- 严重程度：major
- 位置：src/domain/index.js:148-157
- 原因：`createSudokuFromJSON` 只校验了 9x9 形状和取值范围，没有校验 `grid` 是否保留 `puzzle` 的 givens，也没有校验题面与当前盘面的对应关系。由于 `Game` 的 undo/redo 就依赖这套 snapshot，这意味着 domain 可以接受业务上不合理的盘面状态。

### 3. Hint 规则落在 Svelte store，而不在领域层

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:39-51
- 原因：`applyHint` 在 store adapter 内直接读取当前 `userGrid`、调用求解器、再回写 `domainGame.guess(...)`。这把“提示如何生成”的业务规则放在了 UI 侧适配层，而不是 `Game`/`Sudoku` 或明确的应用服务里，导致领域模型没有完整覆盖游戏操作。

### 4. 胜利判定在 UI adapter 中重复实现

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/game.js:84-93
- 原因：领域对象已经提供了 `Sudoku.isSolved()`，但 `gameWon` 仍自行扫描 `userGrid` 和 `invalidCells` 判断通关。胜利规则被写了两份，后续若修改判定标准，domain 和 UI 很容易发生漂移。

### 5. 顶层手动订阅不够符合 Svelte 习惯

- 严重程度：minor
- 位置：src/App.svelte:12-17
- 原因：这里直接 `gameWon.subscribe(...)` 且没有解绑。根组件通常生命周期很长，所以运行时风险不大，但从 Svelte 3 架构习惯看，使用 `$gameWon` 的 reactive block 或配合 `onDestroy` 清理会更稳妥。

### 6. 工厂对象方法依赖动态 this

- 严重程度：minor
- 位置：src/domain/index.js:107-115
- 原因：`isSolved()` 通过 `this.getInvalidCells()` 调用同对象方法。在 plain object factory 风格下，这比直接闭包调用更脆弱；一旦方法被解构后单独调用就会丢失上下文，不符合更稳妥的 JS 惯例。

## 优点

### 1. 用 custom store 做了清晰的 domain-to-Svelte 适配

- 位置：src/node_modules/@sudoku/stores/game.js:8-31
- 原因：adapter 私有持有 `Game`/`Sudoku`，并外表化为 `puzzleGrid`、`userGrid`、`invalidCells`、`canUndo`、`canRedo` 等响应式快照，基本符合题目推荐的 Store Adapter 方案。

### 2. 开始新局和载入自定义题目的主流程已经接入领域对象

- 位置：src/node_modules/@sudoku/game.js:13-34
- 原因：`startNew` / `startCustom` 没有直接操作旧数组，而是继续调用 grid/domain adapter，最终重新创建新的 `Sudoku` 和 `Game`，真实游戏流程不是“测试里有 domain，界面里没用”。

### 3. Sudoku 对核心输入规则有基本封装

- 位置：src/domain/index.js:91-105
- 原因：`guess(...)` 统一校验坐标和值，并禁止覆盖题面 givens；`getInvalidCells()` 也把冲突检测收敛在 domain 中，而不是散在组件事件里。

### 4. Undo/Redo 被集中在 Game 中管理

- 位置：src/domain/index.js:170-199
- 原因：新的输入会先记录快照并清空 redo 栈，`undo()`/`redo()` 也都只通过 `Game` 转换状态，职责上明显好于把历史逻辑散落在 `.svelte` 组件中。

### 5. 棋盘渲染已经消费领域对象导出的响应式状态

- 位置：src/components/Board/index.svelte:40-51
- 原因：界面使用 `$userGrid` 渲染当前盘面，用 `$grid` 区分 givens，并用 `$invalidCells` 做冲突高亮，说明当前局面确实来自 domain adapter，而不是本地临时数组。

### 6. 用户输入通过 adapter 进入领域对象

- 位置：src/components/Controls/Keyboard.svelte:10-25
- 原因：键盘输入最终调用 `userGrid.set(...)`，再转到 `domainGame.guess(...)`，没有在组件里直接修改二维数组，满足了作业要求中的关键输入链路。

## 补充说明

- 本次结论仅基于静态阅读 `src/domain/index.js` 及其关联的 Svelte/store 接入代码，未运行测试，也未在浏览器中实际验证界面行为。
- 对“开始一局游戏、界面渲染、用户输入、Undo/Redo、胜利弹窗/通关判断”的判断，来自 `src/node_modules/@sudoku/stores/game.js`、`src/node_modules/@sudoku/stores/grid.js`、`src/components/Board/*`、`src/components/Controls/*`、`src/App.svelte` 的静态调用链审查。
- 本次审查按要求只覆盖 `src/domain/*` 及其关联的 Svelte 接入；像 `@sudoku/sudoku` 中题目生成/求解器本身的正确性没有展开验证，因此与求解算法有关的结论只基于接入方式而非运行结果。
