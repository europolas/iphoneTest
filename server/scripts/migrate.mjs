import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
const connection = await mysql.createConnection({ host: 'db', user: 'root', password: readFileSync('/run/secrets/db_root', 'utf8').trim(), database: 'iphone_test', multipleStatements: true });
try {
  await connection.query(readFileSync('/app/schema.sql', 'utf8'));
  const password = readFileSync('/run/secrets/db_app', 'utf8').trim();
  await connection.query("CREATE USER IF NOT EXISTS 'iphone_app'@'%' IDENTIFIED BY ?", [password]);
  await connection.query("ALTER USER 'iphone_app'@'%' IDENTIFIED BY ?", [password]);
  await connection.query("GRANT SELECT, INSERT, UPDATE, DELETE ON iphone_test.* TO 'iphone_app'@'%'");
  console.log('Created application tables and restricted database account.');
} finally { await connection.end(); }
