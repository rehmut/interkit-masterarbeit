import { Meteor } from 'meteor/meteor';
import cors from 'cors'

require('dotenv').config( {
  path: `${process.env.PWD}/.env`
})


import '../imports/collections.js';
import {init as initUserActivity} from "../imports/userActivity.js";
import './publications';
import './userRolesSetup.js';

import './methods/projectMethods.js';
import './methods/sheetMethods.js';
import './methods/userMethods.js';
import './methods/chatMethods.js';
import './methods/themeMethods.js';

import { Projects } from '../imports/collections.js';
import { seedUser } from '../imports/userUtils.js';
import { seedAudioguide } from './seedAudioguide.js';

import { setupWebPush, webPushPublicKey } from '../imports/pushnotifications.js';

Meteor.startup(() => {
  // code to run on server at startup
  
  setupWebPush();

  // see if there is an admin user, otherwise seed one
  seedUser('admin', process.env.ADMIN_PASSWORD, 'admin');
  
  // seed author user
  seedUser('author', process.env.ADMIN_PASSWORD, 'author');

  // setup bundler user
  seedUser('bundler', process.env.BUNDLER_PASSWORD, 'bundler');

  seedAudioguide();

  // reset admin UI
  Projects.update(
    { projectServer: {$exists: true} }, 
    { $set: {"projectServer.actionRequested": null} }, 
    { multi: true }
  )

  // reset devServers
  Projects.update(
    {},
    { $set: { ["devServer.actionRequested"]: "stop" } },
    { multi: true }
  );

  // reset uiState
  Projects.update(
    {},
    { $set: { uiState : {} } },
    { multi: true }
  );

  Projects.update(
    {},
    { $set: { webPushPublicKey } },
    { multi: true }
  )

  initUserActivity();

  // install project templates
  Meteor.call('project.rebuildTemplates')

});


/* setup express server for upload post route */
import { WebApp } from 'meteor/webapp';
import express from 'express';
import { setupMediaServer } from '../imports/mediaServer.js';
import { setupExportServer } from '../imports/exportServer.js'
import { setupImportServer } from '../imports/importServer.js'

const app = express();
app.use(cors());
app.options('*', cors())
setupMediaServer(app);
setupExportServer(app);
setupImportServer(app);

//WebApp.accessRule('*');
WebApp.connectHandlers.use(app);
