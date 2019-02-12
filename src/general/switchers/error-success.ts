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
		TYPE: "RESET_ERROR_AND_SUCCESS",
	}, "resetErrorAndSuccess");

	createActionFactory(switcher, {
		apply(state: IErrorSuccessState, action: IActionWithMessage): IErrorSuccessState {
			return { ...state, lastError: action.message, lastSuccess: null };
		},
		TYPE: "GOT_ERROR",
	}, "gotError");

	createActionFactory(switcher, {
		apply(state: IErrorSuccessState, action: IActionWithMessage): IErrorSuccessState {
			return { ...state, lastError: null, lastSuccess: action.message };
		},
		TYPE: "GOT_SUCCESS_RESULT",
	}, "gotSuccessResult");

	return switcher;
}

export interface IErrorSuccessFactories {
	resetErrorAndSuccess: ICreateAction<IAction>;
	gotError: ICreateAction<IActionWithMessage>;
	gotSuccessResult: ICreateAction<IActionWithMessage>;
}
