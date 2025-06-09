# fiddich-next 設計ドキュメント (v0.1)

## 1. はじめに: モチベーションと課題感

本ライブラリは、現代のフロントエンド開発（特にReactを想定）において、より自然で堅牢、かつ効率的な状態管理を実現することを目的としています。

### 根本的なモチベーション

* **手続き型プログラミングの自然さの追求**: 開発者が日頃慣れ親しんでいる手続き的なコードの書き方（例: 値をセットしたら、直後にその最新値が読める）を、リアクティブな状態管理の中でも一貫して維持したい。

* **アプリケーションロジックの集約**: オブジェクト指向の原則に基づき、状態とその状態を操作する**アプリケーションロジック**を自然な形で記述できる環境を提供したい。操作に伴う副作用を書く場所で悩みたくない。

* **リアクティブシステムの利点の享受**: 状態の変更が依存先に自動的に伝播し、UIなどが効率的に（最小の更新回数で、グリッチフリーに）更新されるというリアクティブプログラミングの恩恵を最大限に活かしたい。

### 既存の状態管理に対する課題意識の深掘り

近年のJavaScriptフロントエンド開発、特にReactを中心としたエコシステムでは、イミュータブル（不変性）なデータ構造を状態管理の基本とする考え方が広く浸透しています。このアプローチはUIライブラリのレンダリング最適化（例: 参照の比較による効率的な変更検知）と親和性が高い一方で、アプリケーションの**アプリケーションロジック**を記述する際には、多くの開発者が**アプリケーションロジック**を記述する際に慣れ親しんでいる、より直接的で自然な状態変更の考え方とは異なる側面も持ち合わせています。

さらに、イミュータビリティを徹底するアプローチは、状態変更のたびに新しいオブジェクト参照を生成するため、特に派生状態（多くのライブラリでセレクタと呼ばれる機能で実現される）の計算結果が新たにオブジェクトや配列を生成する場合、その参照の変更だけで実際には値が変わっていないコンポーネントまでもが再レンダリングされてしまう「過剰な更新」を招きがちです。これを回避するためのメモ化等の最適化は、結果としてアプリケーションのパフォーマンス低下や、開発者の「消耗」に繋がることも少なくありません。

興味深いことに、このようなイミュータブルな更新の複雑さや開発者体験の問題を緩和するために、一部のライブラリやユーティリティでは、開発者がミュータブルな操作を記述できるようにしつつ内部でイミュータブルな変換を行う、いわば「ミュータビリティのシミュレーション」とも言える手法が採用されています。これは、開発者が本質的に求めているのが、煩雑なイミュータブル操作の作法そのものではなく、状態を直感的かつ正確に更新するための手段であることを示唆していると言えるでしょう。

イミュータブルなアプローチで状態を管理する際、特に木構造のようなネストしたデータにおいては、更新の複雑さ（例えば、適切なパスコピーの手間や記述の冗長性など）が生じがちです。この複雑さは、時に開発者を状態の過度な細分化へと向かわせる誘因となります。つまり、大きな木構造全体をイミュータブルに管理する困難さを避けるために、状態を多数の小さな「atom」に分割するアプローチです。しかし、このアプローチは、個々の更新は単純化されるものの、atomの数が爆発的に増加し、それらの意味的な関連性やアプリケーション全体の構造を把握することが困難になる「atomの海」問題を引き起こしがちです。

本ライブラリの重要なモチベーションの一つは、このような「大きなイミュータブルツリーの管理の複雑さ」と「atomの海の管理の煩雑さ」という二者択一を迫られる状況を回避することにあります。開発者が、意味的にまとまりのある、時には複雑なネスト構造を持つ状態であっても、それを不必要に細分化することなく、より自然かつ直感的に（atomicUpdateのスコープ内ではミュータブルな操作を通じて）扱えるようにすることで、アプリケーションロジックの本質的な記述に集中できる環境を提供することを目指しています。

本ライブラリは、ステートフルなReactアプリケーションにおける理想的なアーキテクチャの基本形を「ミュータブルな状態ストア（アプリケーションロジックを内包）と、純粋関数としてのReactコンポーネント（UIロジックに専念）の組み合わせ」と捉えています。この考えに基づき、イミュータブルな実装原則が特に効果を発揮するのはUIライブラリ（例えばReact）の内部的な差分検知やレンダリング最適化のメカニズムであり、本ライブラリがその原則をアプリケーションの状態管理層で厳格に強制するものではありません。むしろ、アプリケーションのコアとなる状態管理ロジック（状態ストア）においては、開発者がまずミュータブルな操作（オブジェクトの直接変更など）を自然な形で記述できること（いわば「mutable first」のアプローチ）を基本とし、その上でその変更を効率的に検知・伝播させ、関連する副作用を明確に制御できるような仕組みを提供することで、前述した基本形の実現を支援します。

### 既存の状態管理に対する具体的な課題感

* **状態と副作用の不適切な結合（パス依存問題を含む）**: 多くのライブラリやパターンでは、副作用が状態そのものに紐づいていたり、状態変化をトリガーとして画一的に実行されたりする傾向があります。しかし、実際には副作用は「どの**アプリケーションアクション**（操作）によって状態が変更されたか」という文脈に依存することが多いです。例えば、ユーザーの操作Aによって状態XがYに変わった場合と、システムの自動処理Bによって状態XがYに変わった場合とでは、実行すべき副作用が異なるケース（パス依存性）があり得ます。状態の変化自体も、**アプリケーションロジック**から見れば副作用の一つと捉えられるべきであり、このような文脈を無視した副作用管理は、ロジックの複雑化を招きます。

