export async function transferMoney(db, from, to, amount) {
  const sender = await db.getBalance(from);
  const receiver = await db.getBalance(to);
  await db.setBalance(from, sender - amount);
  await db.setBalance(to, receiver + amount);
  return { from, to, amount };
}
