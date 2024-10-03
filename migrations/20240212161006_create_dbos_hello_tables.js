const { Knex } = require("knex");

exports.up = async function(knex) {
  await knex.schema.createTable('dbos_hello', table => {
    table.text('name').primary();
    table.integer('greet_count').defaultTo(0);
  });

  await knex.schema.createTable('dbos_greetings', table => {
    table.text('greeting_name');
    table.text('greeting_note_content');
  });

  await knex.schema.createTable('dbos_errors', table => {
    table.increments('id').primary();
    table.text('wfid');
    table.text('error_message');
  });

  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION xx() returns void as $$
    BEGIN
      raise 'password_too_short';
    END
    $$ language plpgsql;`)
};

exports.down = async function(knex) {
  await knex.schema.dropTable('dbos_greetings');
  await knex.schema.dropTable('dbos_hello');
  await knex.schema.dropTable('dbos_errors');
  await knex.schema.raw('DROP FUNCTION IF EXISTS xx()');
};
