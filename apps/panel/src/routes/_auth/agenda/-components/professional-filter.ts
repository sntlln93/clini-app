// `undefined` = no filter (all selected); `[]` must still show the empty state.
export const isProfessionalFilterEmpty = (
    total: number,
    visible: number,
    ids?: number[],
) => total > 0 && visible === 0 && ids !== undefined;