* **副作用管理の分散と重複**: useEffect のようなフックによる副作用の分離は、**アプリケーションロジック**と副作用の記述場所を離れさせ、結果としてロジックの把握を困難にし、副作用の記述が複数の場所に分散・重複する原因となり得ます。

* **即時的な一貫性とリアクティブな遅延処理のギャップ**: **アプリケーションロジック**内では状態変更の即時的な反映を期待しますが、リアクティブシステムはグリッチフリーを実現するために更新をバッチ処理・遅延させることが多く、このギャップが開発者を混乱させることがあります。

本ライブラリは、これらの課題を解決し、開発者が**アプリケーションロジック**の本質的な記述に集中できるような状態管理の仕組みを提供することを目指します。

## 2. コアコンセプト

本ライブラリは、以下の主要な概念を中心に構築されます。

* **Cell (セル)**: アプリケーションの基本的な「状態」を保持する最小単位。リアクティブな値の入れ物です。TC39で標準化が検討されているSignalに類似した概念ですが、本ライブラリでは将来的にTC39 Signalの仕様に追随する予定はなく、標準化後の混乱を避けるためにCellという名称を採用しています。

* **Computed (コンピューテッド)**: 派生状態。一つ以上のCellまたは他のComputedから値を計算し、依存元が変更されると自動的に再計算されるリアクティブな値です。その計算処理は、オブジェクトのgetterオンリープロパティのような軽量な処理にとどめ、副作用などを記述しないことが推奨されます。

* **atomicUpdate (アトミックアップデート)**: 複数の状態変更や副作用を伴う一連の操作を、一つの不可分な単位として実行するための仕組み。後述の**アプリケーションアクション**を定義する際に中心的な役割を果たします。

* **AtomicContext (アトミックコンテキスト)**: 状態変更のバッファリング、一貫性維持、および関連する操作のコンテキスト情報を管理するatomicUpdateの内部的なエンティティです。

* **ReactiveCollection (リアクティブコレクション)**: (例: ReactiveMap, ReactiveArray) コレクション（配列やマップなど）のリアクティブな管理を目的とした専用のエンティティです。内部でCellを利用しつつ、要素の追加・削除に伴う関連リソース（CellやComputedなど）の自動的なSymbol.disposeや、要素自体の変更（ミュータブルなオブジェクトの内部変更も含む）の効率的な検知・通知を行います。atomicUpdateスコープ内での操作時には、オプションでAtomicContextを明示的に引き渡すことで、トランザクショナルな挙動（ロールバック時の状態復元を含む）を保証します。これにより、Cell<Map/Array>とops.touchを直接利用する場合に比べて、より宣言的で安全なコレクション操作を実現します。

* **ManagedObject (マネージドオブジェクト)**: createManagedObject(() => T) APIによって生成される、リソース管理が強化されたオブジェクトです。Proxyを利用して、オブジェクト自身のSymbol.dispose時に内部のCell、Computed、他のManagedObject、またはReactiveCollectionなどのdisposableなメンバーのSymbol.disposeを連鎖的に呼び出す機能を提供します。開発者はファクトリ関数内で独自のSymbol.disposeロジックを定義し、ライブラリによる自動Symbol.disposeと協調させることも可能です。リアクティブな状態は引き続き明示的なCell/Computedで管理され、ManagedObjectは主にライフサイクル管理の責務を担います。

* **アプリケーションロジック (Application Logic)**: UIフレームワークの具体的な実装から分離された、アプリケーションの関心事の中核を担うロジックの総体。これには、ビジネスルールや永続化すべきデータだけでなく、UI固有の状態（例：ダイアログの開閉状態、フォームの入力値など）が含まれることもあります。一般的に、リアクティブな状態 (Cell, Computed等) と、それを操作する**アプリケーションアクション**群をカプセル化したモジュールやオブジェクトとして構築されます。

* **アプリケーションアクション (Application Action)**: **アプリケーションロジック**内に定義される、個々の具体的な操作（関数）。atomicUpdate を用いて、状態の読み書きや副作用（例: API通信、タイマー設定など）の実行といった一連の処理を、アトミックな単位として扱います。increment() や toggleTodo() のような関数がこれにあたります。

## 3. 設計原則

* **手続き的な一貫性の最優先**: set 操作の完了直後には、どの同期スコープからであっても、関連する get 操作で必ず更新された最新の値が読み取れることを保証します。

* **効率的なUI更新**: 状態変更の通知を最適化し、UIの再レンダリング回数を最小限に抑え、グリッチフリーな体験を提供します。

* **副作用のアプリケーションロジックへの集約**: 副作用は、それが生じる原因となった具体的な「操作」（**アプリケーションアクション**）の内部で明確に管理します。

* **明示性と予測可能性**: 暗黙的な挙動を極力排し、操作のスコープ、依存関係、副作用の実行タイミングなどを開発者が予測しやすく、制御しやすいように設計します。

* **関心の分離**: UI（Reactコンポーネント）と**アプリケーションロジック**（状態とその操作）は分離して記述することを推奨します。

## 4. 主要なAPIと振る舞い

### 4.0 主要なAPIの分類

本ライブラリの主要なAPIは、以下のカテゴリに分類されます。

