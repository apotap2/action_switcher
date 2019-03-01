export interface IAction {
	readonly type: string;
	readonly idx?: number;
}

type Applier<T, S extends IAction> = (state: T, action: S) => T;

export interface ICreateAction<S extends IAction> {
	(partial?: Partial<S>): S;
	TYPE(): string;
}

interface IActionFactory<S extends IAction, T> {
	TYPE: string;
	apply: Applier<T, S>;
	create: ICreateAction<S>;
}

export class ActionSwitcher<T> {
	public factories: { [alias: string]: ICreateAction<IAction> } = {};
	private _rules: { [TYPE: string]: IActionFactory<IAction, T>; } = {};
	private _initialState: T;
	private _children: { [field: string]: ActionSwitcher<any> } = {};
	private _arrayChildren: { [field: string]: { switcher: ActionSwitcher<any>, initSize: number } } = {};
	private _brothers: Array<ActionSwitcher<any>> = [];

	constructor(initialState: Partial<T>) {
		this._initialState = initialState as T;
	}

	public getInitialState(): T {
		let result = this._initialState;

		this._brothers.forEach((brother) => {
			result = { ...result, ...brother._initialState };
		});

		Object.keys(this._children).forEach((field) => {
			result[field as keyof T] = this._children[field].getInitialState();
		});

		Object.keys(this._arrayChildren).forEach((field) => {
			const info = this._arrayChildren[field];
			const anyResult = result as any;
			anyResult[field as keyof T] = [];
			for (let i = 0; i < info.initSize; ++i) {
				anyResult[field as keyof T].push(info.switcher.getInitialState());
			}
		});

		return result;
	}

	public with<S extends IAction>(factory: IActionFactory<S, T>): ActionSwitcher<T> {
		return this.on(factory.TYPE, factory);
	}

	public on<S extends IAction>(actionType: string, factory: IActionFactory<S, T>): ActionSwitcher<T> {
		this._rules[actionType] = factory;
		return this;
	}

	public apply(state: T, action: IAction): T {
		const factory = this._rules[action.type];
		if (factory) {
			const newState = factory.apply(state, action);
			return newState;
		}
		return state;
	}

	public attachChild<С extends keyof T>(field: С, child: ActionSwitcher<any>, useFieldInType: boolean = false) {
		if (this._children.hasOwnProperty(field) || this._arrayChildren.hasOwnProperty(field)) {
			throw new Error(`already has action switcher for the field ${field}`);
		}

		this._children[field as string] = child;
		Object.keys(child._rules).forEach((TYPE) => {
			const factory = child._rules[TYPE];
			const typeToUse = useFieldInType ? `${field}/${TYPE}` : TYPE;
			factory.TYPE = typeToUse;
			const oldApplier = factory.apply;
			const newApplier = (state: T, action: IAction): T => {
				const childState = state[field];
				const newChildState = oldApplier(childState, action);
				if (childState === newChildState) {
					return state;
				}
				return { ...state, [field]: newChildState };
			};
			factory.apply = newApplier;
			this.on(typeToUse, factory);
		});
		child._rules = {};
	}

	public attachArrayChild<С extends keyof T>(
		field: С,
		child: ActionSwitcher<any>,
		initSize: number = 0,
		useFieldInType: boolean = false,
	) {
		if (this._children.hasOwnProperty(field) || this._arrayChildren.hasOwnProperty(field)) {
			throw new Error(`already has action switcher for the field ${field}`);
		}

		this._arrayChildren[field as string] = { switcher: child, initSize };
		Object.keys(child._rules).forEach((TYPE) => {
			const factory = child._rules[TYPE];
			const typeToUse = useFieldInType ? `${field}/${TYPE}` : TYPE;
			factory.TYPE = typeToUse;
			const oldApplier = factory.apply;
			const newApplier = (state: T, action: IAction): T => {
				const childArrayState = state[field] as unknown as any[];
				const childState = childArrayState[action.idx];
				const newChildState = oldApplier(childState, action);
				if (childState === newChildState) {
					return state;
				}
				const newChildArrayState = [...childArrayState];
				newChildArrayState[action.idx] = newChildState;
				return { ...state, [field]: newChildArrayState };
			};
			factory.apply = newApplier;
			this.on(typeToUse, factory);
		});
		child._rules = {};
	}

	public attachBrother<T2 extends Partial<T>>(brother: ActionSwitcher<T2>) {
		this._brothers.push(brother);
		Object.keys(brother._rules).forEach((TYPE) => {
			const factory = brother._rules[TYPE];
			const oldApplier = factory.apply;
			const newApplier = (state: T2, action: IAction): T2 => {
				const broState = (state as any) as T2;
				const newBroState = oldApplier(broState, action);
				if (broState === newBroState) {
					return state;
				}
				return { ...state, ...newBroState };
			};
			factory.apply = newApplier;
			this.on(TYPE, factory as unknown as IActionFactory<IAction, T>);
		});
		brother._rules = {};
	}
}

let actionId = 0;

export function createActionFactory<S extends IAction, T>(
	switcher: ActionSwitcher<T>,
	partial: Partial<IActionFactory<S, T>>,
	inSwitcherAlias: string | null = null,
): ICreateAction<S> {
	const type: string = partial.TYPE ? partial.TYPE : String(++actionId);
	if (!partial.apply) {
		throw new Error("apply should be provided");
	}
	if (partial.create) {
		throw new Error("don't provide your create");
	}

	const res = {
		TYPE: type,
		apply: partial.apply,
	} as IActionFactory<S, T>;

	const create: ICreateAction<S> = Object.assign(
		(partialAction?: Partial<S>): S => ({ ...partialAction, idx: partialAction.idx, type: res.TYPE } as S),
	);
	create.TYPE = () => res.TYPE;
	res.create = create;

	switcher.with(res);
	if (inSwitcherAlias) {
		if (switcher.factories.hasOwnProperty(inSwitcherAlias)) {
			throw new Error("alias is already used");
		}
		switcher.factories[inSwitcherAlias] = res.create;
	}
	return res.create;
}
