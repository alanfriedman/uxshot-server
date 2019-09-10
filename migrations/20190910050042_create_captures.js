exports.up = function(knex, Promise) {
  return knex.schema.raw(`CREATE TABLE shots (
    id int(10) unsigned NOT NULL AUTO_INCREMENT,
    slug varchar(255) not null,
    description text default null,
    type varchar(255) not null,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )`);
};

exports.down = function(knex, Promise) {};
