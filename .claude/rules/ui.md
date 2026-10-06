---
paths:
  - 'src/renderer/**'
  - 'src/contexts/**'
  - 'locales/**'
  - '.storybook/**'
---

# Renderer: styling, antd, state, navigation, translations

The layout and colour rules themselves are in `DESIGN.md`; this file is what applying them taught.

## Styling

- **Our own elements are styled-components, never an inline `style`.** An inline `style` / `styles` is fine only where it is the API of an antd component (`Form.Item style={{ marginBottom: 0 }}`, `Segmented styles={{ root }}`). Swapping a styled div for antd `Flex` is a gain only if no `style` prop is needed to finish the job.
- **Every size is a theme value, font sizes included** — the font size will become a user setting. `fontSize` (px strings, CSS) and `fontScale` (numbers, antd tokens) derive from one `BASE_FONT_SIZE` in `renderer/theme`. A derived size is written as its formula in tokens (`0.6 * fontScale.base`), not measured at runtime.
- **Every colour has a palette slot as its base, never an antd default.** The semantic seeds are mapped in `ThemeContext` and pinned through the dark algorithm by `keepPalette`. Before shipping an antd component with a state colour (Alert, danger Button, validation, Tag, Badge), check which seed it reads. Deriving from a slot (a tint, a `color-mix()` with the background) is allowed.
- **Never style antd internals through `.ant-*` classes** — they are private. Use the escape hatches: `Form.Item noStyle`, the semantic `classNames` / `styles` maps.
- **antd 6 declares its CSS variables on the component's root element**, so a `var()` passed as a token resolves _there_, not where a descendant re-points it (`Layout.headerBg: 'var(--frame-bg)'` stayed base00). Read the generated rule (`document.styleSheets`, filtered on the class) before trusting a token to inherit; otherwise paint the property in the styled-component with `&&` — antd's `:where(...)` has zero specificity.
- **`Typography.Text keyboard` hardcodes `rgba(…)` colours and a 3px radius**: keep our `<kbd>` (`KeyboardShortcut`). Check an antd mixin for hardcoded values before swapping one of ours for it.
- **Adding a variant extends the styled family; it does not refactor it into fragments.** Judge a factorisation by what the diff removes, and never restyle components that were not the point of the change. A different _look_ is a different component (`Style/ViewSwitch` next to `Style/TabStrip`), not a `$variant` prop.
- **A rule moved from an item up to its container loses to the item's own reset at equal specificity** — double the class (`&& > * + *`). Nothing fails, the border just computes to `0px`: check `getComputedStyle` on the real thing, and on the component's other users.
- **A `<button>` does not inherit `text-transform` or `letter-spacing`** (UA reset): `inherit` them, like `font`.
- **Fonts are bundled from `@fontsource/*`, never linked** (the CSP is `default-src 'self'` anyway).
- **`flex: 1; min-height: 0` is inert in a block parent — use `fill` (`Style/fill.ts`)**, which holds the three declarations that together work in any parent. The symptom of a missing one is a scroller that moved up the tree (sticky headers stop, the virtualizer renders every row): probe `scrollHeight > clientHeight` over every `overflow: auto` ancestor. A `Splitter` panel is a block box, fixed once through `ConfigProvider`'s `splitter.styles.panel`.
- **An `<svg>` sized to fill its box needs `display: block`**, or the line box's descender space overflows it. A self-measuring component inside an `overflow: auto` ancestor is a feedback loop (scrollbars change the size it measures): find the phantom pixels by walking the subtree's `getBoundingClientRect().bottom`; `scrollbar-gutter: stable` only hides it.

## antd behaviours

