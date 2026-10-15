// Isolated test database only. Never expose this unauthenticated wire server.
import {PGlite} from '@electric-sql/pglite';
import {createServer} from 'pglite-server';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const db=new PGlite();await db.waitReady;
await db.exec(readFileSync('prisma/migrations/20261015000000_init/migration.sql','utf8'));
const server=createServer(db);
server.listen(55433,'127.0.0.1',()=>{const child=spawn('npx',['vitest','run','tests/integration.test.ts','tests/auth.test.ts'],{stdio:'inherit',env:{...process.env,RUN_INTEGRATION:'1',DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:55433/postgres?connection_limit=1'}});child.on('exit',async code=>{server.close();await db.close();process.exit(code??1)})});
