import * as fs from "node:fs/promises";
import path from "node:path";

import { QueryTypes, Sequelize } from "sequelize";

import { initModels } from "@web-speed-hackathon-2026/server/src/models";
import { DATABASE_PATH } from "@web-speed-hackathon-2026/server/src/paths";
import { insertSeeds } from "@web-speed-hackathon-2026/server/src/seeds";

const __dirname = import.meta.dirname;

const INPUT_PATHS = [
  path.resolve(__dirname, "../seeds"),
  path.resolve(__dirname, "../src/models"),
  path.resolve(__dirname, "../src/seeds.ts"),
  path.resolve(__dirname, "./insertSeeds.ts"),
  path.resolve(__dirname, "./prepareDatabase.ts"),
];

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getLatestMtimeMs(targetPath: string): Promise<number> {
  const stats = await fs.stat(targetPath);
  if (stats.isDirectory() === false) {
    return stats.mtimeMs;
  }

  const dirents = await fs.readdir(targetPath, { withFileTypes: true });
  const childMtimes = await Promise.all(
    dirents.map((dirent) => getLatestMtimeMs(path.join(targetPath, dirent.name))),
  );
  return Math.max(stats.mtimeMs, ...childMtimes);
}

async function getRequiredInputsMtimeMs() {
  let latestMtimeMs = 0;

  for (const inputPath of INPUT_PATHS) {
    if (await pathExists(inputPath)) {
      latestMtimeMs = Math.max(latestMtimeMs, await getLatestMtimeMs(inputPath));
    }
  }

  return latestMtimeMs;
}

async function hasRequiredSchema() {
  if ((await pathExists(DATABASE_PATH)) === false) {
    return false;
  }

  const sequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: DATABASE_PATH,
  });

  try {
    const columns = await sequelize.query<{ name: string }>("PRAGMA table_info(Sounds);", {
      type: QueryTypes.SELECT,
    });
    return columns.some((column) => column.name === "waveformPeaks");
  } catch {
    return false;
  } finally {
    await sequelize.close();
  }
}

async function shouldRebuildDatabase() {
  if ((await pathExists(DATABASE_PATH)) === false) {
    return true;
  }

  if ((await hasRequiredSchema()) === false) {
    return true;
  }

  const requiredInputsMtimeMs = await getRequiredInputsMtimeMs();
  if (requiredInputsMtimeMs === 0) {
    return false;
  }

  const databaseStats = await fs.stat(DATABASE_PATH);
  return databaseStats.mtimeMs < requiredInputsMtimeMs;
}

async function rebuildDatabase() {
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
  await fs.rm(DATABASE_PATH, { force: true });

  const sequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: DATABASE_PATH,
  });

  try {
    initModels(sequelize);
    await sequelize.sync({ force: true, logging: false });
    await insertSeeds(sequelize);
  } finally {
    await sequelize.close();
  }
}

if (await shouldRebuildDatabase()) {
  console.log("[db:prepare] rebuilding application/server/database.sqlite from seeds");
  await rebuildDatabase();
} else {
  console.log("[db:prepare] using existing application/server/database.sqlite");
}
