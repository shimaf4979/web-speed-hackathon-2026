import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { Sequelize } from "sequelize";

import { initModels } from "@web-speed-hackathon-2026/server/src/models";
import { DATABASE_PATH } from "@web-speed-hackathon-2026/server/src/paths";

const RETIRED_CONNECTION_GRACE_PERIOD_MS = 30_000;

type SequelizeState = {
  sequelize: Sequelize;
  tempPath: string;
};

let currentState: SequelizeState | null = null;
let initializePromise: Promise<void> | null = null;

async function createSequelizeState(): Promise<SequelizeState> {
  const tempPath = path.resolve(
    await fs.mkdtemp(path.resolve(os.tmpdir(), "./wsh-")),
    "./database.sqlite",
  );
  await fs.copyFile(DATABASE_PATH, tempPath);

  const sequelize = new Sequelize({
    dialect: "sqlite",
    logging: false,
    storage: tempPath,
    retry: { max: 5 },
  });

  await sequelize.query("PRAGMA journal_mode = WAL;");
  await sequelize.query("PRAGMA busy_timeout = 5000;");
  initModels(sequelize);

  return {
    sequelize,
    tempPath,
  };
}

function retireSequelizeState(state: SequelizeState) {
  void (async () => {
    await sleep(RETIRED_CONNECTION_GRACE_PERIOD_MS);

    try {
      await state.sequelize.close();
    } catch (error) {
      console.error("[sequelize] failed to close retired connection", { error });
    }

    try {
      await fs.rm(path.dirname(state.tempPath), { force: true, recursive: true });
    } catch (error) {
      console.error("[sequelize] failed to remove retired temp database", {
        error,
        tempPath: state.tempPath,
      });
    }
  })();
}

export async function initializeSequelize() {
  if (initializePromise != null) {
    await initializePromise;
    return;
  }

  initializePromise = (async () => {
    const nextState = await createSequelizeState();
    const previousState = currentState;
    currentState = nextState;

    if (previousState != null) {
      retireSequelizeState(previousState);
    }
  })();

  try {
    await initializePromise;
  } finally {
    initializePromise = null;
  }
}
