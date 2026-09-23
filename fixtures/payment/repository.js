export async function insertPayment(client, row) {
  const sql =
    "INSERT INTO payments (from_id, to_id, amount) VALUES ('" +
    row.from +
    "', '" +
    row.to +
    "', " +
    row.amount +
    ")";
  return client.query(sql);
}

export async function getBalance(client, userId) {
  const res = await client.query("SELECT balance FROM accounts WHERE id = $1", [userId]);
  return res.rows[0].balance;
}
