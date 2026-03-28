export function formatList(list: any) {
    return {
        ...list,
        shared_with: list.shared_with.map((u: any) => ({
            email: u.user.email,
            name: u.user.name
        }))
    };
};