import LevelUp from '../src/levelup';

const db = new LevelUp('testdb/db_testloc');
const dbCloseable = new LevelUp('testdb/db_testclose');

export { db, dbCloseable };