* **トップレベル関数**: リアクティブな値の作成、読み書き、手動通知、高度なリソース管理を行うための基本的な関数群。
* **コアエンティティ**: リアクティブな状態やコレクションを表現する主要な型 (Cell, Computed, ReactiveCollection)。
* **トランザクション制御**: 複数の操作をアトミックにまとめるための仕組み (atomicUpdate).

### 4.1. トップレベル関数

#### createCell

```typescript
createCell<T>(
  initialValue: T, 
  options?: { compare?: (oldValue: T, newValue: T) => boolean }
): Cell<T>
```

新しい Cell を作成します。compare オプションで値の比較関数を指定できます（デフォルトは厳密等価 ===）。

#### createComputed

```typescript
createComputed<T>(
  fn: (arg: { get: <V>(target: Cell<V> | Computed<V>) => V }) => T,
  options?: { compare?: (oldValue: T, newValue: T) => boolean }
): Computed<T>
```

新しい Computed を作成します。compare オプションで値の比較関数を指定できます。

#### get

```typescript
get<T>(target: Cell<T> | Computed<T> | ReactiveCollection<any, any>): T
```

Cell、Computed、またはReactiveCollectionの現在のコミット済みの値（またはコレクションの表現）を取得します。
* target がペンディング状態の場合の振る舞いやSuspense連携は、対象の型に応じて適切に処理されます。

#### set

```typescript
set<T>(cell: Cell<T>, newValue: T): void
```

Cell の値を設定します。Cell 作成時に指定された compare 関数（またはデフォルト）に基づき、実際の値変更があった場合のみ通知が行われます。atomicUpdate のスコープ外で呼び出された場合、この操作のために内部的に短命な AtomicContext が発行され、即座にコミットされます。

**また、set 操作によって Cell が保持する値が新しいオブジェクトに差し替えられる際、以前保持していた値（オブジェクト）が Symbol.dispose メソッドを持つ場合には、その Symbol.dispose メソッドが自動的に呼び出されます。これにより、不要になったリソースの解放漏れを防ぎます。**

#### touch

```typescript
touch(target: Cell<any> | Computed<any> | ReactiveCollection<any, any>): void
```

Cell、Computed、またはReactiveCollectionに手動で変更通知を促します。

* **Cell に対して**: Cell が保持するミュータブルなオブジェクトやコレクションの参照自体は変わらずに、その内部状態が変更されたことをシステムに通知します。この通知後、Cell の値は compare 関数（またはデフォルト）によって再評価され、変更があれば購読者に通知されます。

* **Computed に対して**: Computed をダーティとしてマークし、次の更新伝播時に計算関数を強制的に再実行させます。計算結果が前回と異なれば（compare 関数による比較）、購読者に通知されます。これは、Computed がリアクティブシステム管理外の要因に依存する場合の「エスケープハッチ」として利用できますが、依存関係は可能な限り明示的な Cell/Computed で表現することが推奨されます。

* **ReactiveCollection に対して**: コレクションの内部状態がミュータブルに変更されたが、コレクションの操作メソッド（set, push等）を経由しなかった場合に、変更をシステムに通知します。

* atomicUpdate のスコープ外で呼び出された場合、この操作のために内部的に短命な AtomicContext が発行され、即座にコミットされます。

#### createReactiveMap

```typescript
createReactiveMap<K, V extends { [Symbol.dispose]?: () => void }>(
  initialEntries?: Iterable<readonly [K, V]>,
  context?: AtomicContext
): ReactiveMap<K, V>
```

リアクティブなMapインスタンスを作成します。要素はSymbol.disposeメソッドを持つことが期待されます。

#### createReactiveArray

```typescript
createReactiveArray<T extends { [Symbol.dispose]?: () => void }>(
  initialItems?: Iterable<T>,
  context?: AtomicContext
): ReactiveArray<T>
```

リアクティブなArrayインスタンスを作成します。要素はSymbol.disposeメソッドを持つことが期待されます。

#### createManagedObject

```typescript
createManagedObject<T>(factory: () => T): T & { [Symbol.dispose](): void }
```

リソース管理が強化されたオブジェクト（ManagedObject）を生成します。詳細はセクション4.4を参照。

### 4.2. コアエンティティ (Cell, Computed, ReactiveCollection)

#### 4.2.1. Cell

リアクティブな状態の基本単位。Cell インスタンスは、不要になった際にそのリソースを解放するための `[Symbol.dispose](): void` メソッドを実装します。値の変更検知には、作成時に指定された compare 関数（デフォルトは ===）が使用されます。 (TC39 Signalとの関連についてはセクション2を参照)

* `[Symbol.dispose](): void`: Cell に関連付けられた内部リソース（例: 購読者リストのクリアなど）を解放します。Cellが保持する値がSymbol.disposeメソッドを持つ場合、それも呼び出されます。一度 Symbol.dispose された Cell は再利用できません。

(その他の詳細は「4.1 トップレベル関数」の createCell, get, set, touch および後述の ops 内の同名操作を参照)

#### 4.2.2. Computed

一つ以上のリアクティブな値から派生する状態。Computed インスタンスも、不要になった際にリソースを解放するための `[Symbol.dispose](): void` メソッドを実装します。計算結果の変更検知には、作成時に指定された compare 関数（デフォルトは ===）が使用されます。(副作用に関する注意点はセクション2を参照)

