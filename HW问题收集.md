## HW 问题收集

列举在 HW 1、HW 1.1 过程里，你所遇到的 2~3 个通过自己学习已经解决的问题，和 2~3 个尚未解决的问题与挑战。

已解决
JS Factory 模式下的 this 上下文丢失实验

上下文：在 src/domain/index.js 中，undo() 方法内部调用了 this.canUndo()。

实验过程：

观察现象：在 Svelte 组件中通过解构赋值 const { undo } = game 获取方法并绑定到按钮点击事件时，程序抛出 TypeError: Cannot read property 'canUndo' of undefined。

问 AI Agent：询问 CA（Coding Agent）为什么对象方法在 UI 绑定时会失效。CA 解释了 JS 的 this 动态绑定机制，并建议在 Factory 风格下优先使用闭包。

解决手段：重构领域对象生成函数，将 past/future 声明为闭包变量，使 undo/redo 直接访问局部变量而非 this，增强了方法的稳健性。

多维嵌套数据的“引用污染”防御实验

上下文：Sudoku 对象需要频繁生成快照（Snapshot）以支持 Undo 功能。

实验过程：

提出假设：直接使用 [...grid] 扩展运算符即可完成快照备份。

验证失败：修改当前盘面后，发现 past 栈中的历史记录也跟着变了。意识到这是因为二维数组的内层引用依然指向同一个内存地址。

解决手段：学习了深浅拷贝的区别，在 Sudoku 的构造函数和 toJSON 接口中，强制执行 grid.map(row => [...row]) 进行全量深度克隆，确保了快照的绝对独立性。

未解决
领域逻辑的“越权访问”与封装隔离挑战

上下文：src/node_modules/@sudoku/stores/game.js (Store Adapter 层)

现状描述：目前为了在 UI 渲染方便，Adapter 直接将 game 实例作为 store 的一部分暴露给了视图层。

尝试解决手段：曾咨询 CA 如何实现“只读实例”。CA 建议使用 Proxy 拦截，但在 Svelte 的响应式体系下，这会导致状态追踪变得异常复杂。

挑战：如何既能让 UI 获取到领域对象的状态（如 isSolved），又能严格禁止 UI 绕过 Adapter 直接调用 game.getSudoku().guess() 从而破坏 Undo 历史的一致性？

跨层级的业务规则“逻辑漂移”

上下文：src/node_modules/@sudoku/stores/grid.js 中的 applyHint 逻辑。

现状描述：Review 发现“根据当前盘面求出提示数”的规则被写在了 Store Adapter 里，而不是 Sudoku 领域模型中。

尝试解决手段：尝试将求解器（Solver）引入领域层，但发现 Sudoku 对象体积会因此剧增。

挑战：像“Hint 生成”和“胜利判定”这种逻辑，如果留在 UI 层会导致复用性差且易出错（Review 中已发现胜利判定写了两份）；如果全部塞进 Domain，又会破坏 Domain 的纯粹性。如何在保持模型轻量和逻辑内聚之间寻找平衡点？