import fs from 'fs';
import path from 'path';
import { Mongo } from 'meteor/mongo';
import { Projects, Sheets, Rows, Channels } from '../imports/collections.js';
import { MediaFiles } from '../imports/mediaServer.js';

const SeedState = new Mongo.Collection('reviewer_seed_state');
const seedId = 'audioguide-v1';

// Only the local reviewer Compose stack sets INTERKIT_SEED_ARCHIVE_PATH.
export function seedAudioguide() {
  const archivePath = process.env.INTERKIT_SEED_ARCHIVE_PATH;
  if (!archivePath || SeedState.findOne(seedId)) return;

  const data = JSON.parse(fs.readFileSync(path.join(archivePath, 'db.json'), 'utf8'));
  const projectId = '8HQbW3NPRFFdPR5Ni';
  if (data.project?._id !== projectId || !Array.isArray(data.sheets) ||
      !Array.isArray(data.rows) || !Array.isArray(data.files) ||
      !Array.isArray(data.channels)) {
    throw new Error('The audioguide seed archive is incomplete or has the wrong project ID');
  }

  const mediaPath = process.env.MEDIAFILES_PATH;
  if (!mediaPath) throw new Error('MEDIAFILES_PATH is required to seed the audioguide');

  // Check every source file before changing the database. Keep the original IDs:
  // rows and project content refer to those IDs, including media IDs.
  for (const file of data.files) {
    if (!/^[A-Za-z0-9]+$/.test(file._id) || !/^\.[A-Za-z0-9]+$/.test(file.extensionWithDot)) {
      throw new Error(`Invalid media filename in audioguide archive: ${file._id}`);
    }
    const source = path.join(archivePath, 'media', file._id + file.extensionWithDot);
    if (!fs.existsSync(source)) throw new Error(`Missing audioguide media: ${source}`);
  }

  // An existing project belongs to the user. Never replace edited content.
  if (!Projects.findOne(projectId)) {
    fs.mkdirSync(mediaPath, { recursive: true });
    for (const file of data.files) {
      const filename = file._id + file.extensionWithDot;
      const destination = path.join(mediaPath, filename);
      if (!fs.existsSync(destination)) {
        fs.copyFileSync(path.join(archivePath, 'media', filename), destination);
      }
      const document = {
        ...file,
        path: destination,
        _storagePath: mediaPath,
        meta: {
          ...file.meta,
          createdAt: file.meta?.createdAt ? new Date(file.meta.createdAt) : undefined,
        },
        versions: {
          ...file.versions,
          original: { ...file.versions.original, path: destination },
        },
      };
      if (!MediaFiles.collection.findOne(file._id)) MediaFiles.collection.insert(document);
    }
    for (const sheet of data.sheets) {
      if (!Sheets.findOne(sheet._id)) Sheets.insert(sheet);
    }
    for (const row of data.rows) {
      if (!Rows.findOne(row._id)) Rows.insert(row);
    }
    for (const channel of data.channels) {
      if (!Channels.findOne(channel._id)) Channels.insert(channel);
    }
    const project = {
      ...data.project,
      history: (data.project.history || []).map(entry => ({
        ...entry,
        date: entry.date ? new Date(entry.date) : undefined,
      })),
    };
    Projects.insert(project);
    console.log(`Seeded audioguide ${projectId} from ${archivePath}`);
  }

  SeedState.insert({ _id: seedId, projectId, importedAt: new Date() });
}
