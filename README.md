# Action switcher for redux

# Usage

So the "switcher" is basically typescript-friendly reduce "function", which also has "combineReducers" functionality.

Pretty small library, you can use when:
* you want to have "unnamed" actions (action types will be just "1", "2" etc), you can give type name though
* you want to have action factory and the code that will change state in one place
* you want to reuse code when you have the same state signature in several places

Imagine you have next types:

```typescript
interface IState1 {
	a: string;
	b: number;
	c: string;
}

interface IState2 {
	d: string;
}

type IState3 = IState1 & IState2;

interface IState4 extends IState1 {
	e: IState2;
}
```

You can create action with next signature:

```typescript
interface IActionWithStringValue extends IAction {
	value: string;
}
```

and create next action factories:

```typescript
const switcher = new ActionSwitcher<IState1>({});

const setA = createActionFactory(switcher, {
    apply(state: IState1, action: IActionWithStringValue): IState1 {
        return { ...state, a: action.value };
    },
});

const setC = createActionFactory(switcher, {
    apply(state: IState1, action: IActionWithStringValue): IState1 {
        return { ...state, c: action.value };
    },
});

let state1 = {} as IState1;
state1 = switcher.apply(state1, setA({value: "hello"}));
state1 = switcher.apply(state1, setC({value: "world"}));
```

we created here 2 action factories which are using the same action signature, but have different types (they will be here "1", "2",
as we didn't specify type explicitly). `switcher.apply` is the reducer function. So in normal application it will be used as
`dispatch(setA({value: "hello"}))`

To create an action factory for actions with known type, use next:

```typescript
const setC = createActionFactory(switcher, {
    apply(state: IState1, action: IActionWithStringValue): IState1 {
        return { ...state, c: action.value };
    },
    TYPE: "set_c",
});

```

We could also create a switcher for intersection types:

```typescript
const switcher = new ActionSwitcher<IState3>({});

const setA = createActionFactory(switcher, {
    apply(state: IState3, action: IActionWithStringValue): IState3 {
        return { ...state, a: action.value };
    },
});

const switcher2 = new ActionSwitcher<IState2>({});

const setD = createActionFactory(switcher2, {
    apply(state: IState2, action: IActionWithStringValue): IState2 {
        return { ...state, d: action.value };
    },
});

switcher.attachBrother(switcher2);

let state3 = {} as IState3;

state3 = switcher.apply(state3, setA({value: "hello"}));
state3 = switcher.apply(state3, setD({value: "hello3"}));
expect(state3).toEqual({a: "hello", d: "hello3"});
```

We can also create a switcher for "child" state (basically combineReducers):

```typescript
const switcher = new ActionSwitcher<IState4>({});

const setA = createActionFactory(switcher, {
    apply(state: IState4, action: IActionWithStringValue): IState4 {
        return { ...state, a: action.value };
    },
});

const switcher2 = new ActionSwitcher<IState2>({});

const setD = createActionFactory(switcher2, {
    apply(state: IState2, action: IActionWithStringValue): IState2 {
        return { ...state, d: action.value };
    },
});

switcher.attachChild("e", switcher2);

let state4 = {} as IState4;

state4 = switcher.apply(state4, setA({value: "hello"}));
state4 = switcher.apply(state4, setD({value: "hello3"}));
expect(state4).toEqual({a: "hello", e: {d: "hello3"}});
```

As a bonus, when you attach switchers to parent/brother switcher, it moves rules from the brother/child switcher to itself,
so you will have only one map "action type" -> "action applier".
Additionally `attachChild` takes 3-rd boolean argument (false by default) to "enhance" action type with field name.
For example if `switcher.attachChild("e", switcher2);` would create an action with type `action_type` then `switcher.attachChild("e", switcher2, true);` would create `e/action_type`.

It does not set initial state for you, you can get it as `rootSwitcher.getInitialState();` and use it as 

```typescript
const rootReducer = (state: IState, action: any) => {
	return rootSwitcher.apply(state, action);
};

const initialState = rootSwitcher.getInitialState();

createStore(rootReducer, initialState);
```

Example of usage can be seen at: [electron-react-typescript-boilerplate](https://github.com/apotap2/electron-react-typescript-boilerplate) fork.