export function requirePerm(userPerms: string[], needed: string) {
  if (!userPerms.includes(needed)) {
    const err = new Error("FORBIDDEN");
    // @ts-expect-error
    err.code = "FORBIDDEN";
    throw err;
  }
}