* `[Symbol.dispose](): void`: Computed が依存している他の Cell や Computed からの購読を解除し、内部のキャッシュや購読者リストをクリアします。一度 Symbol.dispose された Computed は再利用できません。

(その他の詳細は「4.1 トップレベル関数」の createComputed, get, touch および後述の ops 内の同名操作を参照)

#### 4.2.3. ReactiveCollection (例: ReactiveMap, ReactiveArray)

リアクティブなコレクション（MapやArrayなど）を扱うための専用エンティティです。Cell<Map/Array>を直接操作するよりも高度な機能を提供し、特にコレクション要素のライフサイクル管理や変更通知を簡素化します。

**目的と機能**:
* 要素の追加・削除時に、その要素が持つSymbol.disposeメソッドを自動的に呼び出します（要素がdisposableな場合）。
* コレクションの構造的変更（要素の追加、削除、順序変更など）や、コレクションが保持するミュータブルな要素の内部状態の変更を効率的に検知し、購読者に通知します。
* atomicUpdateスコープ内での操作は、オプションで渡されるAtomicContextと連携し、トランザクショナルな挙動（コミット、ロールバック）をサポートします。ロールバック時には、コレクションの状態（要素の追加・削除・変更）もトランザクション開始前の状態に復元されます。

**API (ReactiveMap<K,V> の例)**:

```typescript
set(key: K, value: V, context?: AtomicContext): this;
delete(key: K, context?: AtomicContext): boolean;
get(key: K): V | undefined;
has(key: K): boolean;
clear(context?: AtomicContext): void;
forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
keys(): IterableIterator<K>;
values(): IterableIterator<V>;
entries(): IterableIterator<[K, V]>;
size: number;
[Symbol.dispose](): void; // コレクション自体と、保持する全要素のSymbol.disposeを実行
```

**API (ReactiveArray<T> の例)**:

```typescript
push(item: T, context?: AtomicContext): number;
pop(context?: AtomicContext): T | undefined;
splice(start: number, deleteCount?: number, context?: AtomicContext): T[]; // 要素削除・置換（アイテムなし）の場合
splice(start: number, deleteCount: number, ...items: T[], options?: {context: AtomicContext}): T[]; // 要素追加・置換の場合 - この形式ではoptionsオブジェクトを使用
// その他、標準的なArrayメソッド（map, filter, forEachなど）も提供し、これらはリアクティブな振る舞いを維持します。
[Symbol.dispose](): void; // コレクション自体と、保持する全要素のSymbol.disposeを実行
```

**作成**: `createReactiveMap()`, `createReactiveArray()` トップレベル関数を使用します。

### 4.3. トランザクション制御 (atomicUpdate)

複数の状態変更や副作用をアトミックに実行するためのスコープを提供します。

#### シグネチャ

```typescript
interface AtomicOperations {
  get<T>(target: Cell<T> | Computed<T> | ReactiveCollection<any, any>): T;
  set<T>(target: Cell<T>, value: T): void;
  pending(target: Cell<any> | Computed<any> | ReactiveCollection<any, any>): void;
  rejectAllChanges(): void;
  touch(target: Cell<any> | Computed<any> | ReactiveCollection<any, any>): void;
  dispose<T extends { [Symbol.dispose](): void }>(target: T): void;
  readonly context: AtomicContext; // 現在のAtomicContextを公開
}

interface AtomicUpdateOptions {
  context?: AtomicContext;
}

function atomicUpdate(
  fn: (ops: AtomicOperations) => Promise<void> | void,
  options?: AtomicUpdateOptions
): Promise<void> | void;
```

#### コールバック関数 fn(ops)

引数 `ops` は、現在の AtomicContext スコープ内で状態操作を行うための関数群及び現在のコンテキストへのアクセスを提供します。

* **ops.get(target)**: AtomicContext の内部バッファを優先して値を読み取ります。

* **ops.set(cell, value)**: Cellへの変更を AtomicContext の内部バッファに記録します。値の比較は Cell 自身の compare 関数に従います。

* **ops.pending(target)**: 対象の Cell、Computed、または ReactiveCollection が、現在の AtomicContext 内で非同期的に解決されることをマークします。主な目的は、UI層（例: useValue フック）と React Suspense との連携を可能にすることです。
  * **Promiseとの関連付け**: ops.pending を呼び出すと、target は内部的に、この AtomicContext の解決に使われる Promise（通常は atomicUpdate のコールバック関数 fn が返す Promise）と関連付けられます。UI層がこの target の値を読み取ろうとした際に、この関連付けられた Promise を用いてSuspenseをトリガーできます。
  * **値の読み取り**: ops.pending を呼び出した後、同じ AtomicContext 内で ops.get(target) を実行すると、先行する ops.set によってバッファリングされている最新の値を読み取ります（target が Cell の場合）。まだ ops.set されていない場合や、target が Computed または ReactiveCollection の場合は、この AtomicContext が開始される前のコミット済みの値（または計算結果）が返されます。
  * **ペンディング状態の解除**: target の値が非同期的に解決され、（target が Cell の場合は ops.set によって）更新された後に AtomicContext がコミットされると、target のペンディング状態は解除されます。
  * このメソッド自体は値を返しません。

* **ops.rejectAllChanges()**: バッファされた全ての状態変更（ReactiveCollectionへの変更も含む）を破棄します。

* **ops.touch(target)**: Cell、Computed、またはReactiveCollectionに、現在のトランザクション内で変更があったことを通知します。

