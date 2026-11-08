export type ToyBoard = 1 | 2 | 3 | 4 | 5
export type ToyBoards = Readonly<Record<string, Readonly<Record<string, ToyBoard>>>>

export const toyBoards: ToyBoards = {}
