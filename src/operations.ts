// Welcome to DBOS!

// This is a sample "Hello" app built with DBOS.
// It greets visitors and keeps track of how many times each visitor has been greeted.
// To run this app, visit our Quickstart: https://docs.dbos.dev/getting-started/quickstart

import { HandlerContext, TransactionContext, Transaction, GetApi, ArgSource, ArgSources, StoredProcedure, StoredProcedureContext } from '@dbos-inc/dbos-sdk';
import { Knex } from 'knex';

// The schema of the database table used in this example.
export interface dbos_hello {
  name: string;
  greet_count: number;
}

export class Hello {

  // Serve this function from HTTP GET requests at the /greeting endpoint with 'user' as a path parameter
  @GetApi('/greeting/:user')
  @Transaction()  // Run this function as a database transaction
  static async helloTransaction(ctxt: TransactionContext<Knex>, @ArgSource(ArgSources.URL) user: string) {
    // Retrieve and increment the number of times this user has been greeted.
    const query = "INSERT INTO dbos_hello (name, greet_count) VALUES (?, 1) ON CONFLICT (name) DO UPDATE SET greet_count = dbos_hello.greet_count + 1 RETURNING greet_count;";
    const { rows } = await ctxt.client.raw(query, [user]) as { rows: dbos_hello[] };
    const greet_count = rows[0].greet_count;
    const greeting = `Hello, ${user}! You have been greeted ${greet_count} times.`;
    return Hello.makeHTML(greeting);
  }

  @GetApi('/root')
  @Transaction()
  static async root(ctxt: TransactionContext<Knex>) {
    ctxt.logger.info(`root start ${ctxt.workflowUUID}`);
    return await ctxt.client.raw("select xx()")
  }

  @GetApi('/root2')
  @Transaction()
  static async root2(ctxt: TransactionContext<Knex>) {
    try {
      return await ctxt.client.raw("select xx()")
    } catch (e) {
      return "all good"
    }
  }

  @GetApi('/root4')
  @Transaction()
  static async root4(ctxt: TransactionContext<Knex>) {
    ctxt.logger.info(`root4 start ${ctxt.workflowUUID}`);
    try {
      await ctxt.client.raw("SAVEPOINT sp1")
      await ctxt.client.raw("select xx()")
    } catch (e) {
      await ctxt.client.raw("ROLLBACK TO SAVEPOINT sp1")
      return "all good"
    }
  }

  @StoredProcedure()
  static async root3(ctxt: StoredProcedureContext) {
    ctxt.logger.info(`root3 start ${ctxt.workflowUUID}`);
    try {
      return await ctxt.query("select xx()", [])
    } catch (e) {
      ctxt.logger.warn(`root3 catch ${ctxt.workflowUUID} ${(e as Error).message}`);
      await ctxt.query("INSERT INTO dbos_errors (wfid, error_message) VALUES ($1, $2)", [ctxt.workflowUUID, (e as Error).message]);
      return "all good"
    }
  }

  @GetApi('/root3')
  static async root3handler(ctxt: HandlerContext) {
    return await ctxt.invoke(Hello).root3();
  }

  // Serve a quick readme for the app at the / endpoint
  @GetApi('/')
  static async readme(_ctxt: HandlerContext) {
    const message = Hello.makeHTML(
      `Visit the route <code class="bg-gray-100 px-1 rounded">/greeting/{name}</code> to be greeted!<br>
      For example, visit <code class="bg-gray-100 px-1 rounded"><a href="/greeting/Mike" class="text-blue-600 hover:underline">/greeting/Mike</a></code><br>
      The counter increments with each page visit.`
    );
    return Promise.resolve(message);
  }

  // A helper function to create HTML pages with some styling
  static makeHTML(message: string) {
    const page = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <title>DBOS Template App</title>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="font-sans text-gray-800 p-6 max-w-2xl mx-auto">
          <h1 class="text-3xl font-semibold mb-4">Welcome to DBOS!</h1>
          <p class="mt-8 mb-8">` + message + `</p>
          <p class="mb-2">
              To learn how to run this app yourself, visit our
              <a href="https://docs.dbos.dev/getting-started/quickstart" class="text-blue-600 hover:underline">Quickstart</a>.
          </p><p class="mb-2">
              Then, to learn how to build crashproof apps, continue to our
              <a href="https://docs.dbos.dev/getting-started/quickstart-programming" class="text-blue-600 hover:underline">Programming Guide</a>.<br>
          </p>
      </body>
      </html>`;
    return page;
  }
}