* **ops.dispose(target)**: 対象オブジェクトの Symbol.dispose メソッドの実行を、現在の AtomicContext のコミット時まで遅延させます。トランザクションがロールバックされた場合、この Symbol.dispose 処理は実行されません。target は `[Symbol.dispose](): void` メソッドを持つオブジェクトである必要があります。これにより、リソース解放処理もトランザクションの原子性に含めることができます。

* **ops.context**: 現在のトランザクションスコープで有効なAtomicContextインスタンスへの読み取り専用アクセスを提供します。これは、ReactiveCollectionの操作メソッドなどに明示的にコンテキストを引き渡す際に利用できます。

#### 振る舞い

(ネスト、バッファリング、コミット/ロールバック、一括通知、Suspense連携の基本原則は変更なし)

特に、atomicUpdateのスコープ内でops.dispose(target)を介してSymbol.disposeメソッドが呼び出された場合、その実行もトランザクションのコミットと同期され、トランザクションがロールバックされた場合にはSymbol.dispose処理は実行されません。これにより、リソース管理の一貫性と安全性が保証されます。target[Symbol.dispose]() を直接呼び出した場合は即時実行され、トランザクションのロールバック対象とはなりません。

ReactiveCollectionへの操作も、ops.contextを通じてAtomicContextが適切に連携されていれば、トランザクションのコミット/ロールバックと同期します。

### 4.4. 高度なリソース管理ユーティリティ (createManagedObject)

`createManagedObject(factory: () => T): T & { [Symbol.dispose](): void }` は、リソース管理が強化されたオブジェクト（ManagedObject）を生成するためのトップレベル関数です。

#### 目的と機能

* Proxyベースのラッパーであり、ManagedObject自身のSymbol.disposeメソッドが呼び出された際に、ファクトリ関数内で生成・保持されているCell、Computed、他のManagedObject、またはReactiveCollectionなどのdisposableなメンバーのSymbol.disposeを連鎖的に呼び出す機能を提供します。

* ファクトリ関数 `() => T` を引数に取ることで、状態（Cell/Computedなど）とそれを操作するメソッド群をクロージャ内にカプセル化し、構造化された**アプリケーションロジック**のオブジェクト生成を支援します。

#### Symbol.disposeメソッドの挙動

* 生成されるManagedObjectは常にSymbol.disposeメソッドを持ちます。

* ファクトリ関数が返すオブジェクトTが独自のSymbol.disposeメソッドを実装している場合、ManagedObjectのSymbol.disposeが呼び出されると、まずこのユーザー定義のSymbol.disposeメソッドが実行されます。開発者はこの中で、追加のクリーンアップ処理を記述したり、必要に応じてProxyが提供するデフォルトの内部リソース解放処理を（例えば特定のAPIを通じて）呼び出したりすることができます。

* オブジェクトTがSymbol.disposeメソッドを実装していない場合、ManagedObjectのSymbol.disposeが呼び出されると、Proxyはオブジェクトが内部に持つdisposableなメンバーを自動的に探索し、それらのSymbol.disposeメソッドを連鎖的かつ透過的に呼び出すデフォルトのクリーンアップ処理を実行します。

#### リアクティビティとの関係

ManagedObjectの主な責務はリソース管理の自動化であり、リアクティブな状態（値）そのものは、引き続きファクトリ関数内で明示的にcreateCellやcreateComputedで作成されたインスタンスによって管理されます。これにより、MobXのような暗黙的なリアクティビティとは異なり、状態の明示性とライブラリの一貫性を保ちます。

#### ReactiveCollectionとの連携

ManagedObjectが内部にReactiveCollectionインスタンスを保持する場合、両者の連携により、コレクション要素のライフサイクル管理も含めた、アプリケーションロジック全体のライフサイクル管理のほぼ完全な自動化が期待できます。

## 5. アプリケーションロジックの構築パターン

アプリケーションの状態とそれを操作するロジック（**アプリケーションロジック**）は、本ライブラリのコアエンティティ（Cell, Computed, ReactiveCollection, ManagedObject）とトップレベル関数（atomicUpdateなど）を組み合わせて構築します。ここでは、推奨される主要な2つの構築パターンについて説明します。

### 5.1. createManagedObject を利用したパターン (推奨)

createManagedObject は、状態のカプセル化とリソース管理の自動化を促進し、堅牢で保守性の高い**アプリケーションロジック**のオブジェクト構築を支援します。

#### 基本的な構造

* ファクトリ関数 `() => T` を createManagedObject に渡して、**アプリケーションロジック**を内包するオブジェクトを生成します。
* ファクトリ関数内で、createCell や createComputed を用いてリアクティブな状態を定義し、それらを操作するメソッド（**アプリケーションアクション**）も同じクロージャスコープ内に定義します。これにより、状態とロジックがカプセル化されます。
* 必要に応じて、ReactiveCollection を内部に持ち、より複雑なコレクションの状態を管理します。

```typescript
// 例: カウンターのアプリケーションロジック
const createCounter = () => createManagedObject(() => {
  const count = createCell(0);

  // アプリケーションアクション
  const increment = () => atomicUpdate(ops => ops.set(count, ops.get(count) + 1));
  const reset = () => atomicUpdate(ops => ops.set(count, 0));

  // ManagedObjectは自動的にSymbol.disposeメソッドを持つ
  // 必要であれば、ここで独自のSymbol.disposeロジックを定義可能
  return { count, increment, reset };
});

const counter = createCounter();
get(counter.count); // 0
counter.increment();
get(counter.count); // 1
counter[Symbol.dispose](); // 内部のcount (Cell) も自動的にSymbol.disposeされる
```

