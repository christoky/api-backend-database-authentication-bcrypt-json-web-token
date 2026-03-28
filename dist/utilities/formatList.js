export function formatList(list) {
    return {
        ...list,
        shared_with: list.shared_with.map((u) => ({
            email: u.user.email,
            name: u.user.name
        }))
    };
}
;
