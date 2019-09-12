exports.up = function(knex, Promise) {
  return knex.schema.raw(`alter table shots
    add errors text default null;
  `);
};

exports.down = function(knex, Promise) {};
