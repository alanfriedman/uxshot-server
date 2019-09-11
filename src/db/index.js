import knexLib from 'knex';

export const knex = knexLib({
  client: 'mysql',
  connection: process.env.DATABASE_URL,
  pool: {
    afterCreate(conn, done) {
      conn.query('SET @@session.time_zone = "+00:00";', err => {
        done(err, conn);
      });
    }
  }
});

export async function query(sql, bindings = []) {
  try {
    const result = await knex.raw(sql, bindings);
    return result[0];
  } catch (err) {
    throw new Error(err);
  }
}