#### リソース管理

* ManagedObject の Symbol.dispose メソッドが呼び出されると、ファクトリ関数内で生成された Cell、Computed、ReactiveCollection、および他のネストされた ManagedObject の Symbol.dispose が自動的に連鎖して呼び出されます。
* 開発者がファクトリ関数内で独自の Symbol.dispose メソッドを定義した場合、それが優先的に実行され、必要に応じてライブラリの自動 Symbol.dispose チェーンを明示的に呼び出すことも可能です（詳細はセクション4.4参照）。

#### 利点

* 状態とロジックのカプセル化。
* リソース管理の自動化によるメモリリークのリスク低減。
* コードの構造化と可読性の向上。

#### 考慮点

* Proxyによる若干のオーバーヘッドの可能性（UI表示と比べたら桁が違う負荷であるため通常は無視できる範囲。ドラッグ中座標などの変化が激しすぎる値の管理はReact Component内に閉じ込めるべき）。

### 5.2. 手動管理パターン (プレーンオブジェクトとコアエンティティの直接利用)

createManagedObject を使用せず、プレーンなJavaScriptオブジェクトを返すファクトリ関数を定義し、その内部で Cell、Computed、ReactiveCollection を直接管理するパターンです。

#### 基本的な構造

* 開発者自身が、**アプリケーションロジック**を保持するオブジェクトを生成するファクトリ関数を定義します。
* ファクトリ関数内で createCell、createComputed、createReactiveMap/Array を呼び出してリアクティブな状態を生成し、返すオブジェクトのプロパティとして公開します。
* 状態を操作するメソッド（**アプリケーションアクション**）も、ファクトリ関数内で定義し、返すオブジェクトのメソッドとして公開します。
* **リソース管理のため、返すオブジェクトには必ず Symbol.dispose メソッドを実装し、その中で内部的に生成した全てのdisposableなリソース（Cell、Computed、ReactiveCollectionなど）のSymbol.disposeを呼び出す必要があります。**

```typescript
// 例: 手動管理のカウンターオブジェクト (ファクトリ関数スタイル)
const createManualCounter = (initialValue: number = 0) => {
  const count = createCell(initialValue);
  const _someOtherResource = createCell("internal data"); // 例: 内部で利用するCell

  // アプリケーションアクション
  const increment = () => {
    atomicUpdate(ops => ops.set(count, ops.get(count) + 1));
  };

  const reset = () => {
    atomicUpdate(ops => ops.set(count, 0));
  };

  // 手動で内部リソースのSymbol.disposeを呼び出す
  const [Symbol.dispose] = () => {
    count[Symbol.dispose]();
    _someOtherResource[Symbol.dispose]();
    console.log("ManualCounter disposed");
  };

  return {
    count, // Cellを直接公開
    increment,
    reset,
    [Symbol.dispose]
  };
};

const manualCounter = createManualCounter();
get(manualCounter.count); // 0
manualCounter.increment();
get(manualCounter.count); // 1
manualCounter[Symbol.dispose]();
```

#### リソース管理

* 開発者は、ファクトリ関数が返すオブジェクトが不要になった際に、そのオブジェクトが保持する全ての Cell、Computed、ReactiveCollection の Symbol.dispose メソッドを**明示的に**呼び出す責任を負います。
* **連鎖的な解放漏れを防ぐため、Cell、Computed、ReactiveCollection、または他の（手動管理の）アプリケーションロジックオブジェクトをプロパティとして持つようなオブジェクト自体にも、自身のSymbol.disposeメソッドを定義し、その中で内部的に保持するdisposableなリソースのSymbol.disposeを呼び出すことを強く推奨します。**
* set 操作による Cell の値の差し替え時の旧オブジェクトの自動 Symbol.dispose（セクション4.1参照）や、ReactiveCollection の要素削除時の自動 Symbol.dispose（セクション4.2.3参照）といった個別の自動化機能は利用できますが、オブジェクト全体のライフサイクル管理と、その内部にネストされたdisposableなリソースの連鎖的な解放は、開発者による手動での正確な実装が求められます。

#### 利点

* Proxyのオーバーヘッドがない。
* ライブラリへの依存を最小限に抑えたい場合や、特定の設計思想に沿って細かく制御したい場合に適している。

#### 考慮点

* リソース管理の責任が開発者にあり、Symbol.dispose 漏れによるメモリリークのリスクが高まる。
* 特にネストしたオブジェクトやコレクションを扱う場合、Symbol.dispose の連鎖を正確に実装するのが煩雑になることがある。

### どちらのパターンを選択するか

基本的には、リソース管理の安全性と開発効率の観点から、createManagedObject を利用したパターンを推奨します。
手動管理パターンは、パフォーマンスが極めてクリティカルな限定的なケースや、ライブラリのコア機能のみを利用したい場合に選択肢として残ります。

## 6. Reactとの連携イメージ (構想)

UIと**アプリケーションロジック**の分離を推奨。Cell、Computed、ReactiveCollection、ManagedObject等はReactコンポーネント外部のグローバルストア等に配置。

### useValue フック

