import { ActionSwitcher, createActionFactory, IAction, ICreateAction } from "../src/index";

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

interface IActionWithStringValue extends IAction {
	value: string;
}

interface IActionWithNumberValue extends IAction {
	value: number;
}

// ------------------------------------------------

test("should create action factory and register it in switcher reducer for simple state", () => {
	const switcher = new ActionSwitcher<IState1>({});

	const setA = createActionFactory(switcher, {
		apply(state: IState1, action: IActionWithStringValue): IState1 {
			return { ...state, a: action.value };
		},
	});

	const setB = createActionFactory(switcher, {
		apply(state: IState1, action: IActionWithNumberValue): IState1 {
			return { ...state, b: action.value };
		},
	});

	// it also shows you can use actions with the same type several times
	const setC = createActionFactory(switcher, {
		apply(state: IState1, action: IActionWithStringValue): IState1 {
			return { ...state, c: action.value };
		},
	});

	let state1 = {} as IState1;
	state1 = switcher.apply(state1, setA({ value: "hello" }));
	state1 = switcher.apply(state1, setB({ value: 42 }));
	state1 = switcher.apply(state1, setC({ value: "world" }));
	expect(state1).toEqual({ a: "hello", b: 42, c: "world" });
});

test("should be able to use action factory by alias", () => {
	const switcher = new ActionSwitcher<IState1>({});

	createActionFactory(switcher, {
		apply(state: IState1, action: IActionWithStringValue): IState1 {
			return { ...state, a: action.value };
		},
	}, "setA");

	const setA = switcher.factories.setA as ICreateAction<IActionWithStringValue>;

	let state1 = {} as IState1;
	state1 = switcher.apply(state1, setA({ value: "hello" }));
	expect(state1).toEqual({ a: "hello" });
});

test("should be able to create actions with predefined type", () => {
	const switcher = new ActionSwitcher<IState1>({});

	interface ITestAction extends IAction {
		value: string;
	}

	const setA = createActionFactory(switcher, {
		TYPE: "SetA",
		apply(state: IState1, action: ITestAction): IState1 {
			return { ...state, a: action.value };
		},
	});
	expect(setA.TYPE()).toEqual("SetA");

	const setAAction = setA({ value: "test" });
	expect(setAAction).toEqual({ type: "SetA", value: "test" });

	let state1 = {} as IState1;
	state1 = switcher.apply(state1, setAAction);
	expect(state1).toEqual({ a: "test" });
});

test("should be able to create a switcher for intersection types", () => {
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

	state3 = switcher.apply(state3, setA({ value: "hello" }));
	state3 = switcher.apply(state3, setD({ value: "hello3" }));
	expect(state3).toEqual({ a: "hello", d: "hello3" });
});

test("should be able to attach child switcher", () => {
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

	state4 = switcher.apply(state4, setA({ value: "hello" }));
	state4 = switcher.apply(state4, setD({ value: "hello3" }));
	expect(state4).toEqual({ a: "hello", e: { d: "hello3" } });
});

test("should be able to attach child switcher and change action type path", () => {
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
		TYPE: "setD",
	}, "some");

	expect(setD.TYPE()).toEqual("setD"); // setD before attachment

	switcher.attachChild("e", switcher2, true);
	expect(setD.TYPE()).toEqual("e/setD"); // e/setD before attachment
	expect(setD({value: "asdf"})).toEqual({ type: "e/setD", value: "asdf" });

	// ensure previous behaviour is not broken
	let state4 = {} as IState4;

	state4 = switcher.apply(state4, setA({ value: "hello" }));
	state4 = switcher.apply(state4, setD({ value: "hello3" }));
	expect(state4).toEqual({ a: "hello", e: { d: "hello3" } });
});

test("should get combined initial state", () => {
	const switcher = new ActionSwitcher<IState4>({ a: "some", b: 22, c: "world" });
	const switcher2 = new ActionSwitcher<IState2>({ d: "wait" });
	switcher.attachChild("e", switcher2);

	expect(switcher.getInitialState()).toEqual({ a: "some", b: 22, c: "world", e: { d: "wait" } });
});
