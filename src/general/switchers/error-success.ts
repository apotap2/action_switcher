import { IErrorSuccessState, emptyErrorSuccessState } from "../states/error-success";
import {
	IAction,
	createActionFactory,
	ActionSwitcher,
	ICreateAction,
} from "../..";

export interface IActionWithMessage extends IAction {
	readonly message: string;
}

export function createErrorSuccessSwitcher(
		inputSwitcher?: ActionSwitcher<IErrorSuccessState>,
	): ActionSwitcher<IErrorSuccessState> {

	const switcher = inputSwitcher ? inputSwitcher : new ActionSwitcher(emptyErrorSuccessState());

	createActionFactory(switcher, {
		apply(state: IErrorSuccessState): IErrorSuccessState {
			return { ...state, lastError: null, lastSuccess: null };
		},
	}, "resetErrorAndSuccess");

	createActionFactory(switcher, {
		apply(state: IErrorSuccessState, action: IActionWithMessage): IErrorSuccessState {
			return { ...state, lastError: action.message, lastSuccess: null };
		},
	}, "gotError");

	createActionFactory(switcher, {
		apply(state: IErrorSuccessState, action: IActionWithMessage): IErrorSuccessState {
			return { ...state, lastError: null, lastSuccess: action.message };
		},
	}, "gotSuccessResult");

	return switcher;
}

export interface IErrorSuccessFactories {
	resetErrorAndSuccess: ICreateAction<IActionWithMessage>;
	gotError: ICreateAction<IActionWithMessage>;
	gotSuccessResult: ICreateAction<IActionWithMessage>;
}