```typescript
useValue<T>(target: Cell<T> | Computed<T> | ReactiveCollection<any,any>): T
```

Cell/Computed/ReactiveCollectionの値を購読し、変更時に再レンダリング。Suspense連携も行います。

### グローバルストアとアプリケーションアクションの連携例 (Todoアイテム - ReactiveArray と createManagedObject 使用)

```typescript
// store.ts

// --- 型定義 ---
interface TodoData {
  id: string;
  text: Cell<string>;
  completed: Cell<boolean>;
}
// ManagedObjectによってSymbol.disposeが自動的に付与される
type TodoItem = TodoData & { [Symbol.dispose](): void };

// --- API関数の仮宣言 ---
declare const api: {
  updateTodoStatus: (todoId: string, newStatus: boolean) => Promise<void>;
};

// --- グローバルストア (アプリケーションロジックを内包) ---
export const globalStore = createManagedObject(() => {
  const todos = createReactiveArray<TodoItem>();

  // 初期化処理
  const initialData = [
    { id: '1', text: 'Learn Fiddich-Next', completed: false },
    { id: '2', text: 'Build something cool', completed: true },
  ];

  atomicUpdate(ops => {
    initialData.forEach(data => {
      const todoItem = createManagedObject(() => ({
        id: data.id,
        text: createCell(data.text),
        completed: createCell(data.completed)
      }));
      todos.push(todoItem, { atomicContext: ops.context });
    });
  });

  return {
    todos,
  };
});

// --- アプリケーションアクション (グローバルストアとは別に定義する例) ---
export const todoItemActions = {
  async toggleTodoCompletion(todoId: string): Promise<void> {
    return atomicUpdate(async (ops) => {
      const todoItem = globalStore.todos.find(todo => todo.id === todoId);
      if (!todoItem) return;

      const completedCell = todoItem.completed;
      const currentValue = ops.get(completedCell);

      // 先にUIを楽観的に更新
      ops.set(completedCell, !currentValue);
      // Suspenseのためにペンディング状態をマーク
      ops.pending(completedCell);

      try {
          // APIをコール
          await api.updateTodoStatus(todoId, !currentValue);
      } catch (e: any) {
          // 失敗したら変更をロールバック
          console.error(`Failed to toggle completion for todo ${todoId}:`, e);
          ops.rejectAllChanges();
      }
    });
  },

  async addTodoItem(text: string): Promise<void> {
    const newId = crypto.randomUUID();
    return atomicUpdate(ops => {
      const newItem = createManagedObject(() => ({
        id: newId,
        text: createCell(text),
        completed: createCell(false)
      }));
      globalStore.todos.push(newItem, ops.context);
    });
  },

  async removeTodoItem(todoId: string): Promise<void> {
    return atomicUpdate(ops => {
      const index = globalStore.todos.findIndex(todo => todo.id === todoId);
      if (index !== -1) {
        // spliceは削除された要素を返す。ここではSymbol.disposeが自動で呼ばれる。
        globalStore.todos.splice(index, 1, { atomicContext: ops.context });
      }
    });
  }
};
```

```typescript
/*
// Reactコンポーネントの利用イメージ (App.tsx)
import React from 'react';
import { useValue } from './fiddich';
import { globalStore, todoItemActions } from './store'; // 作成したストアとアクションをインポート

const TodoItemComponent: React.FC<{ item: TodoItem }> = ({ item }) => {
  const text = useValue(item.text);
  const completed = useValue(item.completed);

  return (
    <li style={{ textDecoration: completed ? 'line-through' : 'none' }}>
      <span onClick={() => todoItemActions.toggleTodoCompletion(item.id)}>
        {text}
      </span>
      <button onClick={() => todoItemActions.removeTodoItem(item.id)}>Remove</button>
    </li>
  );
};

const TodoList: React.FC = () => {
  const todos = useValue(globalStore.todos); // ReactiveArray<TodoItem> の値を購読

  return (
    <ul>
      {todos.map(todo => (
        <TodoItemComponent key={todo.id} item={todo} />
      ))}
    </ul>
  );
};

const AddTodo: React.FC = () => {
  const [text, setText] = React.useState('');

  const handleAdd = () => {
    if (text.trim()) {
      todoItemActions.addTodoItem(text.trim());
      setText('');
    }
  };

  return (
    <div>
      <input type="text" value={text} onChange={e => setText(e.target.value)} />
      <button onClick={handleAdd}>Add Todo</button>
    </div>
  );
};

const App: React.FC = () => {
  React.useEffect(() => {
    // アプリケーション終了時にグローバルストアをSymbol.dispose
    return () => {
      globalStore[Symbol.dispose]();
    };
  }, []);

  return (
    <div>
      <h1>Todo App with Fiddich-Next</h1>
      <AddTodo />
      <React.Suspense fallback={<p>Updating...</p>}>
        <TodoList />
      </React.Suspense>
    </div>
  );
};

export default App;
*/
```

### 6.1. リソース管理の推奨パターン (Symbol.disposeの利用)

本ライブラリでは、Cell、Computed、ReactiveCollection、そしてcreateManagedObjectによって生成されるManagedObjectが、それぞれSymbol.disposeメソッドを通じたリソース解放の仕組みを提供します。これにより、メモリリークを防ぎ、アプリケーションを安定して動作させることが可能です。

#### 基本的なリソース解放

