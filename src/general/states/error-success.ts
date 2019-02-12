export interface IErrorSuccessState {
	lastError: string | null;
	lastSuccess: string | null;
}

export function emptyErrorSuccessState(): IErrorSuccessState {
	return {
		lastError: null,
		lastSuccess: null,
	} as IErrorSuccessState;
}
