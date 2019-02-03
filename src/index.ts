export interface IAction {
	readonly type: string;
}

type Applier<T, S extends IAction> = (state: T, action: S) => T;

interface IActionFactory<S extends IAction, T> {
	TYPE: string;
	apply: Applier<T, S>;
	create(partial?: Partial<S>): S;
}

export type CreateAction<S extends IAction> = (partial?: Partial<S>) => S;

export class ActionSwitcher<T> {
	public factories: { [alias: string]: (partial?: Partial<IAction>) => IAction } = {};
	private _rules: { [TYPE: string]: Applier<T, IAction>; } = {};
	private _initialState: T;
	private _children: {[field: string]: ActionSwitcher<any>} = {};
	private _brothers: Array<ActionSwitcher<any>> = [];

	constructor(initialState: Partial<T>) {
		this._initialState = initialState as T;
	}

	public getInitialState(): T {
		let result = this._initialState;

		this._brothers.forEach((brother) => {
			result = {...result, ...brother._initialState};
		});

		Object.keys(this._children).forEach((field) => {
			result[field as keyof T] = this._children[field].getInitialState();
		});

		return result;
	}

	public with<S extends IAction>(factory: IActionFactory<S, T>): ActionSwitcher<T> {
		return this.on(factory.TYPE, factory.apply);
	}

	public on<S extends IAction>(actionType: string, applier: Applier<T, S>): ActionSwitcher<T> {
		this._rules[actionType] = applier;
		return this;
	}

	public apply(state: T, action: IAction): T {
		const applier = this._rules[action.type];
		if (applier) {
			const newState = applier(state, action);
			return newState;
		}
		return state;
	}

	public attachChild<С extends keyof T>(field: С, child: ActionSwitcher<any>) {
		if (this._children.hasOwnProperty(field as string)) {
			throw new Error(`already has action switcher for the field ${field}`);
		}

		this._children[field as string] = child;
		Object.keys(child._rules).forEach((TYPE) => {
			const oldApplier = child._rules[TYPE];
			const newApplier = (state: T, action: IAction): T => {
				const childState = state[field];
				const newChildState = oldApplier(childState, action);
				if (childState === newChildState) {
					return state;
				}
				return {...state, [field]: newChildState};
			};
			this.on(TYPE, newApplier);
		});
		child._rules = {};
	}

	public attachBrother<T2>(brother: ActionSwitcher<T2>) {
		this._brothers.push(brother);
		Object.keys(brother._rules).forEach((TYPE) => {
			const oldApplier = brother._rules[TYPE];
			const newApplier = (state: T, action: IAction): T => {
				const broState = (state as any) as T2;
				const newBroState = oldApplier(broState, action);
				if (broState === newBroState) {
					return state;
				}
				return {...state, ...newBroState};
			};
			this.on(TYPE, newApplier);
		});
		brother._rules = {};
	}
}

let actionId = 0;

export function createActionFactory<S extends IAction, T>(
		switcher: ActionSwitcher<T>,
		partial: Partial<IActionFactory<S, T>>,
		inSwitcherAlias: string | null = null,
	): (partial?: Partial<S>) => S {
	const type: string = partial.TYPE ? partial.TYPE : String(++actionId);
	if (!partial.apply) {
		throw new Error("apply should be provided");
	}
	if (partial.create) {
		throw new Error("don't provide your create");
	}
	const create = (partialAction?: Partial<S>) => {
		return {...partialAction, type};
	};
	const res = {
		TYPE: type,
		create,
		apply: partial.apply,
	} as IActionFactory<S, T>;

	switcher.with(res);
	if (inSwitcherAlias) {
		if (switcher.factories.hasOwnProperty(inSwitcherAlias)) {
			throw new Error("alias is already used");
		}
		switcher.factories[inSwitcherAlias] = res.create;
	}
	return res.create;
}