* 各エンティティ（Cell, Computed, ReactiveCollection, ManagedObject）は、不要になった際に自身のSymbol.disposeメソッドを呼び出すことで、関連する内部リソースや購読を解放します。
* Cellは、Symbol.disposeされる際に、保持している値がSymbol.dispose可能であればその値のSymbol.disposeも行います。
* set操作でCellの値が差し替えられる際も、以前の値がSymbol.dispose可能であれば自動的にSymbol.disposeされます。

#### トランザクショナルなリソース解放 (ops.dispose)

* atomicUpdateのスコープ内でリソースの解放をトランザクショナルに行いたい場合（つまり、トランザクションのコミット時のみ実行し、ロールバック時には実行しないようにしたい場合）は、`ops.dispose(target)`を利用します。
* `target[Symbol.dispose]()`を直接呼び出すと、トランザクションの状態に関わらず即時実行されます。

#### ReactiveCollectionによる自動リソース管理

* ReactiveCollection（例: ReactiveMap, ReactiveArray）は、要素がコレクションから削除される際（例: delete, pop, spliceなど）や、コレクション自体がSymbol.disposeされる際に、保持している要素のSymbol.disposeメソッドを自動的に呼び出します。
* atomicUpdateスコープ内でこれらの操作を行う場合、ReactiveCollectionのメソッドにops.context（またはAtomicContextを含むオプションオブジェクト）を渡すことで、要素のSymbol.disposeもトランザクショナルに（コミット時まで遅延して）実行されるように設計されます。

#### createManagedObjectによる包括的なリソース管理

* createManagedObjectは、生成されたオブジェクトのSymbol.dispose時に、そのオブジェクトが内部に持つCell、Computed、他のManagedObject、ReactiveCollectionなどのdisposableなメンバーを再帰的にSymbol.disposeする仕組みを提供します。
* 開発者は、ファクトリ関数内で独自のSymbol.disposeロジックを定義し、ライブラリによる自動Symbol.disposeチェーンと協調させることも可能です。
* これにより、特にネストした**アプリケーションロジック**オブジェクトやコレクションを含む複雑な構造のリソース管理が大幅に簡略化され、安全性も向上します。

#### 手動管理の選択肢

これらの自動化・半自動化の仕組みを利用せず、従来通りプレーンなオブジェクトや基本的なCell/Computedを用いて、開発者がSymbol.disposeメソッドを明示的に呼び出してリソースを管理することも引き続き可能です。これにより、パフォーマンス要件や対象の複雑さに応じて最適な管理方法を選択できる柔軟性が提供されます。

これらのパターンを適切に組み合わせることで、アプリケーションの特性に応じた堅牢かつ効率的なリソース管理を実現できます。

## 7. 今後の検討事項

* パフォーマンス特性の検証と最適化（特にProxyやReactiveCollectionのオーバーヘッド）。
* デバッグユーティリティの提供（リアクティブな依存関係やAtomicContextの状態を可視化するツールなど）。
* サーバーサイドレンダリング（SSR）やReact Server Components（RSC）との親和性の詳細な検証と、必要に応じた対応。

## 8. 実装方針

* **Reactとの連携**: useSyncExternalStore をフックの基盤として利用し、ReactのConcurrent Featuresとの互換性を確保します。これにより、ティアリングのない安定したUI更新を実現します。

* **API設計とthis問題の回避**: ライブラリの公開APIは、利用者が予期せぬコンテキストで関数を呼び出す（例: メソッドを変数に代入して呼び出す、イベントハンドラとして渡すなど）可能性を考慮し、原則としてクラスベースの実装を避けます。関数や、メソッドを持つプレーンなオブジェクトを返すファクトリ関数パターンを基本とすることで、thisの束縛問題に起因する実行時エラーを防ぎ、より安全で予測可能なAPIを提供します。

* **メモリ管理**: WeakMap や WeakSet などのWeak系コレクションは、その挙動が予測しづらく、デバッグを困難にする可能性があるため、コアなリアクティブグラフの管理には使用しません。リソースのライフサイクルは、Symbol.dispose メソッドによる明示的な解放を基本戦略とします。

## 9. 未来像

### 9.1. AsyncContextによる開発者体験の向上

現在、atomicUpdate内で状態操作を行うには、コールバック関数の引数として渡されるopsオブジェクトを経由する必要があります。これは、トランザクションのコンテキスト（どの変更が同じアトミックな操作に属するか）を明示的に管理するためです。

```typescript
// 現在のAPI
atomicUpdate(ops => {
  const currentCount = ops.get(count);
  ops.set(count, currentCount + 1);
});
```

将来的に、TC39でプロポーザルとして議論されている AsyncContext が標準的な機能として利用可能になった場合、このトランザクションのコンテキストを非同期処理にまたがって暗黙的に伝播させることが可能になります。これにより、opsオブジェクトを介さずに、トップレベルのgetやsetを直接呼び出す、より直感的で自然な記述が実現できる可能性があります。

```typescript
// AsyncContextを利用した未来のAPIイメージ
atomicUpdate(() => {
  // `ops`を介さず、トップレベル関数を直接利用
  const currentCount = get(count);
  set(count, currentCount + 1);
});
```

この変更は、ライブラリのAPIをよりシンプルにし、開発者がロジックの記述にさらに集中できるよう貢献するものです。AsyncContextの標準化動向を注視し、利用可能になった段階で、後方互換性を維持しつつ、この新しい記述スタイルをサポートすることを検討します。