- **An error the server answered is shown by `Query/SqlErrorComponent`.** Before writing anything that shows an error, a warning or an empty state, grep for the component the other pages use.
- **A zero-sized anchor is never aligned by rc-trigger**: `isVisible` reads `offsetParent`, null on a fixed element, then the rect size. Give it 1px and `pointer-events: none`. A popup parked at `top: -1000vh` means alignment never ran.
- **A controlled `Dropdown` still declares `trigger={['contextMenu']}`**: rc-trigger derives from it the window listeners that dismiss the popup and close it on scroll.
- **A tooltip is proven with `document.elementsFromPoint`, not by reading the markup.** An SVG hit-tests its strokes only, and an antd Menu item stretches its link over the row (`::before { inset: 0 }`): put the `title` on a `position: relative` box.
- **A detail of the mock that costs an antd override is given up**: name the trade-off and default to antd's rendering. Exceptions the user kept: the 3px accent rule on the left of the selected `TableLink` (antd Menu draws its bar on the right only), and a control keeps the element its behaviour calls for (a button stays a button even where the mock draws an input).
- **The mock is not an inventory**: an existing structural element it merely leaves out (a row separator, a count, a label) is kept, or its removal is named as a question. Only what the design folder lists as removed is safe to delete.
- **A control takes the look of what already sits in that place**, and the original's look is measured (computed styles), not eyeballed. **Where it lands is part of its design**: next to what it acts on, not wherever the data model makes appending easy.

## State

- **One state, one owner.** A component never takes the same state from its props and from its own `useState`: when a second caller needs a piece of it, lift that piece into an owner both reach (`CellWrite/` owns every write of a grid and its conflict modal).
- **A value written through a context and read back through it goes through the context state**, never straight to `window.config` (`usePanelSize`). A context change re-renders consumers, it does not remount them.
- **An IPC answer must never erase the UI**: `ConfigurationContextProvider` renders `null` without a configuration, so guard the setter and keep the previous value.
- **A `useState` whose setter is never used is not a way to freeze a value** — read the value directly.
- **A view toggle is local state** until the user asks for it to survive a restart; nothing goes in `config.json` otherwise.
- **Never persist a pixel size that will be replayed on another screen**: antd's Splitter gives an oversized panel 100% and ignores `min`/`max`. Store a percentage; a persisted value carries its unit (`'32.5%'`) so an older format is recognisable; "not released yet" is not "no migration needed".

## Hooks

- **Extract custom hooks from a component when its hook calls make up more than ~40% of it, or when they serve several unrelated concerns**: one hook per concern (`MonacoEditor/useQuerySchema.ts` holds the three contexts and the `useMemo` that build the editor's schema; the editor only calls it). The extraction is a plain cut and paste into a `useXxx` function, and the hook becomes testable on its own.
- **Memoisation is React Compiler's: a `useMemo`, `useCallback` or `memo` stays only where it caches finer than the compiler** — under a component it skips (`BodyRow`, rendered by `TableBody`), an item of a `.map()`, whose array it caches as one (`GridCell`), values it would merge into one cache (`useGridColumns`). Read the `$[n] !==` guards of the compiled output (`babel-plugin-react-compiler` through `@babel/core`), and count the renders per interaction before and after; it caches nothing that spans a hook call, and the Node tests run it too.
- **A hook lives as close to its users as it can**: in the component's file if it is small and private, in its own file in the component's directory past ~50 lines (`MonacoEditor/useCompletion.tsx`), and in a shared place only when several components use it — next to the domain code it serves, `src/renderer/hooks/` only for hooks that cut across domains.
- **A component or hook holding an `import()` is not compiled by React Compiler**, and nothing shows it but the plugin's `logger` (`Todo: Handle Import expressions`): every value it builds is new on every render (`useMonaco` redefined Monaco's theme on every keystroke). The `import()` goes in a module-level function (`loadMonaco`).

## Navigation

- **A navigation is a `Link`, never an `onClick` calling `navigate()`** — even in Electron. `navigate()` only follows an action (a form submitted, a filter built). When an item can both act and navigate, ship two variants sharing the css (`TabStripItem` / `TabStripLink`).
- **The active state of a link is `NavLink`'s job**, not a `useMatch` retyping the route pattern. `end` is required wherever a longer path nests under `to`; matching ignores the query string.
- **`useNavigation()` (read-only router state) is not `useNavigate()` (imperative)** — spell out which one, and that nothing becomes imperative, when proposing it.

## Translations

- **Never build a translation key at the call site** (``t(`a.${reason}`)``): one key holding an ICU `select`, `t('a', { reason })`, always with an `other` branch. In French, ICU treats `'` as an escape only before `{`, `}` or `'`.
- `en.ts` is the reference (it defines `locales/type.ts`): add keys there first, then `fr.ts`.
