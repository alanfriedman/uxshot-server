exports.up = function(knex, Promise) {
  return knex.schema.raw(`alter table shots
    add constraint shots_slug_unique unique (slug);
  `);
};

exports.down = function(knex, Promise) {};
