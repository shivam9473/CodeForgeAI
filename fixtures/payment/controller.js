export async function createPayment(req, db) {
  const { from, to, amount } = req.body;
  const row = await db.insertPayment({ from, to, amount });
  return { id: row.id, status: "created" };
}
